/**
 * Shared UI helpers: toast notifications, sidebar/hamburger toggle,
 * and a basic confirm-dialog wrapper. Included on every authenticated page.
 */

function ensureToastContainer() {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = "info", duration = 3500) {
  const container = ensureToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.2s ease";
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) sidebar.classList.toggle("open");
}

function initHeaderUser() {
  const el = document.getElementById("header-user-name");
  if (!el) return;
  api
    .get("/api/auth/me")
    .then((user) => {
      el.textContent = user.name;
    })
    .catch(() => {
      /* handled by 401 redirect in api.js */
    });
}

function initLogoutButton() {
  const btn = document.getElementById("logout-btn");
  if (btn) {
    btn.addEventListener("click", () => logout());
  }
}

/**
 * Simple confirm wrapper. In the MVP this uses window.confirm for
 * reliability; kept as its own function so it's easy to swap for a
 * custom modal later without touching call sites.
 */
function confirmAction(message) {
  return window.confirm(message);
}

/**
 * Marks a page's active sidebar nav link based on the current filename.
 */
function highlightActiveNav() {
  const page = window.location.pathname.split("/").pop();
  document.querySelectorAll(".sidebar nav a").forEach((link) => {
    if (link.getAttribute("href") === page) {
      link.classList.add("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initHeaderUser();
  initLogoutButton();
  highlightActiveNav();
  const hamburger = document.getElementById("hamburger-btn");
  if (hamburger) hamburger.addEventListener("click", toggleSidebar);
});
