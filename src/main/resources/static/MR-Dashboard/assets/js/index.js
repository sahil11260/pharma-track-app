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
    NOTIFICATIONS: "/api/notifications",
    MY_TARGETS: "/api/mr/me/sales-targets"
  };

  const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");
  const MR_LOCATION_API = `${API_BASE}/api/mr-locations/me`;

  function getAuthHeader() {
    const token = localStorage.getItem("kavya_auth_token") || localStorage.getItem("token");
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

  let geoWatchId = null;
  let lastSentAt = 0;

  async function postMyLocation(lat, lng, accuracy) {
    const now = Date.now();
    if (now - lastSentAt < 15000) {
      return;
    }
    lastSentAt = now;

    log(`Posting location: lat=${lat}, lng=${lng}, accuracy=${accuracy}m`);
    log(`Token present: ${!!localStorage.getItem("kavya_auth_token") || !!localStorage.getItem("token")}`);

    try {
      await apiJson(MR_LOCATION_API, {
        method: "POST",
        body: JSON.stringify({ latitude: lat, longitude: lng, accuracy: accuracy })
      });
      log("Location posted successfully!");
    } catch (e) {
      warn("Location update failed:", e);
    }
  }

  function startLiveLocationTracking() {
    log("Starting live location tracking...");
    const token = localStorage.getItem("kavya_auth_token") || localStorage.getItem("token");
    if (!token) {
      warn("No token found, cannot start location tracking");
      return;
    }
    log("Token found, proceeding with geolocation...");

    if (!navigator.geolocation || typeof navigator.geolocation.watchPosition !== "function") {
      warn("Geolocation not supported");
      return;
    }

    if (geoWatchId != null) {
      log("Location tracking already active");
      return;
    }

    try {
      const options = {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000
      };

      if (typeof navigator.geolocation.getCurrentPosition === "function") {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const c = pos && pos.coords ? pos.coords : null;
            if (!c) return;
            if (typeof c.latitude !== "number" || typeof c.longitude !== "number") return;
            postMyLocation(c.latitude, c.longitude, c.accuracy);
          },
          (error) => {
            if (error && error.code === 1) {
              warn("Geolocation permission denied.");
            } else {
              warn("Geolocation error:", error);
            }
          },
          options
        );
      }

      geoWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          const c = pos && pos.coords ? pos.coords : null;
          if (!c) return;
          if (typeof c.latitude !== "number" || typeof c.longitude !== "number") return;
          postMyLocation(c.latitude, c.longitude, c.accuracy);
        },
        (error) => {
          if (error && error.code === 1) {
            warn("Geolocation permission denied.");
            return;
          }
          warn("Geolocation error:", error);
        },
        options
      );
    } catch (e) {
      warn("Unable to start geolocation:", e);
    }
  }

  function formatINR(n) {
    if (n == null) return "--";
    if (typeof n !== "number") return n;
    return "\u20B9" + n.toLocaleString("en-IN");
  }

  function formatUnits(n) {
    return Number(n || 0).toLocaleString("en-IN");
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
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [summary, targets] = await Promise.all([
        apiJson(API.DASHBOARD).catch(() => null),
        apiJson(`${API.MY_TARGETS}?month=${month}&year=${year}`).catch(() => [])
      ]);
      return {
        summary: Object.assign({}, DEFAULTS, summary || {}),
        targets: Array.isArray(targets) ? targets : []
      };
    } catch (e) {
      warn("loadDashboard API error:", e);
      return { summary: loadDashboardFromLocalStorage(), targets: [] };
    }
  }

  function renderSummary(dataContainer) {
    const data = dataContainer.summary || dataContainer;
    const targets = dataContainer.targets || [];

    log("renderSummary called with data:", data, "targets count:", targets.length);

    const elSales = $id("dashSales");
    const elTarget = $id("dashTarget");
    const elTargetBar = $id("dashTargetBar");
    const elVisits = $id("dashVisits");
    const elExpPending = $id("dashExpensesPending");
    const elExpApproved = $id("dashExpensesApproved");

    const salesBreakdownEl = $id("salesBreakdownHome");
    const targetBreakdownEl = $id("targetBreakdownHome");

    // Unified Data Calculation: Use targets for Sales and Achievement %
    let computedTotalAchieved = 0;
    let salesLines = [];
    let achievementLines = [];

    const salesTargets = targets.filter(t => t.category && t.category.toLowerCase() !== 'visit');

    salesTargets.forEach(t => {
      const aUnits = t.achievedUnits || 0;
      computedTotalAchieved += aUnits;
      const pName = t.productName || "Unknown";
      salesLines.push(`<div>${pName}: <strong>${aUnits}</strong></div>`);
      achievementLines.push(`<div>${pName}: <strong>${(t.achievementPercentage || 0).toFixed(1)}%</strong></div>`);
    });

    const avgAchievement = salesTargets.length > 0
      ? (salesTargets.reduce((sum, t) => sum + (t.achievementPercentage || 0), 0) / salesTargets.length)
      : 0;

    if (elSales) {
      elSales.textContent = formatUnits(computedTotalAchieved);
      if (salesBreakdownEl && salesLines.length > 0) {
        salesBreakdownEl.innerHTML = salesLines.join('');
        salesBreakdownEl.style.display = "block";
      }
    }

    if (elTarget) {
      const pct = Math.min(100, Math.max(0, avgAchievement));
      elTarget.textContent = `${pct.toFixed(1)}%`;
      if (elTargetBar) {
        elTargetBar.style.width = `${pct}%`;
        elTargetBar.setAttribute("aria-valuenow", String(pct));
      }
      if (targetBreakdownEl && achievementLines.length > 0) {
        targetBreakdownEl.innerHTML = achievementLines.join('');
        targetBreakdownEl.style.display = "block";
      }
    }

    if (elVisits) {
      elVisits.textContent = String(Number(data.visits) || 0);
    }

    if (elExpPending) {
      elExpPending.textContent = formatINR(Number(data.expensesPending) || 0);
    }

    if (elExpApproved) {
      elExpApproved.textContent = formatINR(Number(data.expensesApproved) || 0);
    }
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

    // Check for auth token
    const token = localStorage.getItem("kavya_auth_token");
    if (!token) {
      warn("No kavya_auth_token found in localStorage. API calls will fail.");
    }

    // Set Today's date in header
    const dateEl = $id("todayDate");
    if (dateEl) {
      const d = new Date();
      dateEl.textContent = d.toLocaleDateString("en-IN", { weekday: 'long', day: 'numeric', month: 'short' });
    } else {
      warn("#todayDate element not found.");
    }


    log("Fetching dashboard data...");
    const dashboardData = await loadDashboard();
    log("Dashboard data received:", dashboardData);
    renderSummary(dashboardData);

    // Load Notifications
    log("Fetching notifications...");
    loadNotifications();

    log("MR Dashboard ready.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", async () => {
      await startLiveLocationTracking();
      init();
    });
  } else {
    setTimeout(async () => {
      await startLiveLocationTracking();
      init();
    }, 10);
  }
})();
