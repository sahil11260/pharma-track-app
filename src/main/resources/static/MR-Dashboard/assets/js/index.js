// assets/js/index.js
// MR Dashboard - Robust attendance + debug helpers
(function () {
  "use strict";

  const LOG = "[MR-DASH]";
  function log(...a) { console.log(LOG, ...a); }
  function warn(...a) { console.warn(LOG, ...a); }
  function err(...a) { console.error(LOG, ...a); }

  // LocalStorage keys
  const LS = {
    DASH: "mr_dashboard_v1"
  };

  // Default dashboard values (unchanged)
  const DEFAULTS = {
    sales: 0,
    targetPercent: 0,
    visits: 0,
    expensesPending: 0,
    expensesApproved: 0
  };

  const API = {
    DASHBOARD: "/api/mr-dashboard",
    TASKS: "/api/tasks",
    NOTIFICATIONS: "/api/notifications"
  };

  function getAuthHeader() {
    const token = localStorage.getItem("kavya_auth_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  const $id = id => document.getElementById(id);
  let durationInterval = null;

  async function apiJson(url, options) {
    const res = await fetch(url, Object.assign({
      headers: Object.assign({ "Content-Type": "application/json" }, getAuthHeader())
    }, options || {}));
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
    }
    if (res.status === 204) {
      return null;
    }
    return await res.json();
  }

  function formatINR(n) {
    if (n == null) return "--";
    if (typeof n !== "number") return n;
    return "\u20B9" + n.toLocaleString("en-IN");
  }

  function loadDashboardFromLocalStorage() {
    try {
      const raw = localStorage.getItem(LS.DASH);
      if (!raw) return Object.assign({}, DEFAULTS);
      return Object.assign({}, DEFAULTS, JSON.parse(raw));
    } catch (e) {
      warn("loadDashboard error:", e);
      return Object.assign({}, DEFAULTS);
    }
  }

  function saveDashboardToLocalStorage(obj) {
    try {
      localStorage.setItem(LS.DASH, JSON.stringify(obj));
    } catch (e) {
      warn("saveDashboard error:", e);
    }
  }

  async function loadDashboard() {
    try {
      const data = await apiJson(API.DASHBOARD);
      return Object.assign({}, DEFAULTS, data || {});
    } catch (e) {
      warn("loadDashboard API error:", e);
      return loadDashboardFromLocalStorage();
    }
  }

  async function saveDashboard(obj) {
    try {
      const data = await apiJson(API.DASHBOARD, {
        method: "PUT",
        body: JSON.stringify(obj || {})
      });
      return Object.assign({}, DEFAULTS, data || {});
    } catch (e) {
      warn("saveDashboard API error:", e);
      saveDashboardToLocalStorage(obj);
      return Object.assign({}, DEFAULTS, obj || {});
    }
  }


  function renderSummary(data) {
    const elSales = $id("dashSales");
    const elTarget = $id("dashTarget");
    const elTargetBar = $id("dashTargetBar");
    const elVisits = $id("dashVisits");
    const elExpPending = $id("dashExpensesPending");
    const elExpApproved = $id("dashExpensesApproved");

    if (elSales) elSales.textContent = formatINR(Number(data.sales) || 0);
    if (elTarget) {
      const pct = Math.min(100, Math.max(0, Number(data.targetPercent || 0)));
      elTarget.textContent = `${pct}%`;
      if (elTargetBar) {
        elTargetBar.style.width = `${pct}%`;
        elTargetBar.setAttribute("aria-valuenow", String(pct));
      }
    }
    if (elVisits) elVisits.textContent = String(Number(data.visits) || 0);
    if (elExpPending) elExpPending.textContent = formatINR(Number(data.expensesPending) || 0);
    if (elExpApproved) elExpApproved.textContent = formatINR(Number(data.expensesApproved) || 0);
  }

  async function loadNotifications() {
    const container = document.getElementById("notificationsContent");
    if (!container) return;

    try {
      const data = await apiJson(API.NOTIFICATIONS);
      const notifs = Array.isArray(data) ? data : [];

      if (notifs.length === 0) {
        container.innerHTML = '<li class="p-3 text-center text-muted small">No new notifications</li>';
        return;
      }

      container.innerHTML = notifs.slice(0, 5).map(n => `
        <li>
          <a class="dropdown-item small" href="#">
            <div class="fw-bold">${n.title || "Notification"}</div>
            <div class="text-muted text-truncate" style="max-width: 220px;">${n.message}</div>
            <small class="text-secondary">${n.date || ""}</small>
          </a>
        </li>
      `).join("");
    } catch (e) {
      container.innerHTML = '<li class="p-3 text-center text-danger small">Failed to load alerts</li>';
    }
  }

  // Initialization
  async function init() {
    log("Initializing MR Dashboard script");

    // Set Today's date in header
    const dateEl = $id("todayDate");
    if (dateEl) {
      const d = new Date();
      dateEl.textContent = d.toLocaleDateString("en-IN", { weekday: 'long', day: 'numeric', month: 'short' });
    } else {
      warn("#todayDate element not found.");
    }

    const dashboardData = await loadDashboard();
    renderSummary(dashboardData);

    // Load Tasks
    loadTasks();

    // Load Notifications
    loadNotifications();


    // Backwards-compatible update helper
    window._mrUpdate = function (obj) {
      (async function () {
        try {
          const current = await loadDashboard();
          const merged = Object.assign({}, current, obj);
          const saved = await saveDashboard(merged);
          renderSummary(saved);
        } catch (e) {
          err("Dashboard update failed:", e);
        }
      })();
    };

    log("MR Dashboard ready. Use window._mrDebugAttendance(), _mrSimulateCheckIn(), _mrSimulateCheckOut().");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 10);
  }
})();
