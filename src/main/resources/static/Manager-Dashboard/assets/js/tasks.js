/* ---------------------------
   Top-level Mock Data (accessible to global functions)
   --------------------------- */
// MR list will be loaded from the backend when available. Start empty as fallback.
let mrData = [];
// Doctor list will be loaded from the backend. Start empty as fallback.
let doctorData = [];

// Initial mock data used if nothing is found in localStorage
const initialTasksData = [
  {
    id: 1,
    title: "Visit Dr. Sharma at Apollo Hospital",
    type: "doctor-visit",
    assignedTo: "Rajesh Kumar",
    priority: "high",
    status: "pending",
    dueDate: "2025-11-15",
    location: "Apollo Hospital, Delhi",
    description:
      "Discuss new medication promotion and gather feedback on current products.",
    createdDate: "2025-11-08",
  },
  {
    id: 2,
    title: "Promote new diabetes medication",
    type: "promotion",
    assignedTo: "Priya Sharma",
    priority: "medium",
    status: "in-progress",
    dueDate: "2025-11-20",
    location: "South Delhi Clinics",
    description:
      "Promote the new diabetes medication to 10 doctors in South Delhi region.",
    createdDate: "2025-11-07",
  },
  {
    id: 3,
    title: "Team meeting for Q4 targets",
    type: "meeting",
    assignedTo: "Amit Singh",
    priority: "high",
    status: "completed",
    dueDate: "2025-11-10",
    location: "Head Office Conference Room",
    description:
      "Quarterly review meeting with all MRs to discuss Q4 targets and strategies.",
    createdDate: "2025-11-05",
  },
  {
    id: 4,
    title: "Product training session",
    type: "training",
    assignedTo: "Sneha Patel",
    priority: "medium",
    status: "pending",
    dueDate: "2025-11-18",
    location: "Training Center, Gurgaon",
    description:
      "Training session on new product features and usage guidelines.",
    createdDate: "2025-11-08",
  },
  {
    id: 5,
    title: "Follow-up with Dr. Gupta",
    type: "doctor-visit",
    assignedTo: "Manish Patel",
    priority: "low",
    status: "overdue",
    dueDate: "2025-11-05",
    location: "City Hospital, Delhi",
    description:
      "Follow-up visit to check on patient feedback and restock requirements.",
    createdDate: "2025-11-01",
  },
  {
    id: 6,
    title: "Cardiology promotion campaign",
    type: "promotion",
    assignedTo: "Kavita Jain",
    priority: "high",
    status: "in-progress",
    dueDate: "2025-11-25",
    location: "North Delhi Hospitals",
    description:
      "Launch promotion campaign for new cardiology medications across North Delhi.",
    createdDate: "2025-11-06",
  },
];

let tasksData = []; // This will be populated from localStorage
let filteredTasks = []; // current filtered dataset shown in table

let isBootstrappingTasks = false;

/* ---------------------------
   Pagination configuration
   --------------------------- */
let currentPage = 1;
const pageSize = 5; // change to 10 or make selectable if you want

// const API_BASE = window.location.port === "5500" ? "http://localhost:8080" : "";
const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");

const TASKS_API_BASE = `${API_BASE}/api/tasks`;
const USERS_API_BASE = `${API_BASE}/api/users`;
const DOCTORS_API_BASE = `${API_BASE}/api/doctors`;
let tasksApiMode = true;
let isSubmittingTask = false;

function getAuthHeader() {
  const token = localStorage.getItem("kavya_auth_token") || localStorage.getItem("token");
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

function debounce(fn, waitMs) {
  let t = null;
  return function debounced(...args) {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), waitMs);
  };
}

function toUpdatePayload(task) {
  return {
    title: task.title,
    type: task.type,
    assignedTo: task.assignedTo,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate || null,
    location: task.location || "",
    description: task.description || "",
    clinicName: task.clinicName || "",
    doctorName: task.doctorName || ""
  };
}

