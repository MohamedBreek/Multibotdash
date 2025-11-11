const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: String,
  globalName: String,
  avatarURL: String,
  email: String,
  servers: [String],
});

module.exports = mongoose.model("User", userSchema);
