/**
 * categories.html controller: list, add, edit, delete categories.
 */

requireAuth();

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

let editingCategoryId = null;

async function loadCategories() {
  const wrap = document.getElementById("categories-table-wrap");
  wrap.innerHTML = `<div class="loading-text"><span class="spinner spinner-dark"></span> Loading categories...</div>`;

  try {
    const categories = await api.get("/api/categories");

    if (!categories.length) {
      wrap.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏷️</div>
          <h3>No categories yet</h3>
          <p>Create a category to start organizing your transactions.</p>
        </div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Type</th>
              <th># Transactions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${categories.map(renderRow).join("")}
          </tbody>
        </table>
      </div>`;

    document.querySelectorAll("[data-edit-id]").forEach((btn) => {
      btn.addEventListener("click", () => openEditModal(btn.dataset.editId, categories));
    });
    document.querySelectorAll("[data-delete-id]").forEach((btn) => {
      const inUse = btn.dataset.inUse === "true";
      btn.addEventListener("click", () => deleteCategory(btn.dataset.deleteId, inUse));
    });
  } catch (err) {
    wrap.innerHTML = `<p class="text-muted">Unable to load categories. Please try again.</p>`;
    showToast(err.message || "Unable to load categories.", "error");
  }
}

function renderRow(c) {
  const badgeClass = c.type === "income" ? "badge-income" : "badge-expense";
  return `
    <tr>
      <td data-label="Name">${escapeHtml(c.name)}</td>
      <td data-label="Type"><span class="badge ${badgeClass}">${c.type === "income" ? "Income" : "Expense"}</span></td>
      <td data-label="Transactions">${c.transaction_count}</td>
      <td data-label="Actions">
        <button class="icon-btn" data-edit-id="${c.id}" title="Edit">&#9998;</button>
        <button class="icon-btn" data-delete-id="${c.id}" data-in-use="${c.transaction_count > 0}" title="Delete">&#128465;</button>
      </td>
    </tr>`;
}

async function deleteCategory(id, inUse) {
  if (inUse) {
    showToast(
      "This category has transactions attached. Reassign or delete those transactions first.",
      "error"
    );
    return;
  }
  if (!confirmAction("Are you sure you want to delete this category?")) return;
  try {
    await api.delete(`/api/categories/${id}`);
    showToast("Category deleted.", "success");
    loadCategories();
  } catch (err) {
    showToast(err.message || "Unable to delete category.", "error");
  }
}

/* ---------------- Modal ---------------- */
const modalOverlay = document.getElementById("category-modal-overlay");
const modalTitle = document.getElementById("category-modal-title");
const form = document.getElementById("category-form");
const typeToggle = document.getElementById("category-type-toggle");

function setModalType(type) {
  typeToggle.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.type === type));
}
typeToggle.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => setModalType(btn.dataset.type));
});

function openAddModal() {
  editingCategoryId = null;
  modalTitle.textContent = "Add Category";
  form.reset();
  document.getElementById("category-id").value = "";
  document.getElementById("field-category-name").classList.remove("has-error");
  setModalType("expense");
  modalOverlay.classList.add("open");
}

function openEditModal(id, categories) {
  const c = categories.find((x) => x.id === id);
  if (!c) return;
  editingCategoryId = id;
  modalTitle.textContent = "Edit Category";
  document.getElementById("field-category-name").classList.remove("has-error");
  document.getElementById("category-id").value = c.id;
  document.getElementById("category-name").value = c.name;
  setModalType(c.type);
  modalOverlay.classList.add("open");
}

function closeModal() {
  modalOverlay.classList.remove("open");
}

document.getElementById("add-category-btn").addEventListener("click", openAddModal);
document.getElementById("close-category-modal").addEventListener("click", closeModal);
document.getElementById("cancel-category-btn").addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("category-name").value.trim();
  const type = typeToggle.querySelector(".active").dataset.type;

  if (!name) {
    document.getElementById("field-category-name").classList.add("has-error");
    return;
  }
  document.getElementById("field-category-name").classList.remove("has-error");

  const saveBtn = document.getElementById("save-category-btn");
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<span class="spinner"></span> Saving...`;

  try {
    if (editingCategoryId) {
      await api.put(`/api/categories/${editingCategoryId}`, { name, type });
      showToast("Category updated successfully.", "success");
    } else {
      await api.post("/api/categories", { name, type });
      showToast("Category added successfully.", "success");
    }
    closeModal();
    loadCategories();
  } catch (err) {
    showToast(err.message || "Unable to save category.", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
});

loadCategories();