async function refreshTasksFromApiOrFallback() {
  // Render free tier cold-starts can take 15-30s; use generous timeout
  const API_TIMEOUT_MS = 30000;
  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[TASK] API fetch attempt ${attempt}/${MAX_RETRIES}...`);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API timeout')), API_TIMEOUT_MS)
      );

      const dataPromise = apiJson(TASKS_API_BASE);
      const data = await Promise.race([dataPromise, timeoutPromise]);

      if (Array.isArray(data)) {
        tasksData = data.map((t) => ({
          id: Number(t.id),
          title: t.title,
          type: t.type,
          assignedTo: t.assignedTo,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate || null,
          location: t.location,
          description: t.description,
          createdDate: t.createdDate,
          clinicName: t.clinicName || "",
          doctorName: t.doctorName || ""
        }));
        saveTasksData();
        filteredTasks = tasksData.slice();
        // Ensure local overdue check runs after loading from server
        updateOverdueTasks();
        tasksApiMode = true;
        // Hide any retry banner if previously shown
        try { hideTasksApiRetryBanner(); } catch (e) { }
        console.log(`[TASK] API fetch succeeded on attempt ${attempt}. Tasks: ${tasksData.length}`);
        return;
      }
      tasksApiMode = false;
    } catch (e) {
      console.warn(`[TASK] API attempt ${attempt} failed:`, e.message);
      if (attempt < MAX_RETRIES) {
        // Brief pause before retry
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      tasksApiMode = false;
      try { showTasksApiRetryBanner(); } catch (err) { }
    }
  }
}

async function createTaskApi(newData) {
  const payload = {
    title: newData.title,
    type: newData.type,
    assignedTo: newData.assignedTo,
    priority: newData.priority,
    dueDate: newData.dueDate || null,
    location: newData.location || "",
    description: newData.description || "",
    clinicName: newData.clinicName || "",
    doctorName: newData.doctorName || ""
  };
  return await apiJson(TASKS_API_BASE, { method: "POST", body: JSON.stringify(payload) });
}

async function updateTaskApi(id, task) {
  return await apiJson(`${TASKS_API_BASE}/${id}`, { method: "PUT", body: JSON.stringify(toUpdatePayload(task)) });
}

async function deleteTaskApi(id) {
  await apiJson(`${TASKS_API_BASE}/${id}`, { method: "DELETE" });
}

/* ---------------------------
   LocalStorage Persistence
   --------------------------- */
function loadTasksData() {
  const storedData = localStorage.getItem("kavyaPharmTasks");
  if (storedData) {
    try {
      tasksData = JSON.parse(storedData);
      // Ensure all task IDs are numbers
      tasksData = tasksData.map((task) => ({
        ...task,
        id: Number(task.id),
      }));
    } catch (e) {
      console.error("Error parsing tasks from localStorage:", e);
      tasksData = [];
    }
  } else {
    // start empty; we'll prefer API-loaded data and use localStorage only as fallback
    tasksData = [];
  }
  // initialize filteredTasks to full dataset
  filteredTasks = tasksData.slice();
}

function saveTasksData() {
  localStorage.setItem("kavyaPharmTasks", JSON.stringify(tasksData));
}

// Tasks API retry banner (shows when backend is unreachable)
function showTasksApiRetryBanner() {
  if (document.getElementById("tasksApiRetryBanner")) return;
  const banner = document.createElement("div");
  banner.id = "tasksApiRetryBanner";
  banner.className = "alert alert-warning text-center";
  banner.style.margin = "10px 0";
  banner.innerHTML = '<strong>Tasks API unreachable.</strong> Some actions will use local data. ' +
    '<button id="tasksApiRetryBtn" class="btn btn-sm btn-outline-primary ms-2">Retry</button>';
  const container = document.querySelector(".container") || document.body;
  container.insertBefore(banner, container.firstChild);
  document.getElementById("tasksApiRetryBtn").addEventListener("click", async function () {
    hideTasksApiRetryBanner();
    try {
      await refreshTasksFromApiOrFallback();
      applyFilters();
    } catch (e) {
      showTasksApiRetryBanner();
    }
  });
}

function hideTasksApiRetryBanner() {
  const b = document.getElementById("tasksApiRetryBanner");
  if (b && b.parentNode) b.parentNode.removeChild(b);
}

/* ---------------------------
   Utilities
   --------------------------- */
function parseDateSafely(dateString) {
  if (!dateString) return null;

  let d;
  // Handle ISO format yyyy-mm-dd
  if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [y, m, d_part] = dateString.split("-").map((n) => Number(n));
    // Use local noon to avoid UTC midnight shifts and DST edge cases
    d = new Date(y, m - 1, d_part, 12, 0, 0, 0);
  } else {
    // Fallback for other formats (like dd-mm-yyyy or slash-separated)
    // Replace hyphens with slashes for better cross-browser compatibility with non-ISO formats
    d = new Date(String(dateString).replace(/-/g, "/"));
  }

  if (isNaN(d.getTime())) return null;
  return d;
}

function formatDate(dateString) {
  const due = parseDateSafely(dateString);
  if (!due) return dateString || "No Due Date";

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((dueStart - todayStart) / msPerDay);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1) return `${diffDays} Days Remaining`;

  // For past dates, show the actual date instead of negative relative text
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${due.getDate()} ${months[due.getMonth()]} ${due.getFullYear()}`;
}
function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function uid() {
  return "id_" + Math.random().toString(36).slice(2, 10);
}
function showToast(title, message, delay = 2500) {
  // simple toast implementation using Bootstrap toasts
  const containerId = "__task_toast_container";
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.className = "toast-container position-fixed top-0 end-0 p-3";
    document.body.appendChild(container);
  }
  const tId = uid();
  const el = document.createElement("div");
  el.className = "toast";
  el.id = tId;
  el.role = "alert";
  el.ariaLive = "assertive";
  el.ariaAtomic = "true";
  el.innerHTML = `
      <div class="toast-header">
        <strong class="me-auto">${escapeHtml(title)}</strong>
        <button type="button" class="btn-close ms-2 mb-1" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">${escapeHtml(message)}</div>
    `;
  container.appendChild(el);
  const toast = new bootstrap.Toast(el, { delay });
  toast.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

/* ---------------------------
   Modal fallback creators (edit modal and status modal)
   --------------------------- */
function ensureEditTaskModalExists() {
  // We'll reuse #createTaskModal if exists. Otherwise create a small edit modal.
  if (document.getElementById("createTaskModal")) return; // assume create modal already exists
  if (document.getElementById("editTaskModal")) return;

  const html = `
    <div class="modal fade" id="editTaskModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Edit Task</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="editTaskForm">
              <input type="hidden" id="editTask_id" />
              <div class="mb-2">
                <label class="form-label">Title</label>
                <input id="editTask_title" class="form-control" required />
              </div>
              <div class="row g-2">
                <div class="col-md-6">
                  <label class="form-label">Type</label>
                  <select id="editTask_type" class="form-select">
                    <option value="doctor-visit">Doctor Visit</option>
                    <option value="promotion">Promotion</option>
                    <option value="meeting">Meeting</option>
                    <option value="training">Training</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Assigned To</label>
                  <select id="editTask_assignedTo" class="form-select"></select>
                </div>
              </div>
              <div class="row g-2 mt-2">
                <div class="col-md-4">
                  <label class="form-label">Priority</label>
                  <select id="editTask_priority" class="form-select">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Status</label>
                  <select id="editTask_status" class="form-select">
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Due Date</label>
                  <input id="editTask_dueDate" type="date" class="form-control" />
                </div>
              </div>
              <div class="mb-2 mt-2">
                <label class="form-label">Location</label>
                <input id="editTask_location" class="form-control" />
              </div>
              <div class="mb-2">
                <label class="form-label">Description</label>
                <textarea id="editTask_description" rows="3" class="form-control"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button id="editTaskSaveBtn" class="btn btn-primary">Save Changes</button>
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          </div>
        </div>
      </div>
    </div>
    `;
  document.body.insertAdjacentHTML("beforeend", html);

  // populate assignedTo select on modal open and wire save handler
  document.getElementById("editTaskSaveBtn").addEventListener("click", () => {
    const form = document.getElementById("editTaskForm");
    if (!form) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const id = Number(document.getElementById("editTask_id").value);
    const task = tasksData.find((t) => t.id === id);
    if (!task) {
      showToast("Error", "Task not found.");
      bootstrap.Modal.getInstance(
        document.getElementById("editTaskModal")
      ).hide();
      return;
    }
    // update fields
    task.title = document.getElementById("editTask_title").value;
    task.type = document.getElementById("editTask_type").value;
    task.assignedTo = document.getElementById("editTask_assignedTo").value;
    task.priority = document.getElementById("editTask_priority").value;
    task.status = document.getElementById("editTask_status").value;
    task.dueDate = document.getElementById("editTask_dueDate").value || null;
    task.location = document.getElementById("editTask_location").value;
    task.description = document.getElementById("editTask_description").value;

    (async function () {
      if (tasksApiMode) {
        try {
          await updateTaskApi(id, task);
          await refreshTasksFromApiOrFallback();
        } catch (e) {
          console.warn("Task update API failed. Falling back to localStorage.", e);
          tasksApiMode = false;
        }
      }

      // *** PERSISTENCE CHANGE: Save to localStorage ***
      saveTasksData();
      // re-render UI (apply filters if active)
      applyFilters();
      showToast("Saved", "Task updated successfully.");
      bootstrap.Modal.getInstance(
        document.getElementById("editTaskModal")
      ).hide();
    })();
  });
}

