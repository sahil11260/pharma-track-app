document.addEventListener("DOMContentLoaded", () => {
  // ===== API Configuration =====
  // const API_BASE = window.location.port === "5500" ? "http://localhost:8080" : "";
  const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? (window.location.port === "8080" ? "" : "http://localhost:8080")
    : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");

  const DCR_API = `${API_BASE}/api/dcrs`;
  const EXPENSE_API = `${API_BASE}/api/expenses`;
  const TARGET_API = `${API_BASE}/api/targets`;

  function getAuthHeader() {
    const token = localStorage.getItem("kavya_auth_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  async function apiJson(url) {
    try {
      const res = await fetch(url, {
        headers: Object.assign({ "Content-Type": "application/json" }, getAuthHeader())
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      console.error("API Error:", e);
      return [];
    }
  }





  // ===== Data Fetching and Rendering =====
  let allDcrs = [];
  let allExpenses = [];
  let allTargets = [];

  const reportTableBody = document.getElementById("reportTableBody");
  const tableSearch = document.getElementById("tableSearch");
  const totalVisitsEl = document.getElementById("totalVisits");
  const totalExpensesEl = document.getElementById("totalExpenses");
  const salesAchievedEl = document.getElementById("salesAchieved");

  async function fetchAllData() {
    try {
      const [dcrs, expenses, targets] = await Promise.all([
        apiJson(DCR_API),
        apiJson(EXPENSE_API),
        apiJson(TARGET_API)
      ]);

      allDcrs = Array.isArray(dcrs) ? dcrs : [];
      allExpenses = Array.isArray(expenses) ? expenses : [];
      allTargets = Array.isArray(targets) ? targets : [];

      updateSummaryCards();
      updateCharts();
      renderTable(allDcrs);
    } catch (e) {
      console.error("Failed to fetch data:", e);
    }
  }

  function updateSummaryCards() {
    // Total Doctor Visits
    totalVisitsEl.textContent = allDcrs.length;

    // Total Expenses (sum of all approved expenses)
    const totalExpense = allExpenses
      .filter(e => e.status === "APPROVED")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    totalExpensesEl.textContent = `\u20B9${totalExpense.toLocaleString('en-IN')}`;

    // Sales Achieved (sum of sales achievements from targets)
    const totalSales = allTargets
      .reduce((sum, t) => sum + (Number(t.salesAchievement) || 0), 0);
    salesAchievedEl.textContent = `\u20B9${(totalSales / 100000).toFixed(2)} Lakh`;
  }

  function renderTable(data) {
    reportTableBody.innerHTML = data
      .map(
        (r) => `
      <tr>
        <td>${r.visitDate || '-'}</td>
        <td>${r.mrName || '-'}</td>
        <td>${r.doctorName || '-'}</td>
        <td>${r.region || '-'}</td>
        <td>${r.feedback || '-'}</td>
        <td><span class="badge ${r.status === "COMPLETED" ? "bg-success" : "bg-warning text-dark"}">${r.status || 'Pending'}</span></td>
      </tr>`
      )
      .join("") || '<tr><td colspan="6" class="text-center text-muted">No visit records found</td></tr>';
  }

  tableSearch.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allDcrs.filter(
      (r) =>
        (r.mrName || '').toLowerCase().includes(term) ||
        (r.doctorName || '').toLowerCase().includes(term) ||
        (r.region || '').toLowerCase().includes(term)
    );
    renderTable(filtered);
  });

  // ===== Charts =====
  let regionSalesChart = null;
  let expenseChart = null;

  function updateCharts() {
    // Regional Sales Overview - Group by manager/person
    const salesByPerson = {};
    allTargets.forEach(t => {
      const person = t.mrName || 'Unknown';
      if (!salesByPerson[person]) {
        salesByPerson[person] = 0;
      }
      salesByPerson[person] += Number(t.salesAchievement) || 0;
    });

    const salesLabels = Object.keys(salesByPerson).slice(0, 5);
    const salesData = salesLabels.map(label => (salesByPerson[label] / 100000).toFixed(2));

    // Expense Breakdown by category (Only include APPROVED)
    const expenseByCategory = {};
    allExpenses.filter(e => e.status === "APPROVED").forEach(e => {
      const category = e.category || 'Miscellaneous';
      if (!expenseByCategory[category]) {
        expenseByCategory[category] = 0;
      }
      expenseByCategory[category] += Number(e.amount) || 0;
    });

    const expenseLabels = Object.keys(expenseByCategory);
    const expenseData = expenseLabels.map(label => expenseByCategory[label]);

    // Update Regional Sales Chart
    const regionSalesCtx = document.getElementById("regionSalesChart").getContext("2d");
    if (regionSalesChart) {
      regionSalesChart.destroy();
    }
    regionSalesChart = new Chart(regionSalesCtx, {
      type: "bar",
      data: {
        labels: salesLabels.length > 0 ? salesLabels : ["No Data"],
        datasets: [{
          label: "Sales (\u20B9 in Lakhs)",
          data: salesData.length > 0 ? salesData : [0],
          backgroundColor: ["#0d6efd", "#198754", "#ffc107", "#dc3545", "#6f42c1"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });

    // Update Expense Chart
    const expenseCtx = document.getElementById("expenseChart").getContext("2d");
    if (expenseChart) {
      expenseChart.destroy();
    }
    expenseChart = new Chart(expenseCtx, {
      type: "pie",
      data: {
        labels: expenseLabels.length > 0 ? expenseLabels : ["No Data"],
        datasets: [{
          data: expenseData.length > 0 ? expenseData : [1],
          backgroundColor: ["#0d6efd", "#198754", "#ffc107", "#dc3545"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } }
      }
    });
  }

  // ===== Dynamic Report Filtering =====
  const reportTypeDropdown = document.getElementById("reportType");
  const sectionSales = document.getElementById("sectionSalesChart");
  const sectionExpense = document.getElementById("sectionExpenseChart");
  const sectionVisit = document.getElementById("sectionVisitTable");

  if (reportTypeDropdown) {
    reportTypeDropdown.addEventListener("change", function () {
      const selected = this.value;

      // Reset visibility
      sectionSales.style.display = "block";
      sectionExpense.style.display = "block";
      sectionVisit.style.display = "block";

      if (selected === "Doctor Visits") {
        sectionSales.style.display = "none";
        sectionExpense.style.display = "none";
      } else if (selected === "Sales Summary") {
        sectionExpense.style.display = "none";
        sectionVisit.style.display = "none";
        // Also adjust Sales chart to take full width if needed, but here they are cols in a row
      } else if (selected === "Expense Report") {
        sectionSales.style.display = "none";
        sectionVisit.style.display = "none";
      }
    });
  }

  // Initialize
  fetchAllData();
});

