require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const axios = require("axios");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const connectDB = require("./database/db");
const User = require("./models/user");

// ===============================
// MongoDB Connection
// ===============================

// ===============================
// User Schema
// ===============================

// get parameters from the env
const PORT = process.env.PORT || 3001;
const Multi_bot_server = "1066829663386742785";

const path = require("path");
const { json } = require("stream/consumers");
const app = express();

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? true // Allow all origins in production
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

app.use(cookieParser());

// Helper function to get the current domain
function getCurrentDomain(req) {
  const protocol =
    req.headers["x-forwarded-proto"] ||
    (req.connection.encrypted ? "https" : "http");
  const host = req.headers.host;
  return `${protocol}://${host}`;
}

// API endpoint to get OAuth URL
app.get("/api/auth/discord/url", (req, res) => {
  const currentDomain = getCurrentDomain(req);
  const redirectUri = `${currentDomain}/api/auth/discord/redirect`;

  const oauthUrl = `https://discord.com/oauth2/authorize?client_id=1068620487082647694&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=identify+guilds.join+guilds`;

  res.json({ oauthUrl });
});

// login with discord
app.get("/api/auth/discord/redirect", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send({ error: "Missing code" });
  }

  try {
  const postData = new URLSearchParams();
  // Use environment variables for client id/secret. Replace the placeholders
  // or set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in your environment.
  postData.append("client_id", process.env.DISCORD_CLIENT_ID || "1068620487082647694");
  postData.append("client_secret", process.env.DISCORD_CLIENT_SECRET || "<REPLACE_WITH_DISCORD_CLIENT_SECRET>");
    postData.append("grant_type", "authorization_code");
    postData.append("code", code.toString().trim());

    const currentDomain = getCurrentDomain(req);
    const redirectUri = `${currentDomain}/api/auth/discord/redirect`;
    postData.append("redirect_uri", redirectUri);

    const tokenEndpoint = "https://discord.com/api/v10/oauth2/token";

    const response = await axios.post(tokenEndpoint, postData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const { access_token } = response.data;

    // Fetch user and guilds simultaneously
    const [userResponse, guildsResponse] = await Promise.all([
      axios.get("https://discord.com/api/v8/users/@me", {
        headers: { Authorization: `Bearer ${access_token}` },
      }),
      axios.get("https://discord.com/api/v8/users/@me/guilds", {
        headers: { Authorization: `Bearer ${access_token}` },
      }),
    ]);

    // Filter guilds where user has MANAGE_GUILD (0x20) permission
    const MANAGE_GUILD = 0x20;
    const moddedServers = (guildsResponse.data || [])
      .filter((g) => g.permissions & MANAGE_GUILD)
      .map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
      }));

    await User.findOneAndUpdate(
      { discordId: userResponse.data.id },
      {
        username: userResponse.data.username,
        globalName: userResponse.data.global_name,
        avatarURL: `https://cdn.discordapp.com/avatars/${userResponse.data.id}/${userResponse.data.avatar}.png?size=256`,
        email: userResponse.data.email,
        servers: moddedServers,
      },
      { upsert: true, new: true }
    );

    res.redirect(`/dashboard.html`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(400).send({ error: "Something went wrong" });
  }
});

// ===============================
// Discord OAuth2
// ===============================
const DISCORD_API = "https://discord.com/api/v10";
const BOT_START_TIME = new Date();
const BOT_COMMANDS = ["ping", "help", "stats"]; // example

// Login redirect
app.get("/api/auth/discord", (req, res) => {
  const redirectUri = encodeURIComponent(
    `${process.env.BASE_URL}/api/auth/discord/redirect`
  );
  res.redirect(
    `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20guilds`
  );
});

// OAuth2 callback
app.get("/api/auth/discord/redirect", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    // Exchange code for token
    const params = new URLSearchParams();
    params.append("client_id", process.env.DISCORD_CLIENT_ID);
    params.append("client_secret", process.env.DISCORD_CLIENT_SECRET);
    params.append(
      "redirect_uri",
      `${process.env.BASE_URL}/api/auth/discord/redirect`
    );
    params.append("grant_type", "authorization_code");
    params.append("code", code);

    // Get user info
    const userRes = await axios.get(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const discordUser = userRes.data;

    // Save/update user in MongoDB
    const user = await User.findOneAndUpdate(
      { discordId: discordUser.id },
      {
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatarURL: discordUser.avatar,
      },
      { upsert: true, new: true }
    );

    // Save to session
    req.session.discord = {
      token: access_token,
      user: user,
    };

    res.redirect("http://localhost:3001/dashboard.html"); // frontend dashboard
  } catch (err) {
    console.error("OAuth2 Error:", err.response?.data || err.message);
    res.status(500).json({ error: "OAuth2 login failed" });
  }
});

// Get current user
app.get("/api/auth/me", (req, res) => {
  if (!req.session.discord) {
    return res.status(401).json({ error: "Not logged in" });
  }
  res.json(req.session.discord.user);
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// endpoint
app.get("/api/user/@me", async (req, res) => {
  // Support both session and ?id= param for dashboard compatibility
  let discordId = null;
  if (
    req.session.discord &&
    req.session.discord.user &&
    req.session.discord.user.discordId
  ) {
    discordId = req.session.discord.user.discordId;
  } else if (req.query.id) {
    discordId = req.query.id;
  }
  if (!discordId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const user = await User.findOne({ discordId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      id: user.discordId,
      username: user.username,
      globalName: user.globalName,
      avatarURL: user.avatarURL,
      email: user.email,
      servers: user.servers || [],
    });
  } catch (err) {
    console.error("/api/user/@me error:", err.message);
    res.status(500).json({ error: "Failed to fetch user info" });
  }
});

// ===============================
// Shared Servers
// ===============================
app.get("/api/shared-servers", async (req, res) => {
  if (!req.session.discord)
    return res.status(401).json({ error: "Not authenticated" });

  try {
    const userGuildsRes = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${req.session.discord.token}` },
    });
    const userGuilds = userGuildsRes.data;

    const botGuildsRes = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
    });
    const botGuilds = botGuildsRes.data.map((g) => g.id);

    const MANAGE_GUILD = 0x20;
    const shared = userGuilds.filter(
      (g) => botGuilds.includes(g.id) && g.permissions & MANAGE_GUILD
    );

    res.json(shared);
  } catch (err) {
    console.error("Shared servers error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch shared guilds" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.use("/", express.static("public"));

// Connect to MongoDB, then start the server
connectDB()
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Running on Port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