function ensureStatusModalExists() {
  if (document.getElementById("updateStatusModal")) return;
  const html = `
    <div class="modal fade" id="updateStatusModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Update Task Status</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="updateStatus_taskId" />
            <div class="mb-2">
              <label class="form-label">New Status</label>
              <select id="updateStatus_select" class="form-select">
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button id="updateStatusSaveBtn" class="btn btn-primary">Update</button>
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          </div>
        </div>
      </div>
    </div>
    `;
  document.body.insertAdjacentHTML("beforeend", html);

  document
    .getElementById("updateStatusSaveBtn")
    .addEventListener("click", () => {
      const id = Number(document.getElementById("updateStatus_taskId").value);
      const newStatus = document.getElementById("updateStatus_select").value;
      const task = tasksData.find((t) => t.id === id);
      if (!task) {
        showToast("Error", "Task not found.");
        bootstrap.Modal.getInstance(
          document.getElementById("updateStatusModal")
        ).hide();
        return;
      }

      const currentStatus = normalizeTaskStatus(task.status);
      const nextStatus = normalizeTaskStatus(newStatus);
      if (currentStatus === "overdue" && nextStatus !== "completed" && nextStatus !== "overdue") {
        showToast("Read-only", "Overdue tasks can only be marked as Completed.");
        return;
      }
      task.status = newStatus;

      (async function () {
        if (tasksApiMode) {
          try {
            await updateTaskApi(id, task);
            await refreshTasksFromApiOrFallback();
          } catch (e) {
            console.warn("Task status update API failed. Falling back to localStorage.", e);
            tasksApiMode = false;
          }
        }

        // *** PERSISTENCE Change: Save to localStorage ***
        saveTasksData();

        // re-render UI (apply filters if active)
        applyFilters();
        showToast("Updated", `Status updated to "${newStatus}".`);
        bootstrap.Modal.getInstance(
          document.getElementById("updateStatusModal")
        ).hide();
      })();
    });
}

/* ---------------------------
   Auto-update overdue tasks
   --------------------------- */
function updateOverdueTasks() {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let updatedCount = 0;

  tasksData.forEach(task => {
    const currentStatus = normalizeTaskStatus(task.status);
    if (task.dueDate && currentStatus !== 'completed') {
      const dueDate = parseDateSafely(task.dueDate);
      if (!dueDate) return;

      const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

      // Mark as overdue if the due date is strictly before today
      if (dueStart < todayStart) {
        if (currentStatus !== 'overdue') {
          task.status = 'overdue';
          updatedCount++;
        }
      } else {
        // If due date is today or in the future, ensure it's not marked as overdue
        if (currentStatus === 'overdue') {
          task.status = 'pending';
          updatedCount++;
        }
      }
    }
  });

  if (updatedCount > 0) {
    saveTasksData();
    // Update filtered tasks and re-render
    filteredTasks = tasksData.slice();
    if (!isBootstrappingTasks) {
      applyFilters();
    }
    console.log(`[TASK] Overdue check sync: updated ${updatedCount} tasks.`);
  }
}

/* ---------------------------
   Rendering & Helpers
   --------------------------- */
function populateMRDropdown(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Select MR";
  selectEl.appendChild(defaultOpt);
  mrData.forEach((mr) => {
    const opt = document.createElement("option");
    opt.value = mr.email; // Use email as the identifier for backend
    opt.textContent = mr.name; // Keep name for visibility
    selectEl.appendChild(opt);
  });
}

// Fetch MR list from backend users API (role == 'MR') and populate mrData
async function refreshMrList() {
  try {
    let userObj = {};
    try {
      userObj = JSON.parse(localStorage.getItem("kavya_user") || "{}");
    } catch (e) { }

    const currentName = userObj.name || localStorage.getItem("signup_name") || "";
    const currentEmail = userObj.email || localStorage.getItem("signup_email") || "";

    console.log("[TASK] Fetching MRs for manager:", currentName || currentEmail);
    let users = await apiJson(`${USERS_API_BASE}?manager=${encodeURIComponent(currentName || currentEmail)}&role=MR`);

    if ((!users || users.length === 0) && currentName && currentEmail && currentName !== currentEmail) {
      console.log("[TASK] First query empty, trying email fallback query...");
      users = await apiJson(`${USERS_API_BASE}?manager=${encodeURIComponent(currentEmail)}&role=MR`);
    }

    if (Array.isArray(users)) {
      // Since the backend is now secure and robustly filters by manager identity (Name or Email),
      // we only need to verify that the role is MR.
      mrData = users
        .filter((u) => u && u.role && String(u.role).toUpperCase().includes("MR"))
        .map((u) => ({ id: Number(u.id), name: u.name, email: u.email, territory: u.territory || "" }));

      console.log("[TASK] Successfully loaded", mrData.length, "MRs for task assignment");
      try { hideTasksApiRetryBanner(); } catch (e) { }
      return;
    }
  } catch (e) {
    console.warn("[TASK] Could not load MR list from API, using local fallback.", e);
    try { showTasksApiRetryBanner(); } catch (err) { }
  }
}

// Fetch doctors from backend and store in doctorData
async function refreshDoctorList() {
  try {
    const doctors = await apiJson(DOCTORS_API_BASE);
    if (Array.isArray(doctors)) {
      doctorData = doctors.map((d) => ({
        id: Number(d.id),
        name: d.name,
        clinicName: d.clinicName || "",
        assignedMr: (d.assignedMR || d.assignedMr || d.mrName || d.mr || "") // tolerate backend field variants
      }));
      console.log("[TASK] Successfully loaded", doctorData.length, "doctors");
      console.log("[TASK] Doctor data sample:", doctorData.slice(0, 2));
      return;
    }
  } catch (e) {
    console.warn("[TASK] Could not load doctor list from API.", e);
  }
}

