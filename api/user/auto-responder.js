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
  autoResponder: {
    enabled: { type: Boolean, default: true },
    responses: [
      {
        trigger: String,
        response: String,
      },
    ],
  },
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default async function handler(req, res) {
  await dbConnect();
  const cookies = cookie.parse(req.headers.cookie || "");
  const discordId = cookies.discord_id;
  if (!discordId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.method === "GET") {
    // Get auto responder config for this user's server
    const { serverId } = req.query;
    if (!serverId) return res.status(400).json({ error: "No serverId" });
    const user = await User.findOne({ discordId });
    if (!user) return res.status(404).json({ error: "User not found" });
    const server = (user.servers || []).find((s) => s.id === serverId);
    if (!server) return res.status(404).json({ error: "Server not found" });
    res.json({
      enabled: user.autoResponder?.enabled ?? true,
      responses: user.autoResponder?.responses || [],
    });
  } else if (req.method === "POST") {
    // Update auto responder config
    const { serverId, enabled, responses } = req.body;
    if (!serverId) return res.status(400).json({ error: "No serverId" });
    const user = await User.findOne({ discordId });
    if (!user) return res.status(404).json({ error: "User not found" });
    const server = (user.servers || []).find((s) => s.id === serverId);
    if (!server) return res.status(404).json({ error: "Server not found" });
    user.autoResponder = { enabled, responses };
    await user.save();
    // TODO: Notify bot process to reload auto responder for this server
    res.json({ success: true });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
