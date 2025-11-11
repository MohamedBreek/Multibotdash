import axios from "axios/dist/node/axios.cjs";
import { URLSearchParams } from "url";
import mongoose from "mongoose";

// MongoDB connection reuse for serverless
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://<username>:<password>@<cluster>/<dbname>?retryWrites=true&w=majority";
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// ✅ Define User schema
const UserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: String,
  discriminator: String,
  avatar: String,
  accessToken: String,
  refreshToken: String,
  icon: String,
  permissions: [String],
  servers: [
    {
      id: String,
      name: String,
      icon: String,
    },
  ],
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default async function handler(req, res) {
  // Ensure DB connection
  await dbConnect();
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "No code provided" });

  const postData = new URLSearchParams();
  postData.append("client_id", process.env.DISCORD_CLIENT_ID);
  postData.append("client_secret", process.env.DISCORD_CLIENT_SECRET);
  postData.append("grant_type", "authorization_code");
  postData.append("code", code);
  postData.append(
    "redirect_uri",
    `${process.env.BASE_URL}/api/auth/discord/redirect`
  );

  try {
    // 1. Exchange code for token
    const tokenRes = await axios.post(
      "https://discord.com/api/v10/oauth2/token",
      postData,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // 2. Fetch Discord user info
    const userRes = await axios.get("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const discordUser = userRes.data;

    // 3. Fetch user's guilds (servers)
    const guildsRes = await axios.get(
      "https://discord.com/api/v10/users/@me/guilds",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    console.log(
      "[DEBUG] Raw guilds from Discord:",
      JSON.stringify(guildsRes.data, null, 2)
    );
    // Filter for MANAGE_GUILD (0x20) permission
    const MANAGE_GUILD = 0x20;
    const moddedServers = (guildsRes.data || [])
      .filter((g) => Number(g.permissions) & MANAGE_GUILD)
      .map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
      }));
    console.log(
      "[DEBUG] Filtered moddedServers:",
      JSON.stringify(moddedServers, null, 2)
    );

    // 4. Save/update user in MongoDB
    let user = await User.findOne({ discordId: discordUser.id });
    if (!user) {
      user = await User.create({
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
        accessToken: access_token,
        refreshToken: refresh_token,
        servers: moddedServers,
      });
      console.log(
        "[DEBUG] Created user with servers:",
        JSON.stringify(user.servers, null, 2)
      );
    } else {
      user.username = discordUser.username;
      user.discriminator = discordUser.discriminator;
      user.avatar = discordUser.avatar;
      user.accessToken = access_token;
      user.refreshToken = refresh_token;
      user.servers = moddedServers;
      await user.save();
      console.log(
        "[DEBUG] Updated user with servers:",
        JSON.stringify(user.servers, null, 2)
      );
    }

    // 5. Set cookies for token and discordId
    res.setHeader("Set-Cookie", [
      `discord_token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Lax`,
      `discord_id=${discordUser.id}; Path=/; HttpOnly; Secure; SameSite=Lax`,
    ]);

    // 6. Redirect to dashboard
    console.log("✅ User saved:", user.username);
    res.redirect("/dashboard.html");
  } catch (err) {
    console.error("OAuth redirect error:", err.response?.data || err.message);
    res.status(400).json({ error: err.response?.data || err.message });
  }
}
