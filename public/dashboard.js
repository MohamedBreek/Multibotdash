document.addEventListener("DOMContentLoaded", async () => {
  // Only use session/cookie authentication, ignore id param
  const userInfoSection = document.getElementById("user-info-section");
  const serversList = document.getElementById("servers");
  const totalServersEl = document.getElementById("total-servers");
  const activeCommandsEl = document.getElementById("active-commands");
  const loadingIndicator = document.getElementById("loading-indicator");
  const logoutBtn = document.getElementById("logout-btn");

  // --- Logout button ---
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  });

  loadingIndicator.classList.remove("hidden");

  try {
    // Always use session-based fetch
    const res = await fetch(`/api/user/@me`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Not authenticated");
    const user = await res.json();

    // --- Populate user info ---
    // Centered user info with username and id
    userInfoSection.innerHTML = `
      <div class="flex flex-col items-center justify-center space-y-2">
        <img src="${
          user.avatarURL ||
          "https://avatars.githubusercontent.com/u/1342004?s=200&v=4"
        }" alt="Avatar" class="h-24 w-24 rounded-full shadow-lg mb-2" />
        <h3 class="text-2xl font-bold text-white text-center">${
          user.username || "Unknown"
        }</h3>
        <p class="text-gray-400 text-center text-sm">ID: ${user.id || "-"}</p>
        <p class="text-gray-400 text-center">${user.email || ""}</p>
      </div>
    `;
    loadingIndicator.classList.add("hidden");
    userInfoSection.classList.remove("hidden");

    // --- Populate dashboard stats ---
    totalServersEl.textContent = user.servers ? user.servers.length : 0;
    activeCommandsEl.textContent = 29;

    // --- Populate servers ---
    const noServersMessage = document.getElementById("no-servers-message");
    serversList.innerHTML = "";
    if (user.servers && user.servers.length > 0) {
      serversList.style.display = "grid";
      noServersMessage.classList.add("hidden");
      user.servers.forEach((server) => {
        const iconURL = server.icon
          ? `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`
          : "https://placehold.co/64x64/1e293b/cbd5e1?text=No+Icon";

        let card = document.createElement("div");
        card.className =
          "mb-card p-6 rounded-2xl shadow-2xl text-center group hover:transform hover:scale-105 transition-all duration-500";

        card.innerHTML = `
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <img src="${iconURL}" alt="Server Icon" class="h-10 w-10 rounded-full" />
          </div>
          <h3 class="text-lg font-bold text-white mb-2">${
            server.name || server.id
          }</h3>
          <p class="text-gray-400 text-sm mb-4">ID: ${server.id}</p>
            <button class="manage-server-btn w-full mb-btn text-white py-2 px-4 rounded-xl text-sm font-semibold" data-server-id="${
              server.id
            }">
            Manage
          </button>
        `;

        serversList.appendChild(card);
      });
      // Add click event listeners to all manage buttons
      document.querySelectorAll(".manage-server-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          alert("Coming soon! Server management will be available here.");
        });
      });
    } else {
      serversList.style.display = "none";
      noServersMessage.classList.remove("hidden");
    }
  } catch (err) {
    loadingIndicator.classList.add("hidden");
    userInfoSection.innerHTML = `<div class='text-red-500'>Failed to load user info: ${err.message}</div>`;
    userInfoSection.classList.remove("hidden");
  }
});