// Populate doctor dropdown based on selected MR
function populateDoctorDropdown(mrEmail, targetValue = "") {
  const selectEl = document.getElementById("doctorName");
  if (!selectEl) return;

  const normalize = (v) => (v == null ? "" : String(v).trim().toLowerCase());
  const selectedMrKey = normalize(mrEmail);
  const selectedMrObj = (mrData || []).find((m) => normalize(m.email) === selectedMrKey);
  const selectedMrNameKey = normalize(selectedMrObj && selectedMrObj.name);

  console.log("[TASK] Populating doctors for MR email:", mrEmail);
  console.log("[TASK] Total doctors available:", doctorData.length);

  selectEl.innerHTML = "";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Select Doctor";
  selectEl.appendChild(defaultOpt);

  // Filter doctors by assigned MR. In some datasets assignedMR stores MR name (not email),
  // so we match against both selected MR email and selected MR display name, case-insensitively.
  let filteredDoctors = selectedMrKey
    ? doctorData.filter((d) => {
      const assigned = normalize(d.assignedMr);
      const matchesEmail = selectedMrKey && assigned === selectedMrKey;
      const matchesName = selectedMrNameKey && assigned === selectedMrNameKey;
      return matchesEmail || matchesName;
    })
    : doctorData;

  // Fallback: if filter yields none, show all doctors (better UX than empty dropdown)
  if (selectedMrKey && filteredDoctors.length === 0) {
    console.warn("[TASK] No doctors matched selected MR. Falling back to full doctor list.");
    filteredDoctors = doctorData;
  }

  console.log("[TASK] Filtered doctors count:", filteredDoctors.length);

  filteredDoctors.forEach((doctor) => {
    const opt = document.createElement("option");
    opt.value = doctor.name;
    opt.textContent = doctor.name;
    opt.dataset.clinicName = doctor.clinicName; // Store clinic name for later
    selectEl.appendChild(opt);
  });

  if (targetValue) {
    selectEl.value = targetValue;
  }

  console.log("[TASK] Populated", filteredDoctors.length, "doctors for MR:", mrEmail || "all");
}

// Auto-populate clinic name when doctor is selected
function onDoctorChange() {
  const doctorSelect = document.getElementById("doctorName");
  const clinicInput = document.getElementById("clinicName");

  if (!doctorSelect || !clinicInput) return;

  const selectedOption = doctorSelect.options[doctorSelect.selectedIndex];
  if (selectedOption && selectedOption.dataset.clinicName) {
    clinicInput.value = selectedOption.dataset.clinicName;
  }
}

// Setup event listeners for dynamic filtering
function setupDoctorFiltering() {
  const mrSelect = document.getElementById("assignedTo");
  const doctorSelect = document.getElementById("doctorName");

  console.log("[TASK] Setting up doctor filtering. MR select found:", !!mrSelect, "Doctor select found:", !!doctorSelect);

  if (mrSelect) {
    mrSelect.addEventListener("change", (e) => {
      const selectedMrEmail = e.target.value;
      console.log("[TASK] MR changed to:", selectedMrEmail);
      populateDoctorDropdown(selectedMrEmail);
      // Clear clinic name when MR changes
      const clinicInput = document.getElementById("clinicName");
      if (clinicInput) clinicInput.value = "";
    });
    console.log("[TASK] MR change listener attached");

    // Populate immediately if a MR is already selected (e.g., when editing or reopening modal)
    if (mrSelect.value) {
      populateDoctorDropdown(mrSelect.value);
    } else {
      populateDoctorDropdown("");
    }
  }

  if (doctorSelect) {
    doctorSelect.addEventListener("change", onDoctorChange);
    console.log("[TASK] Doctor change listener attached");
  }

  // Setup dynamic field visibility based on task type
  const taskTypeSelect = document.getElementById("taskType");
  if (taskTypeSelect) {
    taskTypeSelect.addEventListener("change", () => {
      updateTaskFieldsVisibility(taskTypeSelect.value);
    });
  }

  // Ensure dropdown is refreshed when create modal opens
  const modalEl = document.getElementById("createTaskModal");
  if (modalEl) {
    modalEl.addEventListener("shown.bs.modal", () => {
      const mrSel = document.getElementById("assignedTo");
      const doctorSel = document.getElementById("doctorName");
      const currentDoctor = doctorSel ? doctorSel.value : "";
      populateDoctorDropdown(mrSel ? mrSel.value : "", currentDoctor);
    });
  }
}

function updateTaskFieldsVisibility(type) {
  const doctorFieldsContainer = document.getElementById("doctorFieldsContainer");
  if (!doctorFieldsContainer) return;

  if (type === "doctor-visit") {
    doctorFieldsContainer.style.display = "block";
  } else {
    doctorFieldsContainer.style.display = "none";
    // Optional: clear values when hidden
    const clinicInput = document.getElementById("clinicName");
    const doctorSelect = document.getElementById("doctorName");
    if (clinicInput) clinicInput.value = "";
    if (doctorSelect) doctorSelect.value = "";
  }
}

function getTaskTypeIcon(type) {
  const icons = {
    "doctor-visit": "bi bi-hospital",
    promotion: "bi bi-megaphone",
    meeting: "bi bi-people",
    training: "bi bi-book",
  };
  return icons[type] || "bi bi-clipboard";
}

function normalizeTaskStatus(status) {
  if (status == null) return status;
  return String(status)
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}
function getStatusBadge(status) {
  const key = normalizeTaskStatus(status);
  const badges = {
    pending: '<span class="badge bg-warning">Pending</span>',
    "in-progress": '<span class="badge bg-primary">In Progress</span>',
    completed: '<span class="badge bg-success">Completed</span>',
    overdue: '<span class="badge bg-danger">Overdue</span>',
  };
  return badges[key] || '<span class="badge bg-secondary">Unknown</span>';
}
function getPriorityBadge(priority) {
  const badges = {
    high: '<span class="badge bg-danger">High</span>',
    medium: '<span class="badge bg-warning">Medium</span>',
    low: '<span class="badge bg-success">Low</span>',
  };
  return badges[priority] || '<span class="badge bg-secondary">Normal</span>';
}

/* ---------------------------
   Pagination: render table in pages
   --------------------------- */
function renderTaskTable(data, page = 1) {
  const tasksList = document.getElementById("tasksList");
  if (!tasksList) return;
  tasksList.innerHTML = "";

  // pagination logic
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) page = totalPages;
  currentPage = page;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = data.slice(start, end);

  pageItems.forEach((task) => {
    const typeIcon = getTaskTypeIcon(task.type);
    const statusBadge = getStatusBadge(task.status);
    const priorityBadge = getPriorityBadge(task.priority);
    const isCompleted = normalizeTaskStatus(task.status) === "completed";
    const isOverdue = normalizeTaskStatus(task.status) === "overdue";

    // Find MR name from email for display
    const mr = mrData.find((m) => m.email === task.assignedTo);
    const displayName = mr ? mr.name : (task.assignedTo || "-");

    // Edit is disabled for completed OR overdue tasks
    const editDisabled = isCompleted || isOverdue;
    const updateDisabled = isCompleted;

    const row = document.createElement("tr");
    row.innerHTML = `
          <td><i class="${typeIcon} me-2"></i>${escapeHtml(task.title)}</td>
          <td>${escapeHtml(displayName)}</td>
          <td>${priorityBadge}</td>
        <td>${statusBadge}</td>
        <td>${formatDate(task.dueDate)}</td>
        <td>${task.location ? escapeHtml(task.location) : "-"}</td>
        <td>
          <div class="d-flex flex-row flex-nowrap align-items-center justify-content-center">
            <button aria-label="Edit task" class="btn btn-outline-primary btn-sm btn-edit me-1" data-id="${task.id}" ${editDisabled ? "disabled aria-disabled=\"true\" title=\"Cannot edit overdue/completed tasks\"" : ""}>
              <i class="bi bi-pencil"></i>
            </button>
            <button aria-label="Update status" class="btn btn-outline-success btn-sm btn-update me-1" data-id="${task.id}" ${updateDisabled ? "disabled aria-disabled=\"true\"" : ""}>
              <i class="bi bi-check-circle"></i>
            </button>
            <button aria-label="Delete task" class="btn btn-outline-danger btn-sm btn-delete" data-id="${task.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      `;
    tasksList.appendChild(row);
  });

  renderPagination(total, page, pageSize);
}

