// api/auth/discord.js - Discord OAuth Token Exchange
export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Handle both GET (OAuth redirect) and POST (token exchange)
  if (req.method === "GET") {
    // OAuth redirect - extract code and state from query params
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Authorization code required" });
    }

    // For GET requests, we'll redirect to the dashboard with the code
    // The dashboard will then make a POST request to exchange the code
    const dashboardUrl = `https://multibotdash.vercel.app/dashboard.html?code=${code}&state=${
      state || ""
    }`;
    console.log("wow2");
    res.redirect(307, dashboardUrl);
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, redirect_uri } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code required" });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();

    // Get user info with the access token
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user info");
    }

    const userData = await userResponse.json();

    // Return user data and access token
    res.status(200).json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      user: userData,
    });
  } catch (error) {
    console.error("Discord OAuth error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}
