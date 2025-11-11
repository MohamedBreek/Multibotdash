export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { serverId } = req.body || {};
    if (!serverId) return res.status(400).json({ error: "serverId required" });

    // If configured, forward to the bot webhook/HTTP endpoint
    const forwardUrl = process.env.BOT_NOTIFY_URL; // e.g. http://localhost:3001/notify/autoresponder
    const forwardToken = process.env.BOT_NOTIFY_TOKEN; // optional shared secret

    if (forwardUrl) {
      const r = await fetch(forwardUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(forwardToken ? { Authorization: `Bearer ${forwardToken}` } : {}),
        },
        body: JSON.stringify({ serverId }),
      });
      const ok = r.ok;
      if (!ok) {
        const text = await r.text().catch(() => "");
        console.warn("Bot notify forward failed", r.status, text);
      }
      console.log(
        `[notify-autoresponder-update] forwarded for serverId=${serverId}, ok=${ok}`
      );
      return res.status(200).json({ ok: true, forwarded: ok });
    } else {
      console.log(
        `[notify-autoresponder-update] (no forward) serverId=${serverId}`
      );
      return res.status(200).json({ ok: true, forwarded: false });
    }
  } catch (e) {
    console.error("notify-autoresponder-update error", e);
    return res.status(500).json({ error: "Internal error" });
  }
}
