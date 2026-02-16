document.addEventListener("DOMContentLoaded", function () {
  const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? (window.location.port === "8080" ? "" : "http://localhost:8080")
    : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");
  const USERS_API_BASE = `${API_BASE}/api/users`;

  const userTableBody = document.getElementById("userTableBody");
  const searchInput = document.getElementById("userSearchInput");
  const saveUserBtn = document.getElementById("saveUserBtn");
  const roleFilterButtons = document.getElementById("roleFilterButtons");
  const paginationNav = document.querySelector(".pagination");
  const addUserModalEl = document.getElementById("addUserModal");
  const viewUserDetailsBody = document.getElementById("viewUserDetailsBody");
  const viewUserModalLabel = document.getElementById("viewUserModalLabel");

  const addUserModal = new bootstrap.Modal(addUserModalEl);
  const viewUserModal = new bootstrap.Modal(document.getElementById("viewUserModal"));

  let allUsers = [];
  let filteredUsers = [];
  let currentPage = 1;
  const ROWS_PER_PAGE = 10;
  let activeFilterRole = "All";
  let editingUserId = null;
  let allManagers = []; // To store list of managers for dropdowns

  // --- Auth Helpers ---
  function getAuthHeader() {
    const token = localStorage.getItem("kavya_auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function apiRequest(url, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(options.headers || {}),
    };
    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Error ${response.status}`);
      }
      if (response.status === 204) return null;
      return await response.json();
    } catch (error) {
      console.error("API Request Failed:", error);
      throw error;
    }
  }

  // --- Role Mappings ---
  function apiRoleToUiRole(role) {
    const r = String(role || "").toUpperCase();
    if (r === "ADMIN") return "Admin";
    if (r === "HR") return "HR";
    if (r === "MANAGER") return "Area Manager";
    if (r === "MR") return "Medical Rep";
    if (r === "DOCTOR") return "Doctor";
    if (r === "SUPERADMIN") return "Super Admin";
    return role;
  }

  function uiRoleToApiRole(uiRole) {
    const r = String(uiRole || "").toLowerCase();
    if (r === "admin") return "ADMIN";
    if (r === "hr") return "HR";
    if (r === "area manager") return "MANAGER";
    if (r === "medical rep") return "MR";
    if (r === "doctor") return "DOCTOR";
    if (r === "super admin") return "SUPERADMIN";
    return "MR";
  }

  // --- Core CRUD ---
  async function fetchUsers() {
    try {
      userTableBody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"></div></td></tr>';
      const data = await apiRequest(USERS_API_BASE);
      allUsers = data;
      applyFilters();
    } catch (error) {
      userTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load users: ${error.message}</td></tr>`;
    }
  }

  async function fetchManagers() {
    try {
      // Use role=MANAGER query param if backend supports it, otherwise filter all users
      const data = await apiRequest(`${USERS_API_BASE}?role=MANAGER`);
      allManagers = data;
      populateManagerDropdowns();
    } catch (error) {
      console.error("Failed to load managers for dropdown:", error);
    }
  }

  function populateManagerDropdowns() {
    const mrAssignedManagerSelect = document.getElementById("mrAssignedManager");
    if (!mrAssignedManagerSelect) return;

    // Keep the "Select Manager" option
    mrAssignedManagerSelect.innerHTML = '<option value="">Select Manager</option>';

    allManagers.forEach(mgr => {
      const option = document.createElement("option");
      // Use name as identifier as required by Manager Dashboard mrs.js logic
      option.value = mgr.name;
      option.textContent = `${mgr.name} (${mgr.email})`;
      mrAssignedManagerSelect.appendChild(option);
    });
  }

  function applyFilters() {
    const term = searchInput.value.toLowerCase().trim();

    filteredUsers = allUsers.filter(u => {
      // Security: Hide Admin and Super Admin accounts from Regional Admin view
      const role = String(u.role || "").toUpperCase();
      if (role === "ADMIN" || role === "SUPERADMIN") return false;

      // Role Filter
      let roleMatches = true;
      if (activeFilterRole !== "All") {
        const activeRoles = activeFilterRole.split(",");
        const uiRole = apiRoleToUiRole(u.role);
        roleMatches = activeRoles.some(r => uiRole.toLowerCase().includes(r.toLowerCase()));
      }

      // Search Filter
      const searchMatches =
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.territory && u.territory.toLowerCase().includes(term)) ||
        apiRoleToUiRole(u.role).toLowerCase().includes(term);

      return roleMatches && searchMatches;
    });

    currentPage = 1;
    renderTable();
  }

  function renderTable() {
    userTableBody.innerHTML = "";
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const pageData = filteredUsers.slice(start, end);

    if (pageData.length === 0) {
      userTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No users found.</td></tr>';
      renderPagination();
      return;
    }

    pageData.forEach(u => {
      const uiRole = apiRoleToUiRole(u.role);
      const territory = u.role === "DOCTOR" && u.territory && u.territory.includes("|")
        ? u.territory.split("|")[1]
        : (u.territory || "\u2014");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td><strong>${uiRole}</strong></td>
        <td>${territory}</td>
        <td><span class="badge ${u.status === 'ACTIVE' ? 'bg-success' : 'bg-warning'}">${u.status || 'ACTIVE'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-success view-btn" data-id="${u.id}"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-outline-info edit-btn" data-id="${u.id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${u.id}"><i class="bi bi-trash"></i></button>
        </td>
      `;
      userTableBody.appendChild(tr);
    });

    // Event Listeners for buttons
    userTableBody.querySelectorAll(".view-btn").forEach(btn => btn.addEventListener("click", () => showUserDetails(btn.dataset.id)));
    userTableBody.querySelectorAll(".edit-btn").forEach(btn => btn.addEventListener("click", () => openEditModal(btn.dataset.id)));
    userTableBody.querySelectorAll(".delete-btn").forEach(btn => btn.addEventListener("click", () => deleteUser(btn.dataset.id)));

    renderPagination();
  }

  function renderPagination() {
    paginationNav.innerHTML = "";
    const totalPages = Math.ceil(filteredUsers.length / ROWS_PER_PAGE);
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
      const li = document.createElement("li");
      li.className = `page-item ${i === currentPage ? "active" : ""}`;
      li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      li.addEventListener("click", (e) => {
        e.preventDefault();
        currentPage = i;
        renderTable();
      });
      paginationNav.appendChild(li);
    }
  }

  // --- Actions ---
  async function showUserDetails(id) {
    const user = allUsers.find(u => String(u.id) === String(id));
    if (!user) return;

    viewUserModalLabel.textContent = `${apiRoleToUiRole(user.role)} Details`;
    let detailsHtml = `
      <div class="list-group list-group-flush bg-dark">
        <div class="list-group-item bg-dark text-white d-flex justify-content-between"><span>ID:</span> <strong>${user.id}</strong></div>
        <div class="list-group-item bg-dark text-white d-flex justify-content-between"><span>Name:</span> <strong>${user.name}</strong></div>
        <div class="list-group-item bg-dark text-white d-flex justify-content-between"><span>Email:</span> <strong>${user.email}</strong></div>
        <div class="list-group-item bg-dark text-white d-flex justify-content-between"><span>Role:</span> <strong>${apiRoleToUiRole(user.role)}</strong></div>
        <div class="list-group-item bg-dark text-white d-flex justify-content-between"><span>Phone:</span> <strong>${user.phone || "\u2014"}</strong></div>
        <div class="list-group-item bg-dark text-white d-flex justify-content-between"><span>Territory:</span> <strong>${user.territory || "\u2014"}</strong></div>
        <div class="list-group-item bg-dark text-white d-flex justify-content-between"><span>Status:</span> <strong>${user.status || "ACTIVE"}</strong></div>
        <div class="list-group-item bg-dark text-white d-flex justify-content-between"><span>Last Login:</span> <strong>${user.lastLogin || "\u2014"}</strong></div>
      </div>
    `;
    viewUserDetailsBody.innerHTML = detailsHtml;
    viewUserModal.show();
  }

  function openEditModal(id) {
    const user = allUsers.find(u => String(u.id) === String(id));
    if (!user) return;

    editingUserId = id;
    const uiRole = apiRoleToUiRole(user.role);

    // Set title and button text
    document.getElementById("addUserModalLabel").textContent = "Edit User";
    saveUserBtn.textContent = "Update User";

    // Show role selection
    const roleContainer = document.getElementById("roleSelectionContainer");
    if (roleContainer) roleContainer.style.display = "flex";

    // 1. Find the correct button and CLICK IT FIRST (to trigger form switching logic)
    let btnId = "";
    if (uiRole === "Area Manager") btnId = "managerBtn";
    else if (uiRole === "Medical Rep") btnId = "mrBtn";
    else if (uiRole === "Doctor") btnId = "doctorBtn";
    else if (uiRole === "HR") btnId = "hrBtn";

    const targetBtn = document.getElementById(btnId);
    if (targetBtn) {
      targetBtn.click(); // This sets display = 'block' on the form
    }

    // 2. DISABLE buttons after clicking so they can't be changed, but one remains active
    if (roleContainer) {
      roleContainer.querySelectorAll("button").forEach(btn => btn.disabled = true);
    }

    // 3. Fallback: Force form display just in case click() didn't propagate or was blocked
    const formId = btnId ? btnId.replace("Btn", "Form") : null;
    if (formId) {
      const directForm = document.getElementById(formId);
      if (directForm) {
        // Hide all first
        document.querySelectorAll(".user-form").forEach(f => f.style.display = "none");
        // Show target
        directForm.style.display = "block";
      }
    }

    // Now populate the active form
    const activeForm = Array.from(document.querySelectorAll(".user-form")).find(f => f.style.display === "block");
    if (activeForm) {
      const prefix = activeForm.id.replace("Form", "");
      if (document.getElementById(`${prefix}Name`)) document.getElementById(`${prefix}Name`).value = user.name || "";
      if (document.getElementById(`${prefix}Email`)) {
        document.getElementById(`${prefix}Email`).value = user.email || "";
        document.getElementById(`${prefix}Email`).disabled = true; // Email usually non-editable
      }
      if (document.getElementById(`${prefix}Phone`)) document.getElementById(`${prefix}Phone`).value = user.phone || "";
      if (document.getElementById(`${prefix}Territory`)) document.getElementById(`${prefix}Territory`).value = user.territory || "";

      // Clear password for security (don't pre-fill)
      if (document.getElementById(`${prefix}Password`)) document.getElementById(`${prefix}Password`).value = "";

      if (uiRole === "Medical Rep" || uiRole === "MR") {
        const mgrSelect = document.getElementById("mrAssignedManager");
        if (mgrSelect) {
          const val = (user.assignedManager || "").trim();
          // First, check if the exact value already exists in the dropdown (it's usually the Name)
          let exists = Array.from(mgrSelect.options).some(opt => opt.value === val);

          if (exists) {
            mgrSelect.value = val;
          } else {
            // If not found, look up the manager in our list by Name, Email, or ID
            const target = val.toLowerCase();
            const managerObj = allManagers.find(m =>
              (m.name && m.name.toLowerCase() === target) ||
              (m.email && m.email.toLowerCase() === target) ||
              (m.id && String(m.id) === target)
            );

            if (managerObj) {
              mgrSelect.value = managerObj.name; // Use Name because populateManagerDropdowns uses Name as the value
            } else {
              mgrSelect.value = "";
            }
          }
        }
      }

      if (uiRole === "Doctor") {
        const parts = (user.territory || "").split("|");
        if (document.getElementById("doctorSpeciality")) document.getElementById("doctorSpeciality").value = parts[0] || "";
        if (document.getElementById("doctorCity")) document.getElementById("doctorCity").value = parts[1] || "";
        if (document.getElementById("doctorAssignedMr")) document.getElementById("doctorAssignedMr").value = parts[2] || "";
        if (document.getElementById("doctorType")) document.getElementById("doctorType").value = parts[3] || "";
      }
    }

    addUserModal.show();
  }

  async function deleteUser(id) {
    if (!confirm("Delete this user?")) return;
    try {
      await apiRequest(`${USERS_API_BASE}/${id}`, { method: "DELETE" });
      fetchUsers();
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  }

  saveUserBtn.addEventListener("click", async function () {
    const activeForm = Array.from(document.querySelectorAll(".user-form")).find(f => f.style.display === "block");
    if (!activeForm) return;

    const form = activeForm.querySelector("form");
    const prefix = activeForm.id.replace("Form", "");

    const phone = document.getElementById(`${prefix}Phone`) ? document.getElementById(`${prefix}Phone`).value : "";

    // Phone validation: Must be exactly 10 digits
    if (phone && phone.length !== 10) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }

    const payload = {
      name: document.getElementById(`${prefix}Name`).value,
      email: document.getElementById(`${prefix}Email`).value,
      phone: phone,
      status: "ACTIVE"
    };

    const password = document.getElementById(`${prefix}Password`).value;
    if (password) payload.password = password;

    let uiRole = "";
    if (prefix === "superAdmin") uiRole = "Super Admin";
    else if (prefix === "manager") uiRole = "Area Manager";
    else uiRole = "Medical Rep";

    payload.role = uiRoleToApiRole(uiRole);

    if (prefix === "manager") payload.territory = document.getElementById("managerTerritory").value;
    else if (prefix === "mr") {
      payload.territory = document.getElementById("mrTerritory").value;
      payload.assignedManager = document.getElementById("mrAssignedManager").value;
    } else if (prefix === "doctor") {
      payload.territory = `${document.getElementById("doctorSpeciality").value}|${document.getElementById("doctorCity").value}|${document.getElementById("doctorAssignedMr").value}|${document.getElementById("doctorType").value}`;
    }

    try {
      saveUserBtn.disabled = true;
      saveUserBtn.textContent = "Saving...";

      if (editingUserId) {
        await apiRequest(`${USERS_API_BASE}/${editingUserId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiRequest(USERS_API_BASE, { method: "POST", body: JSON.stringify(payload) });
      }

      addUserModal.hide();
      fetchUsers();
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      saveUserBtn.disabled = false;
      saveUserBtn.textContent = editingUserId ? "Update User" : "Save User";
    }
  });

  // --- UI Interactivity ---
  if (roleFilterButtons) {
    roleFilterButtons.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", function () {
        roleFilterButtons.querySelectorAll("button").forEach(b => {
          b.classList.replace("btn-dark", "btn-outline-dark");
          b.classList.remove("active");
        });
        this.classList.replace("btn-outline-dark", "btn-dark");
        this.classList.add("active");
        activeFilterRole = this.dataset.roleFilter;
        applyFilters();
      });
    });
  }

  searchInput.addEventListener("input", applyFilters);

  // Role buttons switching forms
  const buttons = document.querySelectorAll("#superAdminBtn, #managerBtn, #mrBtn");
  const forms = document.querySelectorAll(".user-form");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      forms.forEach(f => f.style.display = "none");
      document.getElementById(btn.id.replace("Btn", "Form")).style.display = "block";
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Initial Load
  fetchUsers();
  fetchManagers();

  // Reset modal for "Add New User"
  addUserModalEl.addEventListener("show.bs.modal", function (event) {
    const isEdit = event.relatedTarget && event.relatedTarget.classList.contains('edit-btn');
    const isProgrammatic = !event.relatedTarget;

    // If triggered by "Add New User" button or direct show() without editingUserId set
    if (!isEdit && !editingUserId) {
      editingUserId = null;
      const roleContainer = document.getElementById("roleSelectionContainer");
      if (roleContainer) roleContainer.style.display = "flex";

      document.getElementById("addUserModalLabel").textContent = "Create New User";
      saveUserBtn.textContent = "Save User";

      // Reset forms
      const forms = document.querySelectorAll(".user-form form");
      forms.forEach(f => f.reset());

      // Enable email field
      const emailInputs = document.querySelectorAll(".user-form input[type='email']");
      emailInputs.forEach(input => input.disabled = false);

      // Default to first available form (Manager)
      const managerBtn = document.getElementById("managerBtn");
      if (managerBtn) managerBtn.click();
    }
  });

  // Fix for Phone Number: only accept digits and max 10
  const phoneInputs = document.querySelectorAll('input[type="tel"]');
  phoneInputs.forEach(input => {
    input.addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "").slice(0, 10);
    });
  });

  // Reset editing state on hide
  addUserModalEl.addEventListener("hidden.bs.modal", function () {
    editingUserId = null;
    // Re-enable role buttons
    const roleContainer = document.getElementById("roleSelectionContainer");
    if (roleContainer) {
      roleContainer.querySelectorAll("button").forEach(btn => btn.disabled = false);
    }
    // Clear password fields for security
    const passwords = document.querySelectorAll("input[type='password']");
    passwords.forEach(p => p.value = "");
  });
});
