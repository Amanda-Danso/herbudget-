/**
 * transactions.html controller: list with filters + pagination, and
 * a modal for create/edit. All filtering happens against the backend API.
 */

requireAuth();

let currentPage = 1;
const PAGE_LIMIT = 20;
let allCategories = [];
let editingTransactionId = null;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------- Filters ---------------- */
function getActiveFilters() {
  const type = document.getElementById("filter-type").value;
  const categoryId = document.getElementById("filter-category").value;
  const startDate = document.getElementById("filter-start-date").value;
  const endDate = document.getElementById("filter-end-date").value;
  const search = document.getElementById("filter-search").value.trim();

  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (categoryId) params.set("category_id", categoryId);
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  if (search) params.set("search", search);
  params.set("page", currentPage);
  params.set("limit", PAGE_LIMIT);
  return params;
}

document.getElementById("filter-type").addEventListener("change", () => { currentPage = 1; loadTransactions(); });
document.getElementById("filter-category").addEventListener("change", () => { currentPage = 1; loadTransactions(); });
document.getElementById("filter-start-date").addEventListener("change", () => { currentPage = 1; loadTransactions(); });
document.getElementById("filter-end-date").addEventListener("change", () => { currentPage = 1; loadTransactions(); });

let searchDebounce;
document.getElementById("filter-search").addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    currentPage = 1;
    loadTransactions();
  }, 350);
});

document.getElementById("clear-filters-btn").addEventListener("click", () => {
  document.getElementById("filter-type").value = "";
  document.getElementById("filter-category").value = "";
  document.getElementById("filter-start-date").value = "";
  document.getElementById("filter-end-date").value = "";
  document.getElementById("filter-search").value = "";
  currentPage = 1;
  loadTransactions();
});

/* ---------------- Load categories (for filter + form dropdowns) ---------------- */
async function loadCategories() {
  try {
    allCategories = await api.get("/api/categories");

    const filterSelect = document.getElementById("filter-category");
    filterSelect.innerHTML =
      `<option value="">All categories</option>` +
      allCategories
        .map((c) => `<option value="${c.id}">${escapeHtml(c.name)} (${c.type})</option>`)
        .join("");
  } catch (err) {
    showToast(err.message || "Unable to load categories.", "error");
  }
}

function populateCategoryDropdownForType(type) {
  const select = document.getElementById("category");
  const filtered = allCategories.filter((c) => c.type === type);
  select.innerHTML = filtered
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join("");
}

/* ---------------- Table rendering ---------------- */
async function loadTransactions() {
  const wrap = document.getElementById("transactions-table-wrap");
  wrap.innerHTML = `<div class="loading-text"><span class="spinner spinner-dark"></span> Loading transactions...</div>`;

  try {
    const params = getActiveFilters();
    const data = await api.get(`/api/transactions?${params.toString()}`);

    if (!data.items.length) {
      const hasFilters = [...params.keys()].some((k) => !["page", "limit"].includes(k));
      wrap.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🌱</div>
          <h3>No transactions ${hasFilters ? "match these filters" : "yet"}</h3>
          <p>${hasFilters ? "Try adjusting or clearing your filters." : "Start tracking your money by adding your first transaction."}</p>
          ${hasFilters ? "" : `<button class="btn btn-primary" onclick="document.getElementById('add-transaction-btn').click()">+ Add Transaction</button>`}
        </div>`;
      document.getElementById("pagination-wrap").style.display = "none";
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(renderRow).join("")}
          </tbody>
        </table>
      </div>`;

    document.querySelectorAll("[data-edit-id]").forEach((btn) => {
      btn.addEventListener("click", () => openEditModal(btn.dataset.editId, data.items));
    });
    document.querySelectorAll("[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", () => deleteTransaction(btn.dataset.deleteId));
    });

    renderPagination(data);
  } catch (err) {
    wrap.innerHTML = `<p class="text-muted">Unable to load transactions. Please try again.</p>`;
    showToast(err.message || "Unable to load transactions.", "error");
  }
}

function renderRow(t) {
  const sign = t.type === "income" ? "+" : "-";
  const amountClass = t.type === "income" ? "amount-income" : "amount-expense";
  const badgeClass = t.type === "income" ? "badge-income" : "badge-expense";
  return `
    <tr>
      <td data-label="Date">${formatDate(t.transaction_date)}</td>
      <td data-label="Description">${escapeHtml(t.description || "-")}</td>
      <td data-label="Category">${escapeHtml(t.category || "-")}</td>
      <td data-label="Type"><span class="badge ${badgeClass}">${t.type === "income" ? "Income" : "Expense"}</span></td>
      <td data-label="Amount" class="${amountClass}">${sign}${formatCurrency(t.amount)}</td>
      <td data-label="Actions">
        <button class="icon-btn" data-edit-id="${t.id}" title="Edit">&#9998;</button>
        <button class="icon-btn" data-delete-id="${t.id}" title="Delete">&#128465;</button>
      </td>
    </tr>`;
}

