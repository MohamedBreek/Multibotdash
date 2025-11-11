(function () {
  const KEY = "mb-theme";
  const prefersLight =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches;
  const saved = localStorage.getItem(KEY);
  const theme = saved || (prefersLight ? "light" : "dark");
  if (theme === "light")
    document.documentElement.setAttribute("data-theme", "light");

  function applyLabel(el) {
    const isLight =
      document.documentElement.getAttribute("data-theme") === "light";
    el.textContent = isLight ? "Light" : "Dark";
  }

  function toggleTheme() {
    const isLight =
      document.documentElement.getAttribute("data-theme") === "light";
    if (isLight) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem(KEY, "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem(KEY, "light");
    }
    document.querySelectorAll('[data-role="theme-label"]').forEach(applyLabel);
  }

  window.MBTheme = { toggle: toggleTheme };

  // Initialize labels if toggle is present
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-role="theme-label"]').forEach(applyLabel);
  });
})();