function initTasksTableDelegatedHandlers() {
  const tasksList = document.getElementById("tasksList");
  if (!tasksList) return;
  if (tasksList.dataset.handlersBound === "true") return;
  tasksList.dataset.handlersBound = "true";

  tasksList.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".btn-edit");
    if (editBtn && tasksList.contains(editBtn)) {
      if (editBtn.hasAttribute("disabled")) return;
      onEditClick({ currentTarget: editBtn });
      return;
    }

    const updateBtn = e.target.closest(".btn-update");
    if (updateBtn && tasksList.contains(updateBtn)) {
      if (updateBtn.hasAttribute("disabled")) return;
      onUpdateClick({ currentTarget: updateBtn });
      return;
    }

    const deleteBtn = e.target.closest(".btn-delete");
    if (deleteBtn && tasksList.contains(deleteBtn)) {
      onDeleteClick({ currentTarget: deleteBtn });
      return;
    }
  });
}

/* ---------------------------
   Summary cards
   --------------------------- */
function renderSummaryCards(data) {
  const summaryCards = document.getElementById("summaryCards");
  if (!summaryCards) return;
  const pending = data.filter((t) => t.status === "pending").length;
  const inProgress = data.filter((t) => t.status === "in-progress").length;
  const completed = data.filter((t) => t.status === "completed").length;
  const overdue = data.filter((t) => t.status === "overdue").length;

  summaryCards.innerHTML = `
      <div class="col-md-3 mb-2">
        <div class="card summary-card summary-pending">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <h3 class="mb-0">${pending}</h3>
              <h6 class="mb-0">Pending</h6>
            </div>
            <div class="card-icon fs-2 text-muted">
              <i class="bi bi-clock"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3 mb-2">
        <div class="card summary-card summary-progress">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <h3 class="mb-0">${inProgress}</h3>
              <h6 class="mb-0">In Progress</h6>
            </div>
            <div class="card-icon fs-2 text-muted">
              <i class="bi bi-play-circle"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3 mb-2">
        <div class="card summary-card summary-completed">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <h3 class="mb-0">${completed}</h3>
              <h6 class="mb-0">Completed</h6>
            </div>
            <div class="card-icon fs-2 text-muted">
              <i class="bi bi-check-circle"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3 mb-2">
        <div class="card summary-card summary-overdue">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <h3 class="mb-0">${overdue}</h3>
              <h6 class="mb-0">Overdue</h6>
            </div>
            <div class="card-icon fs-2 text-muted">
              <i class="bi bi-exclamation-triangle"></i>
            </div>
          </div>
        </div>
      </div>
    `;
}

/* ---------------------------
   Pagination rendering
   --------------------------- */
function renderPagination(totalItems, page, perPage) {
  const nav = document.getElementById("paginationNav");
  if (!nav) return;
  nav.innerHTML = "";
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

  const ul = document.createElement("ul");
  ul.className = "pagination";

  const makePageItem = (label, targetPage, disabled = false, active = false) => {
    const li = document.createElement("li");
    li.className = `page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}`;
    const a = document.createElement("a");
    a.className = "page-link";
    a.href = "#";
    a.textContent = label;
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      if (disabled) return;
      applyPagination(targetPage);
    });
    li.appendChild(a);
    return li;
  };

  // Prev
  ul.appendChild(makePageItem("Prev", Math.max(1, page - 1), page === 1));

  // show up to 5 pages
  const maxPagesToShow = 5;
  let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  if (endPage - startPage < maxPagesToShow - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let p = startPage; p <= endPage; p++) {
    ul.appendChild(makePageItem(String(p), p, false, p === page));
  }

  // Next
  ul.appendChild(makePageItem("Next", Math.min(totalPages, page + 1), page === totalPages));

  nav.appendChild(ul);
}

function applyPagination(page) {
  currentPage = page;
  renderTaskTable(filteredTasks, page);
}

/* ---------------------------
   Button handlers (edit/update/delete)
   --------------------------- */
function onEditClick(e) {
  const id = Number(e.currentTarget.dataset.id);
  editTask(id);
}
function onUpdateClick(e) {
  const id = Number(e.currentTarget.dataset.id);
  const task = tasksData.find((t) => t.id === Number(id));
  if (!task) return;
  const status = normalizeTaskStatus(task.status);
  if (status === "completed") {
    showToast("Read-only", "Completed tasks cannot be updated.");
    return;
  }
  updateTaskStatus(id, task.status);
}
function onDeleteClick(e) {
  const id = Number(e.currentTarget.dataset.id);
  deleteTask(id);
}

/* ---------------------------
   Global functions (exposed)
   --------------------------- */
