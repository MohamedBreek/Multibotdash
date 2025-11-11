document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const serverId = urlParams.get("id");
  const serverInfoDiv = document.getElementById("server-info");
  const moduleList = document.getElementById("module-list");
  const moduleTitle = document.getElementById("module-title");
  const serverSettings = document.getElementById("server-settings");

  // Demo modules (replace with backend data as needed)
  const modules = [
    { name: "Utility", icon: "build", enabled: true },
    { name: "Moderation", icon: "gavel", enabled: true },
    { name: "Automod", icon: "security", enabled: true },
    { name: "Welcome & Goodbye", icon: "waving_hand", enabled: false },
    {
      name: "Auto Responder",
      icon: "question_answer",
      enabled: true,
      selected: true,
    },
    { name: "Leveling System", icon: "trending_up", enabled: true },
    { name: "Auto Roles", icon: "group_add", enabled: true },
    { name: "Logs", icon: "history", enabled: true },
    { name: "Colors", icon: "palette", enabled: false },
    { name: "Self-Assignable Roles", icon: "emoji_people", enabled: true },
    { name: "Starboard", icon: "star", enabled: true },
    { name: "Temporary Channels", icon: "add", enabled: true },
    { name: "Temp Link", icon: "link", enabled: true, premium: true },
    { name: "Statistics", icon: "bar_chart", enabled: true, premium: true },
    { name: "Anti-Raid", icon: "shield", enabled: true, premium: true },
    {
      name: "VIP Protection",
      icon: "verified_user",
      enabled: true,
      premium: true,
    },
  ];

  // State for auto responder (always loaded from backend)
  let autoResponderEnabled = true;
  let autoResponses = [];

  let selectedModule = modules.find((m) => m.selected) || modules[0];

  if (!serverId) {
    serverInfoDiv.innerHTML = `<div class='text-red-500'>No server ID provided.</div>`;
    return;
  }

  // Fetch user info to get the list of servers
  try {
    const res = await fetch("/api/user/@me", { credentials: "include" });
    if (!res.ok) throw new Error("Not authenticated");
    const user = await res.json();
    const server = (user.servers || []).find((s) => s.id === serverId);
    if (!server) {
      serverInfoDiv.innerHTML = `<div class='text-red-500'>Server not found or you do not have permission to manage it.</div>`;
      return;
    }
    // Render server info in sidebar
    serverInfoDiv.innerHTML = `
      <div class="flex flex-col items-center justify-center mb-4">
        <img src="${
          server.icon
            ? `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`
            : "https://placehold.co/64x64/1e293b/cbd5e1?text=No+Icon"
        }" alt="Server Icon" class="h-16 w-16 rounded-full mb-2" />
        <h1 class="text-lg font-bold text-white text-center mb-1">${
          server.name
        }</h1>
      </div>
    `;
  } catch (err) {
    serverInfoDiv.innerHTML = `<div class='text-red-500'>Failed to load server info: ${err.message}</div>`;
    return;
  }

  // Render modules in sidebar
  function renderModules() {
    moduleList.innerHTML = "";
    modules.forEach((mod) => {
      const isSelected = mod === selectedModule;
      moduleList.innerHTML += `
        <li>
          <a href="#" class="flex items-center gap-2 px-3 py-2 rounded-lg ${
            isSelected
              ? "bg-blue-700 text-white font-semibold"
              : "hover:bg-gray-800"
          }" data-module="${mod.name}">
            <span class="material-icons align-middle">${mod.icon}</span>
            <span>${mod.name}</span>
            ${
              mod.premium
                ? '<span class="ml-2 text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">PREMIUM</span>'
                : ""
            }
            <span class="ml-auto">${
              mod.enabled
                ? "<span class='text-green-400'>&#10003;</span>"
                : "<span class='text-gray-400'>&#9679;</span>"
            }</span>
          </a>
        </li>
      `;
    });
    // Add click listeners
    moduleList.querySelectorAll("a[data-module]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const mod = modules.find((m) => m.name === el.dataset.module);
        if (mod) {
          selectedModule = mod;
          renderModules();
          renderModuleContent();
        }
      });
    });
  }

  // Render main content area for selected module
  async function renderModuleContent() {
    moduleTitle.textContent = selectedModule.name;
    if (selectedModule.name === "Auto Responder") {
      await loadAutoResponder();
      renderAutoResponder();
    } else {
      serverSettings.innerHTML = `<div class='text-gray-400 text-center'>(Demo) Settings for <b>${selectedModule.name}</b> will appear here.`;
    }
  }

  // Load auto responder config from backend
  async function loadAutoResponder() {
    try {
      const res = await fetch(`/api/user/auto-responder?serverId=${serverId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load auto responder");
      const data = await res.json();
      autoResponderEnabled = data.enabled;
      autoResponses = data.responses;
    } catch (err) {
      autoResponderEnabled = true;
      autoResponses = [];
    }
  }

  // Save auto responder config to backend and notify bot
  async function saveAutoResponderAndNotifyBot() {
    await fetch(`/api/user/auto-responder`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serverId,
        enabled: autoResponderEnabled,
        responses: autoResponses,
      }),
    });
    // Notify bot to reload autoresponses (implement this endpoint in your backend/bot)
    await fetch(`/api/bot/notify-autoresponder-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverId }),
    });
  }

  // Render Auto Responder UI
  function renderAutoResponder() {
    serverSettings.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-semibold">Auto Responder</h3>
        <label class="inline-flex items-center cursor-pointer">
          <input type="checkbox" class="sr-only peer" id="ar-toggle" ${
            autoResponderEnabled ? "checked" : ""
          }>
          <div class="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-green-500 transition-all"></div>
        </label>
      </div>
      <button id="add-response" class="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"><span class="material-icons">add</span> Add Response</button>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="text-gray-400 border-b border-gray-800">
              <th class="py-2">Trigger</th>
              <th class="py-2">Response</th>
              <th class="py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody id="ar-list">
            ${autoResponses
              .map(
                (r, i) => `
              <tr class="border-b border-gray-800">
                <td class="py-2">${r.trigger}</td>
                <td class="py-2">${r.response}</td>
                <td class="py-2 text-center">
                  <button class="edit-btn px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded mr-2" data-idx="${i}"><span class="material-icons text-base">tune</span> Edit</button>
                  <button class="delete-btn px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded" data-idx="${i}"><span class="material-icons text-base">delete</span> Delete</button>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    // Toggle handler
    document
      .getElementById("ar-toggle")
      .addEventListener("change", async (e) => {
        autoResponderEnabled = e.target.checked;
        await saveAutoResponderAndNotifyBot();
        renderAutoResponder();
      });
    // Add response handler
    document
      .getElementById("add-response")
      .addEventListener("click", async () => {
        const trigger = prompt("Enter trigger word/phrase:");
        if (!trigger) return;
        const response = prompt("Enter response:");
        if (!response) return;
        autoResponses.push({ trigger, response });
        await saveAutoResponderAndNotifyBot();
        renderAutoResponder();
      });
    // Edit/Delete handlers
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = btn.dataset.idx;
        const trigger = prompt("Edit trigger:", autoResponses[idx].trigger);
        if (!trigger) return;
        const response = prompt("Edit response:", autoResponses[idx].response);
        if (!response) return;
        autoResponses[idx] = { trigger, response };
        await saveAutoResponderAndNotifyBot();
        renderAutoResponder();
      });
    });
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = btn.dataset.idx;
        if (confirm("Delete this response?")) {
          autoResponses.splice(idx, 1);
          await saveAutoResponderAndNotifyBot();
          renderAutoResponder();
        }
      });
    });
  }

  // Load Material Icons
  if (!document.getElementById("material-icons-link")) {
    const link = document.createElement("link");
    link.id = "material-icons-link";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
    document.head.appendChild(link);
  }

  // Commands showcase (theme demo)
  const cmdGrid = document.getElementById("cmd-grid");
  const cmdFilters = document.getElementById("cmd-filters");
  const commands = [
    { name: "ping", desc: "Check bot latency", cat: "utility" },
    { name: "help", desc: "Show help menu", cat: "utility" },
    { name: "ban", desc: "Ban a user", cat: "moderation" },
    { name: "kick", desc: "Kick a user", cat: "moderation" },
    { name: "meme", desc: "Send a random meme", cat: "fun" },
    { name: "avatar", desc: "Get user avatar", cat: "utility" },
  ];
  function renderCmds(filter = "all") {
    if (!cmdGrid) return;
    cmdGrid.innerHTML = commands
      .filter((c) => filter === "all" || c.cat === filter)
      .map(
        (c) => `
        <div class="mb-card mb-command-card p-5 rounded-xl">
          <div class="flex items-center justify-between mb-1">
            <div class="font-semibold">${c.name}</div>
            <span class="mb-badge">${c.cat}</span>
          </div>
          <p class="text-gray-400 text-sm">${c.desc}</p>
        </div>`
      )
      .join("");
  }
  if (cmdFilters) {
    cmdFilters.querySelectorAll(".mb-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        cmdFilters
          .querySelectorAll(".mb-chip")
          .forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        renderCmds(chip.dataset.cat);
      });
    });
    renderCmds("all");
  }

  renderModules();
  renderModuleContent();
});
