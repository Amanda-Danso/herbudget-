/**
 * dashboard.html controller: loads summary stats, charts, and recent
 * transactions from the real backend API. No mock data.
 */

requireAuth();

const CHART_COLORS = [
  "#b5578a", "#7c6fd6", "#2f9e6e", "#e0a458",
  "#5698c9", "#d1495b", "#8e7fd1", "#61a67e",
];

let categoryChart, incomeExpenseChart, monthlyChart;

async function loadSummary() {
  try {
    const summary = await api.get("/api/dashboard/summary");
    document.getElementById("stat-balance").textContent = formatCurrency(summary.balance);
    document.getElementById("stat-income").textContent = formatCurrency(summary.total_income);
    document.getElementById("stat-expense").textContent = formatCurrency(summary.total_expenses);
    return summary;
  } catch (err) {
    showToast(err.message || "Unable to load dashboard summary.", "error");
    return null;
  }
}

function renderEmptyChart(canvasId, message) {
  const canvas = document.getElementById(canvasId);
  const wrap = canvas.parentElement;
  wrap.innerHTML = `<div class="empty-state" style="padding: 24px 10px;">
      <div class="empty-icon">📉</div>
      <p class="mb-0">${message}</p>
    </div>`;
}

async function loadCategoryChart() {
  try {
    const data = await api.get("/api/dashboard/expenses-by-category");
    if (!data.length) {
      renderEmptyChart("category-chart", "No expenses yet to break down by category.");
      return;
    }
    const ctx = document.getElementById("category-chart").getContext("2d");
    categoryChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.map((d) => d.category),
        datasets: [
          {
            data: data.map((d) => Number(d.amount)),
            backgroundColor: data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
      },
    });
  } catch (err) {
    showToast(err.message || "Unable to load category breakdown.", "error");
  }
}

async function loadIncomeExpenseChart(summary) {
  if (!summary || (Number(summary.total_income) === 0 && Number(summary.total_expenses) === 0)) {
    renderEmptyChart("income-expense-chart", "Add a transaction to see income vs. expenses.");
    return;
  }
  const ctx = document.getElementById("income-expense-chart").getContext("2d");
  incomeExpenseChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["This period"],
      datasets: [
        {
          label: "Income",
          data: [Number(summary.total_income)],
          backgroundColor: "#2f9e6e",
          borderRadius: 6,
        },
        {
          label: "Expenses",
          data: [Number(summary.total_expenses)],
          backgroundColor: "#d1495b",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

async function loadMonthlyChart() {
  try {
    const data = await api.get("/api/dashboard/monthly-summary");
    if (!data.length) {
      renderEmptyChart("monthly-chart", "Your monthly trend will appear here once you add transactions.");
      return;
    }
    const ctx = document.getElementById("monthly-chart").getContext("2d");
    monthlyChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((d) => d.month),
        datasets: [
          {
            label: "Income",
            data: data.map((d) => Number(d.income)),
            borderColor: "#2f9e6e",
            backgroundColor: "rgba(47, 158, 110, 0.12)",
            tension: 0.3,
            fill: true,
          },
          {
            label: "Expenses",
            data: data.map((d) => Number(d.expenses)),
            borderColor: "#d1495b",
            backgroundColor: "rgba(209, 73, 91, 0.12)",
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
        scales: { y: { beginAtZero: true } },
      },
    });
  } catch (err) {
    showToast(err.message || "Unable to load monthly trend.", "error");
  }
}

async function loadRecentTransactions() {
  const wrap = document.getElementById("recent-transactions-wrap");
  try {
    const transactions = await api.get("/api/dashboard/recent-transactions");
    if (!transactions.length) {
      wrap.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🌱</div>
          <h3>No transactions yet</h3>
          <p>Start tracking your money by adding your first transaction.</p>
          <a href="transactions.html" class="btn btn-primary">+ Add Transaction</a>
        </div>`;
      return;
    }
    wrap.innerHTML = `<div class="recent-list">${transactions
      .map(
        (t) => `
        <div class="recent-row">
          <div>
            <div class="recent-desc">${escapeHtml(t.description || t.category || "Transaction")}</div>
            <div class="recent-meta">${escapeHtml(t.category || "")} &middot; ${formatDate(t.transaction_date)}</div>
          </div>
          <div class="${t.type === "income" ? "amount-income" : "amount-expense"}">
            ${t.type === "income" ? "+" : "-"}${formatCurrency(t.amount)}
          </div>
        </div>`
      )
      .join("")}</div>`;
  } catch (err) {
    wrap.innerHTML = `<p class="text-muted">Unable to load recent transactions.</p>`;
    showToast(err.message || "Unable to load recent transactions.", "error");
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

(async function initDashboard() {
  const summary = await loadSummary();
  await Promise.all([
    loadCategoryChart(),
    loadIncomeExpenseChart(summary),
    loadMonthlyChart(),
    loadRecentTransactions(),
  ]);
})();
