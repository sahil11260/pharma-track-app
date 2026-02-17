

document.addEventListener("DOMContentLoaded", () => {

  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");

  if (sidebarToggle && sidebar && mainContent) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      mainContent.classList.toggle("expanded");
    });
  }



  function injectDarkCardStyles() {
    if (document.getElementById("dark-card-styles")) return;
    const style = document.createElement("style");
    style.id = "dark-card-styles";
    style.innerHTML = `
      /* Styles applied to the two equal-height cards when dark mode is active */
      #mainContent .card.equal-height.dark-card .card-header,
      #mainContent .card.equal-height.dark-card .card-body,
      #mainContent .card.equal-height.dark-card h5.mb-0 {
        color: #ffffff !important;
      }
      #mainContent .card.equal-height.dark-card .activity-content h6,
      #mainContent .card.equal-height.dark-card .activity-content p,
      #mainContent .card.equal-height.dark-card .activity-content small {
        color: #ffffff !important;
      }
      #mainContent .card.equal-height.dark-card .activity-icon i {
        color: #ffffff !important;
      }

      /* Notifications modal dark style (applied to .modal-content.dark-modal) */
      .modal-content.dark-modal {
        background-color: #0b0b0b !important;
        color: #ffffff !important;
        border: 1px solid #222 !important;
      }
      .modal-content.dark-modal .modal-header,
      .modal-content.dark-modal .modal-footer {
        border-color: #222 !important;
      }
      .modal-content.dark-modal .text-muted {
        color: rgba(255,255,255,0.70) !important;
      }
      .modal-content.dark-modal .notification-item {
        border-bottom-color: rgba(255,255,255,0.06) !important;
      }
      .modal-content.dark-modal .notification-icon { opacity: 0.95; }
    `;
    document.head.appendChild(style);
  }

  function applyDarkToEqualHeightCards(enable) {
    const cards = document.querySelectorAll("#mainContent .card.equal-height");
    if (!cards || cards.length === 0) return;
    cards.forEach((card) => card.classList.toggle("dark-card", !!enable));
  }

  function applyDarkToNotificationsModal(enable) {
    const modal = document.getElementById("notificationsModal");
    if (!modal) return;
    const content = modal.querySelector(".modal-content");
    if (!content) return;
    content.classList.toggle("dark-modal", !!enable);

    const items = content.querySelectorAll(".notification-item");
    items.forEach((it) => {
      if (enable) {
        it.style.color = "#ffffff";
        const muted = it.querySelectorAll(".text-muted");
        muted.forEach((m) => (m.style.color = "rgba(255,255,255,0.7)"));
      } else {
        it.style.color = "";
        const muted = it.querySelectorAll(".text-muted");
        muted.forEach((m) => (m.style.color = ""));
      }
    });
  }



  // -----------------------
  // Mock / dashboard data
  // -----------------------
  // const API_BASE = window.location.port === "5500" ? "http://localhost:8080" : "";
  const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");

  let dashboardData = {
    totalMRs: 0,
    totalSales: 0,
    totalVisits: 0,
    pendingTasks: 0,
    period: "month",
  };

  // Load from localStorage if present
  const savedDash = localStorage.getItem("mgr_dashboard_stats");
  if (savedDash) {
    try {
      dashboardData = Object.assign(dashboardData, JSON.parse(savedDash));
    } catch (e) { }
  }

  function getAuthHeader() {
    const token = localStorage.getItem("kavya_auth_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  async function fetchDashboardStats() {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/stats`, {
        headers: Object.assign({ "Content-Type": "application/json" }, getAuthHeader()),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const stats = await res.json();
      dashboardData.totalMRs = stats.totalMRs;
      dashboardData.totalVisits = stats.totalDoctors; // Using doctors count as visits proxy for now
      dashboardData.totalSales = 0; // No sales endpoint yet
      dashboardData.pendingTasks = 0; // No tasks endpoint yet

      // Persist to localStorage
      localStorage.setItem("mgr_dashboard_stats", JSON.stringify(dashboardData));
    } catch (e) {
      console.warn("Failed to fetch dashboard stats, using defaults.", e);
      // Keep defaults (0) if API fails
    }
  }

  let chartsData = {
    monthLabels: [],
    salesByMonth: [],
    visitsByMonth: [],
    targetsByMonth: [],
    expenseByCategory: {},
    productSalesByMonth: {}
  };

  async function fetchDashboardCharts() {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/charts`, {
        headers: Object.assign({ "Content-Type": "application/json" }, getAuthHeader()),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      chartsData = data;
    } catch (e) {
      console.warn("Failed to fetch dashboard charts, using defaults.", e);
      // Keep empty defaults if API fails
      chartsData = {
        monthLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        salesByMonth: [0, 0, 0, 0, 0, 0],
        visitsByMonth: [0, 0, 0, 0, 0, 0],
        targetsByMonth: [0, 0, 0, 0, 0, 0],
        expenseByCategory: { Travel: 0, Meals: 0, Samples: 0, Marketing: 0, Other: 0 },
        productSalesByMonth: { "Product A": [0, 0, 0, 0, 0, 0], "Product B": [0, 0, 0, 0, 0, 0], "Product C": [0, 0, 0, 0, 0, 0], "Product D": [0, 0, 0, 0, 0, 0] }
      };
    }
  }

  const mrPerformanceData = [
    { name: "Rajesh Kumar", sales: 280000, visits: 45, target: 250000, avatar: "RK" },
    { name: "Priya Sharma", sales: 240000, visits: 42, target: 230000, avatar: "PS" },
    { name: "Amit Singh", sales: 220000, visits: 38, target: 220000, avatar: "AS" },
    { name: "Sneha Patel", sales: 210000, visits: 40, target: 200000, avatar: "SP" },
    { name: "Manish Patel", sales: 180000, visits: 35, target: 200000, avatar: "MP" },
    { name: "Kavita Jain", sales: 160000, visits: 45, target: 180000, avatar: "KJ" },
  ];

  const recentActivities = [];

  const alertsData = [];

  // -----------------------
  // Product Sales (dynamic)
  // -----------------------
  const productList = Object.keys(chartsData.productSalesByMonth);
  const months6 = chartsData.monthLabels;

  function getPaletteColor(i, alpha) {
    const palette = [
      '102,126,234', // indigo
      '240,147,251', // pink
      '40,167,69',   // green
      '255,193,7'    // amber
    ];
    const rgb = palette[i % palette.length];
    return `rgba(${rgb}, ${alpha})`;
  }

  // We'll create datasets per (product Ã\u2014 month) so we can control stacking order per month.
  let productSalesChartInstance = null;
  let productDatasetIndexMap = {};

  function renderProductSales(stacked = true) {
    const canvas = document.getElementById("productSalesChart");
    const togglesContainer = document.getElementById("productToggles");
    if (!canvas || !togglesContainer) return;

    const monthData = [];
    for (let m = 0; m < months6.length; m++) {
      const arr = [];
      for (let p = 0; p < productList.length; p++) {
        const productName = productList[p];
        const value = chartsData.productSalesByMonth[productName]?.[m] || 0;
        arr.push({ productIndex: p, productName, value });
      }
      // sort ascending so the highest value is drawn on top of the stack
      arr.sort((a, b) => a.value - b.value);
      monthData.push(arr);
    }

    const datasets = [];
    productDatasetIndexMap = {};
    for (let p = 0; p < productList.length; p++) productDatasetIndexMap[productList[p]] = [];

    let datasetIndex = 0;
    for (let m = 0; m < months6.length; m++) {
      const stackId = 'stack_' + m;
      const sortedArr = monthData[m];
      for (let itemIdx = 0; itemIdx < sortedArr.length; itemIdx++) {
        const item = sortedArr[itemIdx];
        const dataArr = new Array(months6.length).fill(0);
        dataArr[m] = item.value;

        const color = getPaletteColor(item.productIndex, 0.9);
        const border = getPaletteColor(item.productIndex, 1);

        const ds = {
          label: item.productName,
          data: dataArr,
          backgroundColor: color,
          borderColor: border,
          borderWidth: 1,
          stack: stackId,
          _productIndex: item.productIndex,
          _productName: item.productName
        };

        datasets.push(ds);
        productDatasetIndexMap[item.productName].push(datasetIndex);
        datasetIndex++;
      }
    }

    if (productSalesChartInstance) {
      try { productSalesChartInstance.destroy(); } catch (e) { }
      productSalesChartInstance = null;
    }

    const ctx = canvas.getContext("2d");
    productSalesChartInstance = new Chart(ctx, {
      type: 'bar',
      data: { labels: months6, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: stacked,
            title: { display: false },
            categoryPercentage: 0.6,
            barPercentage: 1.0,
            offset: true,
            ticks: {
              maxRotation: 90,
              minRotation: 90,
              autoSkip: false
            }
          },
          y: {
            stacked: stacked,
            beginAtZero: true,
            title: { display: true, text: 'Sales (\u20B9)' },
            ticks: {
              callback: function (value) {
                if (value >= 1000) return '\u20B9' + (value / 1000).toFixed(0) + 'K';
                return '\u20B9' + value;
              }
            }
          }
        },
        elements: {
          bar: {
            borderRadius: 3,
            barThickness: 34,
            maxBarThickness: 64
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                const ds = context.dataset;
                const value = context.raw ?? context.parsed?.y ?? 0;
                if (value === 0) return null;
                if (value >= 1000) return ds._productName + ': \u20B9' + (value / 1000).toLocaleString() + 'K';
                return ds._productName + ': \u20B9' + value;
              }
            }
          },
          legend: { display: false }
        },
        layout: {
          padding: {
            top: 6,
            bottom: 6,
            left: 6,
            right: 6
          }
        }
      }
    });

    // toggles
    togglesContainer.innerHTML = '';
    for (let p = 0; p < productList.length; p++) {
      const name = productList[p];
      const id = `prodToggle_${p}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'form-check form-check-inline';

      const input = document.createElement('input');
      input.className = 'form-check-input';
      input.type = 'checkbox';
      input.id = id;
      input.checked = true;
      input.dataset.product = name;

      const label = document.createElement('label');
      label.className = 'form-check-label small';
      label.htmlFor = id;
      label.textContent = name;

      input.addEventListener('change', (e) => {
        const prod = e.target.dataset.product;
        const visible = e.target.checked;
        const indices = productDatasetIndexMap[prod] || [];
        indices.forEach((dsIndex) => {
          if (productSalesChartInstance) {
            productSalesChartInstance.setDatasetVisibility(dsIndex, visible);
          }
        });
        if (productSalesChartInstance) productSalesChartInstance.update();
      });

      wrapper.appendChild(input);
      wrapper.appendChild(label);
      togglesContainer.appendChild(wrapper);
    }

    // dark-mode adjustments
    if (document.body.classList.contains("dark-mode")) {
      injectDarkCardStyles();
      applyDarkToEqualHeightCards(true);
    }
  }

  // -----------------------
  // Update stats & notifications
  // -----------------------
  function updateStats() {
    const elTotalMRs = document.getElementById("totalMRs");
    const elTotalSales = document.getElementById("totalSales");
    const elTotalVisits = document.getElementById("totalVisits");
    const elPendingTasks = document.getElementById("pendingTasks");

    if (elTotalMRs) elTotalMRs.textContent = dashboardData.totalMRs;
    if (elTotalSales) elTotalSales.textContent = `\u20B9${(dashboardData.totalSales / 100000).toFixed(1)}L`;
    if (elTotalVisits) elTotalVisits.textContent = dashboardData.totalVisits;
    if (elPendingTasks) elPendingTasks.textContent = dashboardData.pendingTasks;
  }

  async function renderNotifications() {
    const container = document.getElementById("notificationsList");
    if (!container) return;

    container.innerHTML = '<div class="p-3 text-center"><div class="spinner-border spinner-border-sm text-primary"></div></div>';

    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const allNotifications = Array.isArray(data) ? data : [];

      if (allNotifications.length === 0) {
        container.innerHTML = '<div class="p-3 text-center text-muted small">No new notifications</div>';
        return;
      }

      container.innerHTML = allNotifications
        .slice(0, 10)
        .map(
          (n) => `
        <div class="notification-item p-3 border-bottom">
          <div class="d-flex align-items-start">
            <div class="bg-primary text-white me-3 rounded-circle d-inline-flex align-items-center justify-content-center" style="min-width:40px;height:40px;">
              <i class="bi bi-bell"></i>
            </div>
            <div class="flex-grow-1">
              <h6 class="mb-1">${n.title || "Notification"}</h6>
              <p class="mb-1 text-muted small">${n.message}</p>
              <small class="text-secondary">${n.date || "Just now"}</small>
            </div>
          </div>
        </div>
      `
        )
        .join("");

      if (document.body.classList.contains("dark-mode")) {
        injectDarkCardStyles();
        applyDarkToNotificationsModal(true);
      }
    } catch (e) {
      container.innerHTML = '<div class="p-3 text-center text-danger small">Failed to load notifications</div>';
    }
  }

  // -----------------------
  // Map (kept)
  // -----------------------
  let dashboardMap;
  function initDashboardMap() {
    // MR Live Tracking module removed
    const el = document.getElementById("dashboardMap");
    if (el) el.innerHTML = '<div class="text-center text-muted p-5">Module Removed</div>';
  }

  // -----------------------
  // Performance, Sales & Expense charts (dynamic)
  // -----------------------
  let performanceChart;
  function initPerformanceChart() {
    const ctx = document.getElementById("performanceChart");
    if (!ctx) {
      console.error("Performance chart canvas not found");
      return;
    }
    const context = ctx.getContext("2d");
    if (!context) {
      console.error("Could not get 2D context for performance chart");
      return;
    }

    performanceChart = new Chart(context, {
      type: "line",
      data: {
        labels: chartsData.monthLabels,
        datasets: [
          {
            label: "Team Sales (\u20B9)",
            data: chartsData.salesByMonth,
            borderColor: "#667eea",
            backgroundColor: "rgba(102, 126, 234, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Target (\u20B9)",
            data: chartsData.targetsByMonth,
            borderColor: "#f093fb",
            backgroundColor: "rgba(240, 147, 251, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top" } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: function (value) { return "\u20B9" + (value / 1000).toFixed(0) + "K"; } },
          },
        },
      },
    });
  }

  function initSalesChart() {
    const ctx = document.getElementById("salesChart");
    if (!ctx) return;
    const context = ctx.getContext("2d");
    new Chart(context, {
      type: "bar",
      data: {
        labels: chartsData.monthLabels,
        datasets: [
          {
            label: "Sales (\u20B9)",
            data: chartsData.salesByMonth,
            backgroundColor: "#667eea",
          },
          {
            label: "Target (\u20B9)",
            data: chartsData.targetsByMonth,
            backgroundColor: "#f093fb",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "top" } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: function (value) { return "\u20B9" + (value / 1000).toFixed(0) + "K"; } },
          },
        },
      },
    });
  }

  function initExpenseChart() {
    const canvas = document.getElementById("expenseChart");
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (parent) {
      parent.style.height = "260px";
      parent.style.maxHeight = "320px";
      parent.style.minHeight = "160px";
    }

    canvas.removeAttribute("height");

    const ctx = canvas.getContext("2d");

    if (window._expenseChartInstance) {
      try { window._expenseChartInstance.destroy(); } catch (e) { }
      window._expenseChartInstance = null;
    }

    const labels = Object.keys(chartsData.expenseByCategory);
    const values = Object.values(chartsData.expenseByCategory);

    window._expenseChartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            data: values,
            backgroundColor: ["#667eea", "#f093fb", "#28a745", "#ffc107", "#6c757d"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
      },
    });
  }

  // -----------------------
  // Chart controls (dynamic)
  // -----------------------
  window.switchChart = function (type) {
    const buttons = document.querySelectorAll(".btn-group .btn");
    buttons.forEach((btn) => btn.classList.remove("active"));

    const activeBtn = document.activeElement;
    if (activeBtn && activeBtn.classList && activeBtn.classList.contains("btn")) {
      activeBtn.classList.add("active");
    } else {
      buttons.forEach((btn) => {
        if (btn.textContent.trim().toLowerCase() === type) btn.classList.add("active");
      });
    }

    if (!performanceChart) {
      console.warn("performanceChart not initialized yet");
      return;
    }

    const currencyTick = function (value) { return "\u20B9" + (value / 1000).toFixed(0) + "K"; };
    const plainTick = function (value) { return value; };
    const percentTick = function (value) { return value + "%"; };

    switch (type) {
      case "sales":
        performanceChart.data.datasets[0].data = chartsData.salesByMonth;
        performanceChart.data.datasets[0].label = "Team Sales (\u20B9)";
        performanceChart.data.datasets[0].borderColor = "#667eea";
        performanceChart.data.datasets[0].backgroundColor = "rgba(102, 126, 234, 0.1)";
        if (performanceChart.data.datasets[1]) {
          performanceChart.data.datasets[1].data = chartsData.targetsByMonth;
          performanceChart.data.datasets[1].label = "Target (\u20B9)";
          performanceChart.data.datasets[1].borderColor = "#f093fb";
          performanceChart.data.datasets[1].backgroundColor = "rgba(240, 147, 251, 0.1)";
        }
        performanceChart.options.scales.y.ticks.callback = currencyTick;
        break;

      case "visits":
        performanceChart.data.datasets[0].data = chartsData.visitsByMonth;
        performanceChart.data.datasets[0].label = "Doctor Visits";
        performanceChart.data.datasets[0].borderColor = "#28a745";
        performanceChart.data.datasets[0].backgroundColor = "rgba(40, 167, 69, 0.1)";
        if (performanceChart.data.datasets[1]) {
          performanceChart.data.datasets[1].data = chartsData.visitsByMonth.map(() => 0);
          performanceChart.data.datasets[1].label = "";
        }
        performanceChart.options.scales.y.ticks.callback = plainTick;
        break;

      case "targets":
        // Show percentage achievement: (sales/target)*100 if target>0 else 0
        const percentAchievement = chartsData.salesByMonth.map((sale, i) => {
          const target = chartsData.targetsByMonth[i] || 0;
          return target > 0 ? Math.round((sale / target) * 100) : 0;
        });
        performanceChart.data.datasets[0].data = percentAchievement;
        performanceChart.data.datasets[0].label = "Target Achievement (%)";
        performanceChart.data.datasets[0].borderColor = "#f093fb";
        performanceChart.data.datasets[0].backgroundColor = "rgba(240, 147, 251, 0.1)";
        if (performanceChart.data.datasets[1]) {
          performanceChart.data.datasets[1].data = chartsData.targetsByMonth.map(() => 0);
          performanceChart.data.datasets[1].label = "";
        }
        performanceChart.options.scales.y.ticks.callback = percentTick;
        break;

      default:
        console.warn("Unknown chart type:", type);
        break;
    }

    performanceChart.update();
  };

  window.changePeriod = function (period) {
    dashboardData.period = period;
    const button = document.getElementById("periodDropdown");
    const labels = { today: "Today", week: "This Week", month: "This Month", quarter: "This Quarter" };
    if (button) button.innerHTML = `<i class="bi bi-calendar"></i> ${labels[period]}`;

    const items = document.querySelectorAll(".dropdown-menu .dropdown-item");
    items.forEach((item) => item.classList.remove("active"));
    items.forEach((item) => {
      if (item.textContent.trim().toLowerCase() === labels[period].toLowerCase()) {
        item.classList.add("active");
      }
    });

    updateStats();
    renderProductSales(true);
  };

  // -----------------------
  // Quick actions
  // -----------------------
  window.quickAction = function (action) {
    switch (action) {
      case "assignTask": window.location.href = "tasks.html"; break;
      case "sendNotification": window.location.href = "notifications.html"; break;
      case "viewReports": window.location.href = "reports.html"; break;

    }
  };

  // -----------------------
  // Refresh behavior
  // -----------------------
  // const refreshBtn = document.getElementById("refreshDashboardBtn");
  // if (refreshBtn) {
  //   refreshBtn.addEventListener("click", () => {
  //     const btn = document.getElementById("refreshDashboardBtn");
  //     btn.innerHTML = '<i class="bi bi-arrow-clockwise bi-spin"></i> Refreshing...';
  //     setTimeout(() => {
  //       dashboardData.totalSales += Math.floor(Math.random() * 50000);
  //       dashboardData.totalVisits += Math.floor(Math.random() * 5);
  //       dashboardData.pendingTasks = Math.max(0, dashboardData.pendingTasks - Math.floor(Math.random() * 3));
  //       updateStats();
  //       renderProductSales(true);
  //       renderNotifications();
  //       btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
  //     }, 1200);
  //   });
  // }

  // -----------------------
  // Notifications modal hooks
  // -----------------------
  const notificationsModal = document.getElementById("notificationsModal");
  if (notificationsModal) {
    notificationsModal.addEventListener("show.bs.modal", function () {
      renderNotifications();
      if (document.body.classList.contains("dark-mode")) {
        injectDarkCardStyles();
        applyDarkToNotificationsModal(true);
      }
    });
    notificationsModal.addEventListener("shown.bs.modal", function () {
      if (document.body.classList.contains("dark-mode")) {
        applyDarkToNotificationsModal(true);
      }
    });
  }

  // -----------------------
  // Init dashboard
  // -----------------------
  async function initDashboard() {
    // Show local data immediately
    updateStats();

    await fetchDashboardStats();
    await fetchDashboardCharts();
    updateStats();
    renderProductSales(true);
    renderNotifications();
    initPerformanceChart();
    initSalesChart();
    initExpenseChart();
  }

  initDashboard();

  // expose for quick debugging
  window._kavyaDashboard = {
    renderProductSales,
    productSalesChartInstance: () => productSalesChartInstance,
    renderNotifications,
    updateStats,
    initDashboardMap
  };

}); // end DOMContentLoaded

