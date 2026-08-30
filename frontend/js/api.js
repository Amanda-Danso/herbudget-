/**
 * Centralized API helper for HerBudget.
 * Wraps the Fetch API, automatically attaching the JWT, parsing JSON,
 * and handling errors (including 401 redirects to login).
 */

const API_BASE_URL = "https://herbudget.onrender.com";

function getToken() {
  return localStorage.getItem("herbudget_token");
}

function setToken(token) {
  localStorage.setItem("herbudget_token", token);
}

function clearToken() {
  localStorage.removeItem("herbudget_token");
}

function isLoggedIn() {
  return !!getToken();
}

function logout() {
  clearToken();
  window.location.href = "login.html";
}

/**
 * Core request function used by all api.* helpers below.
 */
async function request(method, path, body, isFormEncoded = false) {
  const headers = {};
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let requestBody;
  if (body !== undefined && body !== null) {
    if (isFormEncoded) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      requestBody = body;
    } else {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: requestBody,
    });
  } catch (networkError) {
    throw new Error(
      "Unable to reach the server. Please check your connection and try again."
    );
  }

  if (response.status === 401) {
    clearToken();
    if (!window.location.pathname.endsWith("login.html") &&
        !window.location.pathname.endsWith("register.html") &&
        !window.location.pathname.endsWith("index.html") &&
        window.location.pathname !== "/") {
      window.location.href = "login.html";
    }
    throw new Error("Your session has expired. Please log in again.");
  }

  if (response.status === 204) {
    return null;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      (data && (data.detail || data.message)) ||
      `Something went wrong (status ${response.status}).`;
    const error = new Error(
      typeof message === "string" ? message : "Something went wrong. Please try again."
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  delete: (path) => request("DELETE", path),
};

/**
 * Reusable currency formatter. Always use this instead of formatting
 * currency manually so the whole app stays consistent.
 */
function formatCurrency(amount) {
  const value = Number(amount);
  if (Number.isNaN(value)) return "GH₵0.00";
  const formatted = Math.abs(value).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "-" : ""}GH₵${formatted}`;
}

function formatDate(dateString) {
  const d = new Date(dateString + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}

function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = "dashboard.html";
  }
}
