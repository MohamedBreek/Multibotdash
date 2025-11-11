import mongoose from "mongoose";
import cookie from "cookie";

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

const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: String,
  globalName: String,
  avatarURL: String,
  email: String,
  servers: [mongoose.Schema.Types.Mixed],
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default async function handler(req, res) {
  await dbConnect();
  // Get discord_token from cookie
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.discord_token;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // You may want to decode the token to get the user id, or store the user id in the session/cookie
  // For now, let's assume you store discordId in a cookie called discord_id (set this in your login handler)
  const discordId = cookies.discord_id;
  if (!discordId) {
    return res.status(401).json({ error: "No user id in cookie" });
  }

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
}
