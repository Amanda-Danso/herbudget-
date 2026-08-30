/**
 * Handles login.html and register.html forms.
 * Also redirects already-authenticated users away from these pages.
 */

redirectIfLoggedIn();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(fieldId, hasError) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.toggle("has-error", hasError);
}

function setSubmitting(button, isSubmitting, idleLabel) {
  button.disabled = isSubmitting;
  button.innerHTML = isSubmitting
    ? `<span class="spinner"></span> Please wait...`
    : idleLabel;
}

/* ---------------- Login ---------------- */
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    let valid = true;
    if (!EMAIL_PATTERN.test(email)) {
      setFieldError("field-email", true);
      valid = false;
    } else {
      setFieldError("field-email", false);
    }
    if (!password) {
      setFieldError("field-password", true);
      valid = false;
    } else {
      setFieldError("field-password", false);
    }
    if (!valid) return;

    const submitBtn = document.getElementById("submit-btn");
    setSubmitting(submitBtn, true, "Login");

    try {
      const data = await api.post("/api/auth/login", { email, password });
      setToken(data.access_token);
      showToast("Welcome back!", "success");
      window.location.href = "dashboard.html";
    } catch (err) {
      showToast(err.message || "Unable to log in.", "error");
      setSubmitting(submitBtn, false, "Login");
    }
  });
}

/* ---------------- Register ---------------- */
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    let valid = true;

    if (!name) {
      setFieldError("field-name", true);
      valid = false;
    } else {
      setFieldError("field-name", false);
    }

    if (!EMAIL_PATTERN.test(email)) {
      setFieldError("field-email", true);
      valid = false;
    } else {
      setFieldError("field-email", false);
    }

    if (!password || password.length < 8) {
      setFieldError("field-password", true);
      valid = false;
    } else {
      setFieldError("field-password", false);
    }

    if (password !== confirmPassword) {
      setFieldError("field-confirm-password", true);
      valid = false;
    } else {
      setFieldError("field-confirm-password", false);
    }

    if (!valid) return;

    const submitBtn = document.getElementById("submit-btn");
    setSubmitting(submitBtn, true, "Create Account");

    try {
      await api.post("/api/auth/register", { name, email, password });
      const loginData = await api.post("/api/auth/login", { email, password });
      setToken(loginData.access_token);
      showToast("Account created! Welcome to HerBudget.", "success");
      window.location.href = "dashboard.html";
    } catch (err) {
      showToast(err.message || "Unable to create account.", "error");
      setSubmitting(submitBtn, false, "Create Account");
    }
  });
}