function editTask(taskId) {
  // Open edit modal (reuse createTaskModal if present)
  const task = tasksData.find((t) => t.id === Number(taskId));
  if (!task) {
    showToast("Error", "Task not found.");
    return;
  }

  if (normalizeTaskStatus(task.status) === "completed") {
    showToast("Read-only", "Completed tasks cannot be edited.");
    return;
  }

  if (normalizeTaskStatus(task.status) === "overdue") {
    showToast("Read-only", "Overdue tasks cannot be edited. Update their status to Completed first.");
    return;
  }

  // If createTaskModal exists in DOM, reuse it for editing (safer for your existing HTML)
  const createModalEl = document.getElementById("createTaskModal");
  if (createModalEl) {
    const form = document.getElementById("createTaskForm");
    if (!form) {
      showToast("Error", "Create form missing.");
      return;
    }
    // mark form as edit mode by using data attribute
    form.dataset.editId = String(task.id);

    // populate fields (IDs assumed from your original markup)
    const titleEl = document.getElementById("taskTitle");
    const typeEl = document.getElementById("taskType");
    const assignedEl = document.getElementById("assignedTo");
    const priorityEl = document.getElementById("taskPriority");
    const dueDateEl = document.getElementById("dueDate");
    const locationEl = document.getElementById("taskLocation");
    const descEl = document.getElementById("taskDescription");

    if (assignedEl) {
      // ensure assigned dropdown is populated
      if (!assignedEl.options.length) populateMRDropdown(assignedEl);
    }

    if (titleEl) titleEl.value = task.title || "";
    if (typeEl) typeEl.value = task.type || "";
    if (assignedEl) assignedEl.value = task.assignedTo || "";

    // Proactively populate doctor dropdown for THIS MR before setting doctor value in edit mode
    if (task.type === "doctor-visit") {
      populateDoctorDropdown(task.assignedTo || "", task.doctorName || "");
    }

    if (priorityEl) priorityEl.value = task.priority || "medium";
    if (dueDateEl) dueDateEl.value = task.dueDate || "";
    if (locationEl) locationEl.value = task.location || "";
    if (descEl) descEl.value = task.description || "";
    const clinicEl = document.getElementById("clinicName");
    const doctorEl = document.getElementById("doctorName");
    if (clinicEl) clinicEl.value = task.clinicName || "";
    if (doctorEl) doctorEl.value = task.doctorName || "";

    // update modal title & save button text
    const modalTitle = createModalEl.querySelector(".modal-title");
    if (modalTitle)
      modalTitle.innerHTML = '<i class="bi bi-pencil"></i> Edit Task';
    const saveBtn = document.getElementById("saveTaskBtn");
    if (saveBtn) saveBtn.textContent = "Save Changes";

    const modal = new bootstrap.Modal(createModalEl);
    modal.show();

    // Trigger visibility update for edit mode
    updateTaskFieldsVisibility(task.type);
    return;
  }

  // If no create modal to reuse, ensure separate edit modal exists and use it
  ensureEditTaskModalExists();
  // populate assignedTo select
  populateMRDropdown(document.getElementById("editTask_assignedTo"));

  document.getElementById("editTask_id").value = String(task.id);
  document.getElementById("editTask_title").value = task.title || "";
  document.getElementById("editTask_type").value = task.type || "doctor-visit";
  document.getElementById("editTask_assignedTo").value = task.assignedTo || "";
  document.getElementById("editTask_priority").value =
    task.priority || "medium";
  document.getElementById("editTask_status").value = task.status || "pending";
  document.getElementById("editTask_dueDate").value = task.dueDate || "";
  document.getElementById("editTask_location").value = task.location || "";
  document.getElementById("editTask_description").value =
    task.description || "";

  const modal = new bootstrap.Modal(document.getElementById("editTaskModal"));
  modal.show();
}

function updateTaskStatus(taskId, currentStatus) {
  // open small status modal
  ensureStatusModalExists();
  const taskIdInput = document.getElementById("updateStatus_taskId");
  const select = document.getElementById("updateStatus_select");
  if (!taskIdInput || !select) return;

  taskIdInput.value = String(taskId);

  const task = tasksData.find(t => t.id === Number(taskId));
  if (!task) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = parseDateSafely(task.dueDate);
  const status = normalizeTaskStatus(task.status);

  // Clear existing options
  select.innerHTML = "";

  // Define potential options
  const options = [
    { value: "pending", text: "Pending" },
    { value: "in-progress", text: "In Progress" },
    { value: "completed", text: "Completed" },
    { value: "overdue", text: "Overdue" }
  ];

  // Apply filters based on rules
  const filteredOptions = options.filter(opt => {
    // 2. Overdue task should allow to change status of task only to completed
    if (status === "overdue") {
      return opt.value === "completed" || opt.value === "overdue"; // Keep overdue as it's current
    }

    if (dueDate) {
      const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

      // 3. Future due date task can not change status as overdue
      if (dueStart >= today && opt.value === "overdue") {
        return false;
      }

      // 4. Past duedate status can not change "In Progress". it should be overdue only and completed
      if (dueStart < today && opt.value === "in-progress") {
        return false;
      }

      // If it's past due, typically it should be Pending, Overdue or Completed
      // But rule 4 says it should be overdue only and completed for "past due date status"
      // Wait, "Past duedate status can not change In Progress... it should be overdue only and completed"
      if (dueStart < today && opt.value === "pending") {
        return false;
      }
    }

    return true;
  });

  filteredOptions.forEach(opt => {
    const el = document.createElement("option");
    el.value = opt.value;
    el.textContent = opt.text;
    select.appendChild(el);
  });

  if (currentStatus) {
    select.value = normalizeTaskStatus(currentStatus);
  }

  const modal = new bootstrap.Modal(
    document.getElementById("updateStatusModal")
  );
  modal.show();
}

function deleteTask(taskId) {
  const idx = tasksData.findIndex((t) => t.id === Number(taskId));
  if (idx === -1) {
    showToast("Error", "Task not found.");
    return;
  }
  if (
    !confirm(`Are you sure you want to delete task "${tasksData[idx].title}"?`)
  )
    return;

  (async function () {
    const id = Number(taskId);
    if (tasksApiMode) {
      try {
        await deleteTaskApi(id);
        await refreshTasksFromApiOrFallback();
        applyFilters();
        showToast("Deleted", "Task removed successfully.");
        return;
      } catch (e) {
        console.warn("Task delete API failed. Falling back to localStorage.", e);
        tasksApiMode = false;
      }
    }

    // remove from array
    tasksData.splice(idx, 1);

    // *** PERSISTENCE CHANGE: Save to localStorage ***
    saveTasksData();

    // re-render UI
    applyFilters();
    showToast("Deleted", "Task removed successfully.");
  })();
}

/* ---------------------------
   Add / Save (Create modal reuse) - handle both create & edit
   --------------------------- */