function renderPagination(data) {
  const wrap = document.getElementById("pagination-wrap");
  if (data.total_pages <= 1) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "flex";
  document.getElementById("pagination-label").textContent = `Page ${data.page} of ${data.total_pages} (${data.total} total)`;
  document.getElementById("prev-page-btn").disabled = data.page <= 1;
  document.getElementById("next-page-btn").disabled = data.page >= data.total_pages;
}

document.getElementById("prev-page-btn").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    loadTransactions();
  }
});
document.getElementById("next-page-btn").addEventListener("click", () => {
  currentPage += 1;
  loadTransactions();
});

/* ---------------- Delete ---------------- */
async function deleteTransaction(id) {
  if (!confirmAction("Are you sure you want to delete this transaction?")) return;
  try {
    await api.delete(`/api/transactions/${id}`);
    showToast("Transaction deleted.", "success");
    loadTransactions();
  } catch (err) {
    showToast(err.message || "Unable to delete transaction.", "error");
  }
}

/* ---------------- Modal: add / edit ---------------- */
const modalOverlay = document.getElementById("transaction-modal-overlay");
const modalTitle = document.getElementById("transaction-modal-title");
const form = document.getElementById("transaction-form");
const typeToggle = document.getElementById("type-toggle");

function setModalType(type) {
  typeToggle.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.type === type));
  populateCategoryDropdownForType(type);
}

typeToggle.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => setModalType(btn.dataset.type));
});

function openAddModal() {
  editingTransactionId = null;
  modalTitle.textContent = "Add Transaction";
  form.reset();
  document.getElementById("transaction-id").value = "";
  document.getElementById("transaction-date").value = new Date().toISOString().slice(0, 10);
  clearFieldErrors();
  setModalType("expense");
  modalOverlay.classList.add("open");
}

function openEditModal(id, items) {
  const t = items.find((i) => i.id === id);
  if (!t) return;
  editingTransactionId = id;
  modalTitle.textContent = "Edit Transaction";
  clearFieldErrors();
  setModalType(t.type);
  document.getElementById("transaction-id").value = t.id;
  document.getElementById("amount").value = t.amount;
  document.getElementById("description").value = t.description || "";
  document.getElementById("transaction-date").value = t.transaction_date;
  // set category after dropdown populated for the correct type
  document.getElementById("category").value = t.category_id;
  modalOverlay.classList.add("open");
}

function closeModal() {
  modalOverlay.classList.remove("open");
}

document.getElementById("add-transaction-btn").addEventListener("click", openAddModal);
document.getElementById("close-transaction-modal").addEventListener("click", closeModal);
document.getElementById("cancel-transaction-btn").addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

function clearFieldErrors() {
  ["field-amount", "field-category", "field-date"].forEach((id) => {
    document.getElementById(id).classList.remove("has-error");
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const type = typeToggle.querySelector(".active").dataset.type;
  const amount = document.getElementById("amount").value;
  const categoryId = document.getElementById("category").value;
  const description = document.getElementById("description").value.trim();
  const date = document.getElementById("transaction-date").value;

  let valid = true;
  clearFieldErrors();

  if (!amount || Number(amount) <= 0) {
    document.getElementById("field-amount").classList.add("has-error");
    valid = false;
  }
  if (!categoryId) {
    document.getElementById("field-category").classList.add("has-error");
    valid = false;
  }
  if (!date) {
    document.getElementById("field-date").classList.add("has-error");
    valid = false;
  }
  if (!valid) return;

  const payload = {
    type,
    amount: Number(amount),
    category_id: categoryId,
    description: description || null,
    transaction_date: date,
  };

  const saveBtn = document.getElementById("save-transaction-btn");
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<span class="spinner"></span> Saving...`;

  try {
    if (editingTransactionId) {
      await api.put(`/api/transactions/${editingTransactionId}`, payload);
      showToast("Transaction updated successfully.", "success");
    } else {
      await api.post("/api/transactions", payload);
      showToast("Transaction added successfully.", "success");
    }
    closeModal();
    loadTransactions();
  } catch (err) {
    showToast(err.message || "Unable to save transaction.", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
});

/* ---------------- Init ---------------- */
(async function init() {
  await loadCategories();
  populateCategoryDropdownForType("expense");
  await loadTransactions();
})();
