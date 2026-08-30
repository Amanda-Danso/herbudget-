/**
 * settings.html controller: view/update profile, change password.
 */

requireAuth();

async function loadProfile() {
  try {
    const user = await api.get("/api/auth/me");
    document.getElementById("profile-name").value = user.name;
    document.getElementById("profile-email").value = user.email;
  } catch (err) {
    showToast(err.message || "Unable to load profile.", "error");
  }
}

document.getElementById("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("profile-name").value.trim();
  if (!name) {
    showToast("Name cannot be empty.", "error");
    return;
  }

  const btn = document.getElementById("save-profile-btn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Saving...`;

  try {
    await api.put("/api/auth/me", { name });
    showToast("Profile updated successfully.", "success");
    initHeaderUser();
  } catch (err) {
    showToast(err.message || "Unable to update profile.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Changes";
  }
});

document.getElementById("password-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const currentPassword = document.getElementById("current-password").value;
  const newPassword = document.getElementById("new-password").value;

  let valid = true;
  document.getElementById("field-current-password").classList.remove("has-error");
  document.getElementById("field-new-password").classList.remove("has-error");

  if (!currentPassword) {
    document.getElementById("field-current-password").classList.add("has-error");
    valid = false;
  }
  if (!newPassword || newPassword.length < 8) {
    document.getElementById("field-new-password").classList.add("has-error");
    valid = false;
  }
  if (!valid) return;

  const btn = document.getElementById("save-password-btn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Updating...`;

  try {
    await api.post("/api/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    showToast("Password updated successfully.", "success");
    document.getElementById("password-form").reset();
  } catch (err) {
    showToast(err.message || "Unable to update password.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Update Password";
  }
});

loadProfile();