// Profile modal loader
document.addEventListener("DOMContentLoaded", () => {
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");

  const userStr = localStorage.getItem("kavya_user");
  let currentUser = null;
  try { if (userStr) currentUser = JSON.parse(userStr); } catch (e) { }

  const savedName = (currentUser && currentUser.name) ? currentUser.name : (localStorage.getItem("signup_name") || "");
  const savedEmail = (currentUser && currentUser.email) ? currentUser.email : (localStorage.getItem("signup_email") || "");
  if (profileName) profileName.textContent = savedName;
  if (profileEmail) profileEmail.textContent = savedEmail;

  // Update Navbar name
  const userDropdownBtn = document.getElementById("userDropdown");
  if (userDropdownBtn) {
    const icon = userDropdownBtn.querySelector('i, img');
    userDropdownBtn.innerHTML = '';
    if (icon) userDropdownBtn.appendChild(icon);
    userDropdownBtn.appendChild(document.createTextNode(' ' + savedName));
  }

  // Load saved profile picture (Isolated by email)
  const userEmailForPic = savedEmail || localStorage.getItem("kavya_user_email");
  const profilePicKey = userEmailForPic ? `kavya_profile_pic_${userEmailForPic}` : 'kavya_profile_pic';
  const savedPic = localStorage.getItem(profilePicKey);

  if (savedPic) {
    // 1. Update Profile Modals (any img in profileModal or with flaticon/avatar source)
    document.querySelectorAll('img').forEach(img => {
      if (img.src.includes('flaticon') || img.src.includes('avatar') || img.src.includes('Profile-img.png') || img.src.includes('Profile-img') || img.closest('#profileModal')) {
        img.src = savedPic;
      }
    });

    // 2. Update Navbar Icon
    const navbarIcon = document.querySelector('#userDropdown i.bi-person-circle');
    if (navbarIcon) {
      const img = document.createElement('img');
      img.src = savedPic;
      img.className = 'rounded-circle';
      img.width = 30;
      img.height = 30;
      img.style.objectFit = 'cover';
      navbarIcon.parentNode.replaceChild(img, navbarIcon);
    }
  }

  /* ============================
     🚪 Logout Handler
  ============================ */
  const logoutLinks = document.querySelectorAll('a[href="../index.html"], a[href="#logout"], a[href="#"]');
  logoutLinks.forEach(link => {
    if (link.textContent.toLowerCase().includes('logout')) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        // Clear auth data
        localStorage.removeItem("kavya_auth_token");
        localStorage.removeItem("kavya_user");
        localStorage.removeItem("kavya_user_email");
        localStorage.removeItem("kavya_user_role");
        localStorage.removeItem("signup_name");
        localStorage.removeItem("signup_email");
        localStorage.removeItem("signup_role");

        // Redirect to home
        window.location.href = "../index.html";
      });
    }
  });
});