function initCreateTaskHandler() {
  const modalEl = document.getElementById("createTaskModal");
  if (!modalEl) return;
  const saveTaskBtn = document.getElementById("saveTaskBtn");
  if (!saveTaskBtn) return;

  // Reset modal state when it's closed
  modalEl.addEventListener("hidden.bs.modal", () => {
    const form = document.getElementById("createTaskForm");
    if (form) {
      delete form.dataset.editId;
      form.reset();
    }
    const modalTitle = modalEl.querySelector(".modal-title");
    if (modalTitle)
      modalTitle.innerHTML =
        '<i class="bi bi-plus-circle"></i> Create New Task';
    if (saveTaskBtn) saveTaskBtn.textContent = "Create Task";

    // Reset visibility to hidden by default for new tasks or based on default selection
    updateTaskFieldsVisibility("");
  });

  // Event listener for the "Create Task" button
  saveTaskBtn.addEventListener("click", () => {
    const locationEl = document.getElementById("taskLocation");
    const dueDateEl = document.getElementById("dueDate");
    const assignedToEl = document.getElementById("assignedTo");

    if (locationEl) locationEl.classList.remove("is-invalid");
    if (dueDateEl) dueDateEl.classList.remove("is-invalid");
    if (assignedToEl) assignedToEl.classList.remove("is-invalid");

    const locationVal = (locationEl ? locationEl.value : "").trim();
    const dueDateVal = (dueDateEl ? dueDateEl.value : "").trim();
    const assignedToVal = (assignedToEl ? assignedToEl.value : "").trim();

    // Validate location
    if (!locationVal) {
      if (locationEl) {
        locationEl.classList.add("is-invalid");
        locationEl.focus();
      }
      showToast("Validation", "Location is required.");
      return;
    }

    // Validate due date (no past dates)
    if (dueDateVal) {
      const selectedDate = new Date(dueDateVal);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for fair comparison

      if (selectedDate < today) {
        if (dueDateEl) {
          dueDateEl.classList.add("is-invalid");
          dueDateEl.focus();
        }
        showToast("Validation", "Due date cannot be in the past.");
        return;
      }
    }

    // Validate territory restriction
    if (assignedToVal && locationVal) {
      const selectedMR = mrData.find(mr => mr.email === assignedToVal || mr.name === assignedToVal);
      if (selectedMR && selectedMR.territory) {
        const mrTerritory = selectedMR.territory.toLowerCase();
        const taskLocation = locationVal.toLowerCase();

        // Check if task location contains MR's territory or vice versa
        if (!taskLocation.includes(mrTerritory) && !mrTerritory.includes(taskLocation)) {
          if (locationEl) {
            locationEl.classList.add("is-invalid");
            locationEl.focus();
          }
          showToast("Validation", `Task location must be within ${selectedMR.name}'s territory: ${selectedMR.territory}`);
          return;
        }
      }
    }

    // Validate doctor name for doctor-visit
    const taskTypeVal = document.getElementById("taskType").value;
    const doctorNameEl = document.getElementById("doctorName");
    const doctorNameVal = (doctorNameEl ? doctorNameEl.value : "").trim();

    if (doctorNameEl) doctorNameEl.classList.remove("is-invalid");

    if (taskTypeVal === "doctor-visit" && !doctorNameVal) {
      if (doctorNameEl) {
        doctorNameEl.classList.add("is-invalid");
        doctorNameEl.focus();
      }
      showToast("Validation", "Doctor Name is mandatory for Doctor Visit tasks.");
      return;
    }

    // Prevent double submission
    if (isSubmittingTask) {
      console.log("[TASK] Submit blocked: already in progress.");
      return;
    }

    const form = document.getElementById("createTaskForm");
    if (!form) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Immediately lock
    isSubmittingTask = true;
    const originalBtnText = saveTaskBtn.textContent;
    saveTaskBtn.disabled = true;
    saveTaskBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

    // detect edit mode
    const editId = form.dataset.editId ? Number(form.dataset.editId) : null;

    const newData = {
      title: document.getElementById("taskTitle").value,
      type: document.getElementById("taskType").value,
      assignedTo: document.getElementById("assignedTo").value,
      priority: document.getElementById("taskPriority").value,
      dueDate: document.getElementById("dueDate").value || null,
      location: locationVal,
      description: document.getElementById("taskDescription").value,
      clinicName: document.getElementById("clinicName").value,
      doctorName: document.getElementById("doctorName").value,
    };

    (async function () {
      try {
        console.log("[TASK] Attempting to save task. API Mode:", tasksApiMode);
        if (tasksApiMode) {
          if (editId) {
            const task = tasksData.find((t) => t.id === editId);
            if (!task) {
              showToast("Error", "Task not found.");
              return;
            }
            task.title = newData.title;
            task.type = newData.type;
            task.assignedTo = newData.assignedTo;
            task.priority = newData.priority;
            task.dueDate = newData.dueDate;
            task.location = newData.location;
            task.description = newData.description;
            task.clinicName = newData.clinicName;
            task.doctorName = newData.doctorName;
            console.log("[TASK] Updating task:", task);
            await updateTaskApi(editId, task);
            showToast("Saved", "Task updated successfully.");
          } else {
            console.log("[TASK] Creating new task:", newData);
            await createTaskApi(newData);
            showToast("Created", "New task created.");
          }
          console.log("[TASK] Refreshing task list from API");
          await refreshTasksFromApiOrFallback();
          applyFilters();

          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        } else {
          console.warn("[TASK] API mode is OFF - saving to localStorage only!");
          if (editId) {
            // update existing
            const task = tasksData.find((t) => t.id === editId);
            if (!task) {
              showToast("Error", "Task not found.");
              return;
            }
            task.title = newData.title;
            task.type = newData.type;
            task.assignedTo = newData.assignedTo;
            task.priority = newData.priority;
            task.dueDate = newData.dueDate;
            task.location = newData.location;
            task.description = newData.description;
            task.clinicName = newData.clinicName;
            task.doctorName = newData.doctorName;

            showToast("Saved", "Task updated successfully.");
          } else {
            // create new
            const id = tasksData.length
              ? Math.max(...tasksData.map((t) => t.id)) + 1
              : 1;
            const createdDate = new Date().toISOString().split("T")[0];
            const newTask = {
              id,
              ...newData,
              status: "pending", // New tasks start as pending
              createdDate,
            };
            tasksData.push(newTask);
            showToast("Created", "New task created.");
          }

          // *** PERSISTENCE CHANGE: Save to localStorage (both create & edit) ***
          saveTasksData();

          // re-render UI
          applyFilters();

          // hide modal
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        }
      } catch (err) {
        console.error("[TASK] Save error:", err);
        let errorMsg = err.message || "An unknown error occurred.";

        // Try to distinguish network error from validation/server error
        if (err instanceof TypeError || errorMsg.includes("Failed to fetch")) {
          showToast("Network Error", "Could not reach the server. Please check if the backend is running.");
          console.error("[TASK] Network error detected - NOT switching to offline mode to allow retry");
        } else {
          showToast("Error", errorMsg);
        }
      } finally {
        // Re-enable button
        isSubmittingTask = false;
        saveTaskBtn.disabled = false;
        saveTaskBtn.textContent = originalBtnText;
      }
    })();

    // The 'hidden.bs.modal' listener will handle form reset and title change
  });
}

/* ---------------------------
   Filters & Search + helper applyFilters
   --------------------------- */
