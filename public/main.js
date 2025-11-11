// main.js - Add interactivity for MultiBot landing page

// Login with Discord button handler
document.addEventListener("DOMContentLoaded", function () {
  const loginBtn = document.getElementById("discord-login");
  if (loginBtn) {
    loginBtn.addEventListener("click", async function () {
      try {
        // Get dynamic OAuth URL from server
        const response = await fetch("/api/auth/discord/url");
        const data = await response.json();
        window.location.href = data.oauthUrl;
      } catch (error) {
        console.error("Error getting OAuth URL:", error);
        // Fallback to localhost if API fails
        window.location.href =
          "https://discord.com/oauth2/authorize?client_id=1068620487082647694&response_type=code&redirect_uri=https%3A%2F%2Fmultibotdash.vercel.app%2Fapi%2Fauth%2Fdiscord%2Fredirect&scope=identify+guilds+guilds.join";
      }
    });
  }

  // Manual refresh button
  const refreshBtn = document.getElementById("refresh-stats");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      botStats.updateStats();
    });
  }
});
