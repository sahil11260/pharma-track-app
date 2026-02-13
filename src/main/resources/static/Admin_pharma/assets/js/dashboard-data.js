document.addEventListener("DOMContentLoaded", () => {
  // ===== API Configuration =====
  // const API_BASE = window.location.port === "5500" ? "http://localhost:8080" : "";
  const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? (window.location.port === "8080" ? "" : "http://localhost:8080")
    : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");

  const USERS_API = `${API_BASE}/api/users`;
  const DOCTORS_API = `${API_BASE}/api/doctors`;
  const TARGETS_API = `${API_BASE}/api/targets`;
  const DCR_API = `${API_BASE}/api/dcrs`;
  const EXPENSE_API = `${API_BASE}/api/expenses`;

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

  // ===== Data Storage =====
  let allUsers = [];
  let allDoctors = [];
  let allTargets = [];
  let allDcrs = [];
  let allExpenses = [];

  // Load from localStorage if present for faster initial render
  const savedAdminDash = localStorage.getItem("admin_dashboard_cache");
  if (savedAdminDash) {
    try {
      const cache = JSON.parse(savedAdminDash);
      allUsers = cache.users || [];
      allDoctors = cache.doctors || [];
      allTargets = cache.targets || [];
      allDcrs = cache.dcrs || [];
      allExpenses = cache.expenses || [];
    } catch (e) { }
  }

  // ===== Fetch All Data =====
  async function fetchAllData() {
    try {
      const [users, doctors, targets, dcrs, expenses] = await Promise.all([
        apiJson(USERS_API),
        apiJson(DOCTORS_API),
        apiJson(TARGETS_API),
        apiJson(DCR_API),
        apiJson(EXPENSE_API)
      ]);

      allUsers = Array.isArray(users) ? users : [];
      allDoctors = Array.isArray(doctors) ? doctors : [];
      allTargets = Array.isArray(targets) ? targets : [];
      allDcrs = Array.isArray(dcrs) ? dcrs : [];
      allExpenses = Array.isArray(expenses) ? expenses : [];

      updateSummaryCards();
      updateCharts();
      updateTopPerformingMRs();
      updateInsightCards();

      // Persist to localStorage
      localStorage.setItem("admin_dashboard_cache", JSON.stringify({
        users: allUsers,
        doctors: allDoctors,
        targets: allTargets,
        dcrs: allDcrs,
        expenses: allExpenses
      }));
    } catch (e) {
      console.error("Failed to fetch dashboard data:", e);
    }
  }

  // ===== Update Summary Cards =====
  function updateSummaryCards() {
    // Total Managers
    const totalManagers = allUsers.filter(u =>
      u.role === "MANAGER"
    ).length;
    document.getElementById("totalManagersDisplay").textContent = totalManagers;

    // Total MRs
    const totalMRs = allUsers.filter(u => u.role === "MR").length;
    document.getElementById("totalMRsDisplay").textContent = totalMRs;

    // Total Doctors
    document.getElementById("totalDoctorsDisplay").textContent = allDoctors.length;

    // Total Sales
    const totalSales = allTargets.reduce((sum, t) =>
      sum + (Number(t.salesAchievement || t.achieved) || 0), 0
    );
    document.getElementById("totalSalesDisplay").textContent =
      `\u20B9${(totalSales / 100000).toFixed(2)} Lakh`;
  }

  // ===== Update Charts =====
  function updateCharts() {
    updateSalesVsTargetChart();
    updateDoctorVisitsChart();
    updateExpenseChart();
  }

  function getMonthsTillToday() {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months; // Show full year
  }

  const dynamicMonths = getMonthsTillToday();

  // Sales vs Target Chart
  let salesChartInstance = null;
  function updateSalesVsTargetChart() {
    const salesByMonth = new Array(dynamicMonths.length).fill(0);
    const targetsByMonth = new Array(dynamicMonths.length).fill(0);

    allTargets.forEach(t => {
      const dateVal = t.startDate || t.givenDate;
      if (dateVal) {
        const date = new Date(dateVal);
        const month = date.getMonth();
        const year = date.getFullYear();
        const currentYear = new Date().getFullYear();

        // Only include data from the current year for the monthly chart
        if (year === currentYear && month < dynamicMonths.length) {
          salesByMonth[month] += Number(t.salesAchievement || t.achieved || 0);
          targetsByMonth[month] += Number(t.salesTarget || t.qty || 0);
        }
      }
    });

    console.log('[DASHBOARD] Sales group data:', salesByMonth);
    console.log('[DASHBOARD] Target group data:', targetsByMonth);

    const salesCtx = document.getElementById("salesChart");
    if (!salesCtx) return;

    if (salesChartInstance) {
      salesChartInstance.destroy();
    }

    salesChartInstance = new Chart(salesCtx.getContext("2d"), {
      type: "line",
      data: {
        labels: dynamicMonths,
        datasets: [
          {
            label: "Sales",
            data: salesByMonth,
            borderColor: "#198754",
            backgroundColor: "rgba(25,135,84,0.1)",
            tension: 0.3,
            fill: true,
          },
          {
            label: "Target",
            data: targetsByMonth,
            borderColor: "#dc3545",
            backgroundColor: "rgba(220,53,69,0.1)",
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                if (value >= 100000) return (value / 100000).toFixed(1) + 'L';
                if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
                return value;
              }
            }
          }
        }
      },
    });
  }

  // Doctor Visits Trend Chart
  let visitsChartInstance = null;
  function updateDoctorVisitsChart() {
    const visitsByMonth = new Array(dynamicMonths.length).fill(0);

    allDcrs.forEach(dcr => {
      if (dcr.dateTime || dcr.visitDate) {
        const dateStr = dcr.dateTime || dcr.visitDate;
        const month = new Date(dateStr).getMonth();
        if (month < dynamicMonths.length) {
          visitsByMonth[month]++;
        }
      }
    });

    const visitsCtx = document.getElementById("visitsChart");
    if (!visitsCtx) return;

    if (visitsChartInstance) {
      visitsChartInstance.destroy();
    }

    visitsChartInstance = new Chart(visitsCtx.getContext("2d"), {
      type: "bar",
      data: {
        labels: dynamicMonths,
        datasets: [
          {
            label: "Doctor Visits",
            data: visitsByMonth,
            backgroundColor: "#0d6efd",
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  }

  // Expense Breakdown Chart
  let expenseChartInstance = null;
  function updateExpenseChart() {
    const expenseByCategory = {};

    allExpenses.forEach(e => {
      const category = e.category || "Miscellaneous";
      if (!expenseByCategory[category]) {
        expenseByCategory[category] = 0;
      }
      expenseByCategory[category] += Number(e.amount) || 0;
    });

    const labels = Object.keys(expenseByCategory);
    const data = Object.values(expenseByCategory);

    const expenseCtx = document.getElementById("expenseChart");
    if (!expenseCtx) return;

    if (expenseChartInstance) {
      expenseChartInstance.destroy();
    }

    expenseChartInstance = new Chart(expenseCtx.getContext("2d"), {
      type: "pie",
      data: {
        labels: labels.length > 0 ? labels : ["No Data"],
        datasets: [{
          data: data.length > 0 ? data : [1],
          backgroundColor: ["#0d6efd", "#198754", "#ffc107", "#dc3545", "#6f42c1"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } }
      }
    });
  }

  // ===== Update Top Performing MRs =====
  function updateTopPerformingMRs() {
    const mrPerformance = {};

    // Calculate performance for each MR
    allTargets.forEach(t => {
      const mrName = t.mrName;
      if (!mrName) return;

      if (!mrPerformance[mrName]) {
        mrPerformance[mrName] = {
          totalTarget: 0,
          totalAchievement: 0,
          count: 0
        };
      }

      mrPerformance[mrName].totalTarget += Number(t.salesTarget || t.qty) || 0;
      mrPerformance[mrName].totalAchievement += Number(t.salesAchievement || t.achieved) || 0;
      mrPerformance[mrName].count++;
    });

    // Calculate percentage and sort
    const mrList = Object.keys(mrPerformance).map(name => {
      const perf = mrPerformance[name];
      const percentage = perf.totalTarget > 0
        ? Math.round((perf.totalAchievement / perf.totalTarget) * 100)
        : 0;
      return {
        name,
        percentage,
        achievement: perf.totalAchievement,
        target: perf.totalTarget
      };
    }).sort((a, b) => b.percentage - a.percentage);

    // Display top 5
    const topMRList = document.getElementById("topMRList");
    if (mrList.length === 0) {
      topMRList.innerHTML = '<li class="list-group-item text-center text-muted">No data available</li>';
      return;
    }

    topMRList.innerHTML = mrList.slice(0, 5).map((mr, index) => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <strong>${index + 1}. ${mr.name}</strong>
          <br>
          <small class="text-muted">Achievement: \u20B9${(mr.achievement / 1000).toFixed(1)}K</small>
        </div>
        <span class="badge ${mr.percentage >= 80 ? 'bg-success' : mr.percentage >= 50 ? 'bg-warning' : 'bg-danger'} rounded-pill">
          ${mr.percentage}%
        </span>
      </li>
    `).join('');
  }

  // ===== Update Insight Cards =====
  function updateInsightCards() {
    // Use backend's achievementPercentage directly
    const mrList = allTargets
      .filter(t => t.mrName) // Only include targets with MR names
      .map(t => ({
        name: t.mrName,
        percentage: Number(t.achievementPercentage) || 0,
        period: t.period || 'N/A'
      }))
      // Group by MR name and average their percentages
      .reduce((acc, curr) => {
        if (!acc[curr.name]) {
          acc[curr.name] = { name: curr.name, percentages: [], period: curr.period };
        }
        acc[curr.name].percentages.push(curr.percentage);
        return acc;
      }, {});

    // Calculate average percentage for each MR
    const mrPerformance = Object.values(mrList).map(mr => ({
      name: mr.name,
      percentage: Math.round(mr.percentages.reduce((a, b) => a + b, 0) / mr.percentages.length),
      period: mr.period
    })).sort((a, b) => b.percentage - a.percentage);

    // Top Performing MR
    if (mrPerformance.length > 0) {
      document.getElementById("topMRName").textContent = mrPerformance[0].name;
      document.getElementById("topMRPercentage").textContent = `${mrPerformance[0].percentage}%`;
    } else {
      document.getElementById("topMRName").textContent = "No Data";
      document.getElementById("topMRPercentage").textContent = "--";
    }

    // Least Performing MR
    if (mrPerformance.length > 1) {
      const leastMR = mrPerformance[mrPerformance.length - 1];
      document.getElementById("leastMRName").textContent = leastMR.name;
      document.getElementById("leastMRPercentage").textContent = `${leastMR.percentage}%`;
    } else if (mrPerformance.length === 1) {
      document.getElementById("leastMRName").textContent = mrPerformance[0].name;
      document.getElementById("leastMRPercentage").textContent = `${mrPerformance[0].percentage}%`;
    } else {
      document.getElementById("leastMRName").textContent = "No Data";
      document.getElementById("leastMRPercentage").textContent = "--";
    }

    // Pending Approvals (count expenses with PENDING status)
    const pendingCount = allExpenses.filter(e =>
      e.status === "PENDING" || e.status === "SUBMITTED"
    ).length;
    document.getElementById("pendingApprovalsCount").textContent = pendingCount;
  }

  // ===== Initialize =====
  // Render local data first
  updateSummaryCards();
  updateCharts();
  updateTopPerformingMRs();
  updateInsightCards();

  fetchAllData();
});