function applyFilters() {
  const filterStatus = document.getElementById("filterStatus");
  const filterPriority = document.getElementById("filterPriority");
  const filterType = document.getElementById("filterType");
  const searchInput = document.getElementById("searchTask");

  let filteredData = tasksData.slice();
  if (filterStatus && filterStatus.value) {
    const key = normalizeTaskStatus(filterStatus.value);
    filteredData = filteredData.filter((task) => normalizeTaskStatus(task.status) === key);
  }
  if (filterPriority && filterPriority.value) {
    filteredData = filteredData.filter((task) => task.priority === filterPriority.value);
  }
  if (filterType && filterType.value) {
    filteredData = filteredData.filter((task) => task.type === filterType.value);
  }
  if (searchInput && searchInput.value.trim()) {
    const searchTerm = searchInput.value.trim().toLowerCase();
    filteredData = filteredData.filter(
      (task) =>
        (task.title && task.title.toLowerCase().includes(searchTerm)) ||
        (task.assignedTo && task.assignedTo.toLowerCase().includes(searchTerm)) ||
        (task.description && task.description.toLowerCase().includes(searchTerm))
    );
  }

  filteredTasks = filteredData;
  // reset to first page on filter change
  currentPage = 1;
  renderTaskTable(filteredTasks, currentPage);
  renderSummaryCards(tasksData);
}

/* ---------------------------
   Init: wire up everything & initial render
   --------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  isBootstrappingTasks = true;
  // Set minimum date for due date input to today
  const dueDateInput = document.getElementById("dueDate");
  if (dueDateInput) {
    const today = new Date().toISOString().split('T')[0];
    dueDateInput.min = today;
  }

  // load persisted data
  loadTasksData();

  // Auto-update overdue tasks
  updateOverdueTasks();

  // Set up periodic overdue check (every 5 minutes)
  setInterval(updateOverdueTasks, 5 * 60 * 1000);

  // sidebar & theme toggles are handled in script.js


  initTasksTableDelegatedHandlers();

  const assignedToSelect = document.getElementById("assignedTo");

  const mrPromise = assignedToSelect
    ? refreshMrList().catch((e) => console.warn("refreshMrList failed", e))
    : Promise.resolve();

  const doctorPromise = refreshDoctorList().catch((e) => console.warn("refreshDoctorList failed", e));
  const tasksPromise = refreshTasksFromApiOrFallback().catch((e) => console.warn("refreshTasksFromApiOrFallback failed", e));

  await Promise.allSettled([mrPromise, doctorPromise, tasksPromise]);

  if (assignedToSelect) {
    populateMRDropdown(assignedToSelect);
  }

  setupDoctorFiltering();

  filteredTasks = tasksData.slice();
  renderTaskTable(filteredTasks, currentPage);
  renderSummaryCards(tasksData);

  isBootstrappingTasks = false;

  // search
  const searchInput = document.getElementById("searchTask");
  if (searchInput) {
    const debouncedApply = debounce(() => applyFilters(), 150);
    searchInput.addEventListener("input", () => {
      debouncedApply();
    });
  }

  // filters
  const filterStatus = document.getElementById("filterStatus");
  const filterPriority = document.getElementById("filterPriority");
  const filterType = document.getElementById("filterType");
  if (filterStatus) filterStatus.addEventListener("change", applyFilters);
  if (filterPriority) filterPriority.addEventListener("change", applyFilters);
  if (filterType) filterType.addEventListener("change", applyFilters);

  // init create/add task handler (handles both create & edit)
  initCreateTaskHandler();

  // ensure edit/status modals exist (creates if needed)
  ensureEditTaskModalExists();
  ensureStatusModalExists();

  // notifications sample (unchanged)
  const notificationsList = document.getElementById("notificationsList");
  if (notificationsList) {
    const recentActivities = [
      {
        icon: "bi-person-plus",
        iconClass: "bg-primary",
        title: "New MR Assigned",
        description: "Sneha Patel assigned to Central Delhi region",
        time: "2 hours ago",
      },
      {
        icon: "bi-currency-rupee",
        iconClass: "bg-success",
        title: "Sales Target Achieved",
        description: "Rajesh Kumar achieved 112% of monthly target",
        time: "4 hours ago",
      },
      {
        icon: "bi-hospital",
        iconClass: "bg-info",
        title: "Doctor Visit Completed",
        description: "15 doctor visits completed today",
        time: "6 hours ago",
      },
      {
        icon: "bi-bell",
        iconClass: "bg-warning",
        title: "Meeting Reminder",
        description: "Team meeting scheduled for tomorrow 10 AM",
        time: "8 hours ago",
      },
      {
        icon: "bi-box-seam",
        iconClass: "bg-secondary",
        title: "Sample Stock Updated",
        description: "Diabetex 500mg stock replenished",
        time: "1 day ago",
      },
    ];
    const alertsData = [
      {
        icon: "bi-exclamation-triangle",
        iconClass: "bg-danger",
        title: "Low Stock Alert",
        description: "CardioCare 10mg running low in North Delhi",
        type: "urgent",
      },
      {
        icon: "bi-calendar-x",
        iconClass: "bg-warning",
        title: "Pending Approvals",
        description: "12 expense reports awaiting your approval",
        type: "warning",
      },
      {
        icon: "bi-graph-down",
        iconClass: "bg-info",
        title: "Performance Alert",
        description: "Manish Patel below 80% target achievement",
        type: "info",
      },
      {
        icon: "bi-check-circle",
        iconClass: "bg-success",
        title: "Task Completed",
        description: "Monthly report submitted successfully",
        type: "success",
      },
    ];
    const allNotifications = [
      ...alertsData.map((alert) => ({ ...alert, type: "alert" })),
      ...recentActivities.map((activity) => ({ ...activity, type: "activity" })),
    ];

    notificationsList.innerHTML = allNotifications
      .slice(0, 10) // Show latest 10 notifications
      .map(
        (notification) => `
      <div class="notification-item d-flex align-items-start">
        <div class="me-3">
          <div class="notification-icon ${notification.iconClass} text-white rounded-2 d-flex align-items-center justify-content-center" style="width:44px;height:44px">
            <i class="bi ${notification.icon}"></i>
          </div>
        </div>
        <div class="flex-grow-1">
          <div class="notification-title">${notification.title}</div>
          <div class="notification-desc">${notification.description}</div>
          <div class="notification-time small-muted">${notification.time || "Just now"}</div>
        </div>
      </div>
    `
      )
      .join("");
  }
});

/* Expose functions globally (optional) */
window.editTask = editTask;
window.updateTaskStatus = updateTaskStatus;
window.deleteTask = deleteTask;




