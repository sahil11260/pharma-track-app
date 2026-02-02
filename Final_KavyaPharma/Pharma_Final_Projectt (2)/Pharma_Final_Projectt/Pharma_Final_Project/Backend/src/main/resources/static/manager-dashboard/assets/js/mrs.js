// assets/js/mr.js (updated) -------------------------------------------
// Adds persistence to MR list using localStorage, without changing your UI logic.

const STORAGE_KEY_MRS = "kavyaPharmMRsData";

document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "";
  const USERS_API_BASE = `${API_BASE}/api/users`;
  let mrsApiMode = true;

  function getAuthHeader() {
    const token = localStorage.getItem("kavya_auth_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  async function apiJson(url, options) {
    const res = await fetch(url, Object.assign({
      headers: Object.assign({ "Content-Type": "application/json" }, getAuthHeader())
    }, options || {}));
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    return await res.json();
  }

  function normalizeMrFromApi(u) {
    return {
      id: Number(u.id),
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      territory: u.territory || "",
      manager: u.assignedManager || "",
      password: "",
      status: u.status || "ACTIVE"
    };
  }

  async function refreshMrsFromApiOrFallback() {
    try {
      let userObj = {};
      try {
        userObj = JSON.parse(localStorage.getItem("kavya_user") || "{}");
      } catch (e) { }

      const currentName = userObj.name || localStorage.getItem("signup_name") || "";
      const currentEmail = userObj.email || localStorage.getItem("signup_email") || "";

      console.log("[MR] Fetching MRs for manager:", currentName || currentEmail);
      let users = await apiJson(`${USERS_API_BASE}?manager=${encodeURIComponent(currentName || currentEmail)}&role=MR`);

      if ((!users || users.length === 0) && currentName && currentEmail && currentName !== currentEmail) {
        console.log("[MR] First query empty, trying email fallback query...");
        users = await apiJson(`${USERS_API_BASE}?manager=${encodeURIComponent(currentEmail)}&role=MR`);
      }

      if (Array.isArray(users)) {
        // Since the backend is now secure and robustly filters by manager identity (Name or Email),
        // we only need to verify that the role is MR.
        const onlyMrs = users.filter(u => u && u.role && String(u.role).toUpperCase().includes("MR"));

        mrs = onlyMrs.map(normalizeMrFromApi);
        saveMRsToStorage();
        mrsApiMode = true;
        hideApiRetryBanner();
        console.log("[MR] Successfully loaded", mrs.length, "MRs from API after filtering");
        return;
      }
      console.warn("[MR] API returned non-array response");
      mrsApiMode = false;
    } catch (e) {
      console.error("[MR] API call failed:", e);
      mrsApiMode = false;
      showApiRetryBanner();
    }
  }

  async function createMrApi(mr) {
    const payload = {
      name: mr.name,
      email: mr.email,
      password: mr.password,
      role: "MR",
      phone: mr.phone,
      territory: mr.territory,
      status: "ACTIVE",
      assignedManager: mr.manager || localStorage.getItem("signup_name") || ""
    };
    return await apiJson(USERS_API_BASE, { method: "POST", body: JSON.stringify(payload) });
  }

  async function updateMrApi(id, mr) {
    const payload = {
      name: mr.name,
      role: "MR",
      phone: mr.phone,
      territory: mr.territory,
      status: "ACTIVE",
      assignedManager: mr.manager || localStorage.getItem("signup_name") || "",
      password: mr.password ? mr.password : null
    };
    return await apiJson(`${USERS_API_BASE}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  }

  async function deleteMrApi(id) {
    await apiJson(`${USERS_API_BASE}/${id}`, { method: "DELETE" });
  }

  /* =========================
     UI: Sidebar + Theme Toggle
     ========================= */
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");
  if (sidebarToggle && sidebar && mainContent) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      mainContent.classList.toggle("expanded");
    });
  }

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    // apply saved theme
    if (localStorage.getItem("theme") === "dark") {
      document.body.classList.add("dark-mode");
      themeToggle.innerHTML = '<i class="bi bi-sun"></i>';
    } else {
      themeToggle.innerHTML = '<i class="bi bi-moon"></i>';
    }

    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const isDark = document.body.classList.contains("dark-mode");
      localStorage.setItem("theme", isDark ? "dark" : "light");
      // swap icon
      themeToggle.innerHTML = isDark ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon"></i>';
    });
  }

  /* =========================
     Remove Manager column header from table (so you don't need to edit HTML)
     ========================= */
  (function removeManagerHeaderIfPresent() {
    const theadRow = document.querySelector("table thead tr");
    if (!theadRow) return;
    // Find th that contains 'Manager' (case-insensitive) and remove it
    const ths = Array.from(theadRow.querySelectorAll("th"));
    for (const th of ths) {
      if (th.textContent && th.textContent.toLowerCase().includes("manager")) {
        th.remove();
        break;
      }
    }
  })();

  /* =========================
     Elements & Form inputs
     ========================= */
  const mrTable = document.getElementById("mrTableBody");
  const mrForm = document.getElementById("mrForm");
  const pagination = document.getElementById("pagination");
  const searchInput = document.getElementById("searchMR");
  const addMRBtn = document.querySelector('[data-bs-target="#mrModal"]');
  const togglePassword = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("mrPassword");

  const inputName = document.getElementById("mrName");
  const inputEmail = document.getElementById("mrEmail");
  const inputPhone = document.getElementById("mrPhone");
  // Assigned Manager removed - no input element
  const inputTerritory = document.getElementById("mrTerritory");
  const inputPassword = document.getElementById("mrPassword");

  // profile modal fields (present in your HTML)
  const profileNameEl = document.getElementById("profileName");
  const profileEmailEl = document.getElementById("profileEmail");

  // prefer API-first; localStorage is only a fallback
  let defaultMrs = [];

  // mrs will be the working array (loaded from localStorage or default)
  let mrs = [];

  /* =========================
     Persistence helpers
     ========================= */
  function loadMRsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MRS);
      if (!raw) {
        mrs = [];
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        mrs = [];
      } else {
        mrs = parsed;
      }
    } catch (err) {
      console.warn("Error reading MR data from storage, using defaults.", err);
      mrs = [];
    }
  }

  function saveMRsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_MRS, JSON.stringify(mrs));
    } catch (err) {
      console.error("Failed to save MR data to localStorage:", err);
    }
  }

  // API retry banner for when backend is unreachable
  function showApiRetryBanner() {
    if (document.getElementById("mrApiRetryBanner")) return;
    const banner = document.createElement("div");
    banner.id = "mrApiRetryBanner";
    banner.className = "alert alert-warning text-center";
    banner.style.margin = "10px 0";
    banner.innerHTML = '<strong>MRs API unreachable.</strong> Some actions will use local data. ' +
      '<button id="mrApiRetryBtn" class="btn btn-sm btn-outline-primary ms-2">Retry</button>';
    const container = document.querySelector(".container") || document.body;
    container.insertBefore(banner, container.firstChild);
    document.getElementById("mrApiRetryBtn").addEventListener("click", async function () {
      hideApiRetryBanner();
      try {
        await refreshMrsFromApiOrFallback();
        renderMRs();
      } catch (e) {
        showApiRetryBanner();
      }
    });
  }

  function hideApiRetryBanner() {
    const b = document.getElementById("mrApiRetryBanner");
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  /* =========================
     Paging / rendering config
     ========================= */
  const itemsPerPage = 5;
  let currentPage = 1;
  let editId = null; // null => add mode; number => edit mode
  let currentFilter = null; // store filtered array when searching
  let isSubmitting = false;

  /* =========================
     Utilities
     ========================= */
  function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showAlert(msg) {
    alert(msg);
  }

  /* =========================
     Validation
     ========================= */
  function validateMRForm() {
    const name = inputName.value.trim();
    const email = inputEmail.value.trim();
    const phone = inputPhone.value.trim();
    const territory = inputTerritory.value.trim();
    const password = inputPassword.value.trim();

    const nameRegex = /^[A-Za-z\s]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;

    const emailExists = mrs.some(m => m.email.toLowerCase() === email.toLowerCase() && m.id !== editId);
    if (emailExists) {
      showAlert("⚠️ An MR with this email address already exists in your list.");
      return false;
    }

    if (!name || !email || !phone || !territory || (editId === null && !password)) {
      showAlert("⚠️ Please fill all fields before saving.");
      return false;
    }
    if (!nameRegex.test(name)) {
      showAlert("⚠️ Name should contain only letters and spaces.");
      return false;
    }
    if (!emailRegex.test(email)) {
      showAlert("⚠️ Enter a valid email.");
      return false;
    }
    if (!phoneRegex.test(phone)) {
      showAlert("⚠️ Phone number must be 10 digits.");
      return false;
    }
    if (!nameRegex.test(territory)) {
      showAlert("⚠️ Territory should contain only letters and spaces.");
      return false;
    }
    if (password && password.length < 5) {
      showAlert("⚠️ Password must be at least 5 characters.");
      return false;
    }

    return true;
  }

  /* =========================
     Render table + pagination
     (Note: Manager column is NOT rendered here)
     ========================= */
  function renderMRs(filtered = null) {
    const source = filtered || mrs;
    currentFilter = filtered;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = source.slice(start, end);

    if (!mrTable) return;

    mrTable.innerHTML = pageData
      .map((m, i) => {
        const realIndex = i + start;
        // we intentionally DO NOT render manager column here
        return `
          <tr>
            <td>${escapeHtml(m.name)}</td>
            <td>${escapeHtml(m.email)}</td>
            <td>${escapeHtml(m.phone || '')}</td>
            <td>${escapeHtml(m.territory || '')}</td>
            <td>
              <button class="btn btn-sm btn-outline-success me-2" onclick="callMR(${m.id})" title="Call"><i class="bi bi-telephone"></i></button>
              <button class="btn btn-sm btn-outline-primary me-2" onclick="editMR(${m.id})" title="Edit"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteMR(${m.id})" title="Delete"><i class="bi bi-trash"></i></button>
            </td>
          </tr>
        `;
      })
      .join("");

    renderPagination(source.length);
  }

  function renderPagination(totalItems) {
    if (!pagination) return;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    pagination.innerHTML = "";

    if (totalPages <= 1) return;

    // Previous
    const prevLi = document.createElement("li");
    prevLi.className = "page-item " + (currentPage === 1 ? "disabled" : "");
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="prev">Previous</a>`;
    pagination.appendChild(prevLi);

    for (let i = 1; i <= totalPages; i++) {
      const li = document.createElement("li");
      li.className = "page-item " + (i === currentPage ? "active" : "");
      li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
      pagination.appendChild(li);
    }

    // Next
    const nextLi = document.createElement("li");
    nextLi.className = "page-item " + (currentPage === totalPages ? "disabled" : "");
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="next">Next</a>`;
    pagination.appendChild(nextLi);

    // attach click handlers
    pagination.querySelectorAll(".page-link").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const v = btn.dataset.page;
        const totalPagesNow = Math.ceil(totalItems / itemsPerPage);
        if (v === "prev" && currentPage > 1) currentPage--;
        else if (v === "next" && currentPage < totalPagesNow) currentPage++;
        else if (!isNaN(v)) currentPage = parseInt(v, 10);
        renderMRs(currentFilter || null);
      });
    });
  }

  /* =========================
     Form handling (Add / Edit)
     ========================= */
  const defaultSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) {
      console.log("Submit blocked: already in progress.");
      return;
    }

    if (!validateMRForm()) return;

    // Immediately lock
    isSubmitting = true;

    const saveBtn = mrForm.querySelector('button[type="submit"]');
    const originalBtnText = saveBtn ? saveBtn.innerHTML : "Save";

    const setSubmittingState = (val) => {
      isSubmitting = val;
      if (saveBtn) {
        saveBtn.disabled = val;
        saveBtn.innerHTML = val ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...' : originalBtnText;
      }
    };

    setSubmittingState(true);

    const newMR = {
      name: inputName.value.trim(),
      email: inputEmail.value.trim(),
      phone: inputPhone.value.trim(),
      territory: inputTerritory.value.trim(),
      password: inputPassword.value.trim(),
    };

    (async function () {
      try {
        console.log("[MR] Attempting to save MR. API Mode:", mrsApiMode);
        if (mrsApiMode) {
          if (editId === null) {
            newMR.manager = localStorage.getItem("signup_name") || "";
            console.log("[MR] Creating new MR:", newMR);
            const result = await createMrApi(newMR);
            console.log("[MR] Create API response:", result);
          } else {
            const existing = mrs.find(m => m.id === editId);
            if (!existing) throw new Error("MR not found");
            newMR.id = existing.id;
            newMR.manager = existing.manager || localStorage.getItem("signup_name") || "";
            console.log("[MR] Updating MR:", newMR);
            const result = await updateMrApi(existing.id, newMR);
            console.log("[MR] Update API response:", result);
          }
          console.log("[MR] Refreshing MR list from API");
          await refreshMrsFromApiOrFallback();
        } else {
          console.warn("[MR] API mode is OFF - saving to localStorage only!");
          // Local fallback mode
          if (editId === null) {
            newMR.id = Date.now();
            newMR.manager = localStorage.getItem("signup_name") || "";
            mrs.push(newMR);
            saveMRsToStorage();
            currentPage = Math.ceil(mrs.length / itemsPerPage);
          } else {
            const idx = mrs.findIndex(m => m.id === editId);
            if (idx !== -1) {
              const existing = mrs[idx];
              newMR.id = existing.id;
              newMR.manager = existing.manager || localStorage.getItem("signup_name") || "";
              mrs[idx] = newMR;
              saveMRsToStorage();
            }
          }
        }

        renderMRs(currentFilter || null);
        const modalEl = document.getElementById("mrModal");
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        mrForm.reset();
        editId = null;

      } catch (err) {
        console.error("[MR] Save error:", err);
        let errorMsg = err.message || "An unknown error occurred.";

        // Try to distinguish network error from validation/server error
        if (err instanceof TypeError || errorMsg.includes("Failed to fetch")) {
          showAlert("Network error: Could not reach the server. Please check if the backend is running at ");
          console.error("[MR] Network error detected - NOT switching to offline mode to allow retry");
          // Don't set mrsApiMode = false here - let user retry
        } else {
          // This is likely a 400 or 409 from our backend
          showAlert("Error: " + errorMsg);
        }
      } finally {
        setSubmittingState(false);
      }
    })();
  };

  // attach submit listener safely
  if (mrForm) {
    mrForm.addEventListener("submit", defaultSubmit);
  }

  /* =========================
     Edit / Delete / Call (global)
     ========================= */
  window.editMR = (id) => {
    const m = mrs.find(x => x.id === id);
    if (!m) return showAlert("MR not found.");

    editId = id;
    inputName.value = m.name;
    inputEmail.value = m.email;
    inputPhone.value = m.phone;
    // Assigned Manager removed - not set into modal
    inputTerritory.value = m.territory;
    inputPassword.value = "";

    const modalEl = document.getElementById("mrModal");
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();

    const modalTitle = document.querySelector("#mrModal .modal-title");
    if (modalTitle) modalTitle.textContent = "Edit MR";

    if (inputEmail) inputEmail.disabled = true;
  };

  window.deleteMR = (id) => {
    const existing = mrs.find(x => x.id === id);
    if (!existing) return;
    if (confirm("Delete this MR?")) {
      (async function () {
        if (mrsApiMode && existing.id) {
          try {
            await deleteMrApi(existing.id);
            await refreshMrsFromApiOrFallback();
            const totalPages = Math.max(1, Math.ceil(mrs.length / itemsPerPage));
            if (currentPage > totalPages) currentPage = totalPages;
            renderMRs(currentFilter || null);
            return;
          } catch (e) {
            console.warn("MR delete API failed. Falling back to localStorage.", e);
            mrsApiMode = false;
          }
        }

        const idx = mrs.findIndex(x => x.id === id);
        if (idx !== -1) {
          mrs.splice(idx, 1);
          saveMRsToStorage();
        }
        const totalPages = Math.max(1, Math.ceil(mrs.length / itemsPerPage));
        if (currentPage > totalPages) currentPage = totalPages;
        renderMRs(currentFilter || null);
      })();
    }
  };

  window.callMR = (id) => {
    const m = mrs.find(x => x.id === id);
    if (!m) return showAlert("MR not found.");
    const phone = (m.phone || "").trim();
    if (!phone) {
      return showAlert("Phone number not available for this MR.");
    }
    const phoneNormalized = phone.replace(/[\s()-]/g, "");
    if (confirm(`Call ${m.name} at ${phoneNormalized}?`)) {
      window.location.href = `tel:${phoneNormalized}`;
    }
  };

  /* =========================
     Search & Reset form
     (search no longer checks manager)
     ========================= */
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const keyword = e.target.value.toLowerCase().trim();
      if (!keyword) {
        currentFilter = null;
        currentPage = 1;
        renderMRs();
        return;
      }

      const filtered = mrs.filter(
        (m) =>
          (m.name && m.name.toLowerCase().includes(keyword)) ||
          (m.email && m.email.toLowerCase().includes(keyword)) ||
          (m.phone && m.phone.toLowerCase().includes(keyword)) ||
          (m.territory && m.territory.toLowerCase().includes(keyword))
      );

      currentPage = 1;
      renderMRs(filtered);
    });
  }

  if (addMRBtn) {
    addMRBtn.addEventListener("click", () => {
      if (mrForm) mrForm.reset();
      editId = null;
      const modalTitle = document.querySelector("#mrModal .modal-title");
      if (modalTitle) modalTitle.textContent = "Add MR";

      if (inputEmail) inputEmail.disabled = false;
    });
  }

  /* =========================
     Password show/hide
     ========================= */
  togglePassword?.addEventListener("click", () => {
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    togglePassword.classList.toggle("bi-eye");
    togglePassword.classList.toggle("bi-eye-slash");
  });

  /* =========================
     Notifications populator (from your previous file)
     ========================= */
  const notificationsList = document.getElementById("notificationsList");
  if (notificationsList) {
    const recentActivities = [
      { icon: "bi-person-plus", iconClass: "bg-primary", title: "New MR Assigned", description: "Sneha Patel assigned to Central Delhi region", time: "2 hours ago" },
      { icon: "bi-currency-rupee", iconClass: "bg-success", title: "Sales Target Achieved", description: "Rajesh Kumar achieved 112% of monthly target", time: "4 hours ago" },
      { icon: "bi-hospital", iconClass: "bg-info", title: "Doctor Visit Completed", description: "15 doctor visits completed today", time: "6 hours ago" },
      { icon: "bi-bell", iconClass: "bg-warning", title: "Meeting Reminder", description: "Team meeting scheduled for tomorrow 10 AM", time: "8 hours ago" },
      { icon: "bi-box-seam", iconClass: "bg-secondary", title: "Sample Stock Updated", description: "Diabetex 500mg stock replenished", time: "1 day ago" }
    ];
    const alertsData = [
      { icon: "bi-exclamation-triangle", iconClass: "bg-danger", title: "Low Stock Alert", description: "CardioCare 10mg running low in North Delhi", type: "urgent", time: "1 hour ago" },
      { icon: "bi-calendar-x", iconClass: "bg-warning", title: "Pending Approvals", description: "12 expense reports awaiting your approval", type: "warning", time: "3 hours ago" },
      { icon: "bi-graph-down", iconClass: "bg-info", title: "Performance Alert", description: "Manish Patel below 80% target achievement", type: "info", time: "5 hours ago" },
      { icon: "bi-check-circle", iconClass: "bg-success", title: "Task Completed", description: "Monthly report submitted successfully", type: "success", time: "1 day ago" }
    ];
    const allNotifications = [
      ...alertsData.map(a => ({ ...a, kind: 'alert' })),
      ...recentActivities.map(a => ({ ...a, kind: 'activity' }))
    ];

    notificationsList.innerHTML = allNotifications.slice(0, 10).map(notification => `
      <div class="notification-item p-3 border-bottom">
        <div class="d-flex align-items-start">
          <div class="notification-icon ${notification.iconClass || 'bg-primary'} text-white me-3" style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:6px;">
            <i class="bi ${notification.icon}"></i>
          </div>
          <div class="flex-grow-1">
            <h6 class="mb-1">${escapeHtml(notification.title)}</h6>
            <p class="mb-1 text-muted small">${escapeHtml(notification.description)}</p>
            <small class="text-muted">${escapeHtml(notification.time || 'Just now')}</small>
          </div>
        </div>
      </div>
    `).join('');
  }

  /* =========================
     Profile name/email load
     ========================= */
  if (profileNameEl && profileEmailEl) {
    profileNameEl.textContent = localStorage.getItem("signup_name") || "Admin User";
    profileEmailEl.textContent = localStorage.getItem("signup_email") || "admin@kavyapharm.com";
  }

  /* =========================
     Chart (optional) - uses Chart.js if present and element exists
     ========================= */
  const chartEl = document.getElementById("mrPerformanceChart");
  if (chartEl && typeof Chart !== "undefined") {
    try {
      const ctx = chartEl.getContext("2d");
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: mrs.map((m) => m.name.split(" ")[0]),
          datasets: [
            { label: "Sales", data: mrs.map((m) => Number(m.sales) || 0), backgroundColor: undefined },
            { label: "Performance", data: mrs.map((m) => Number(m.performance) || 0), backgroundColor: undefined }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    } catch (err) { console.warn("Chart error:", err); }
  }

  /* =========================
     INITIAL LOAD + RENDER
     ========================= */
  loadMRsFromStorage();
  (async function () {
    await refreshMrsFromApiOrFallback();
    renderMRs();
  })();
});
