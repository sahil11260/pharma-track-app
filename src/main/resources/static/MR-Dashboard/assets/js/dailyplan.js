// assets/js/dailyplan.js
document.addEventListener("DOMContentLoaded", () => {
    console.log("[DAILYPLAN] dailyplan.js loaded and DOM content is ready!");

    // --- API Configuration ---
    // const API_BASE = window.location.port === "5500" ? "http://localhost:8080" : "";
    const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");

    const TASKS_API_BASE = `${API_BASE}/api/tasks`;
    let tasksApiMode = true;

    // --- Helper Functions ---
    const formatDateKey = (date) => {
        // Use local date parts instead of ISO to avoid timezone shifts
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    const todayKey = formatDateKey(new Date());

    function getDateXDaysAgo(days) {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return formatDateKey(d);
    }

    function getAuthHeader() {
        const token = localStorage.getItem("kavya_auth_token");
        return token ? { "Authorization": `Bearer ${token}` } : {};
    }

    function getCurrentUserIdentifier() {
        try {
            const userObj = JSON.parse(localStorage.getItem("kavya_user") || "{}");
            const name = (userObj.name || localStorage.getItem("signup_name") || "").trim();
            if (name) return name.toLowerCase();
            const email = (userObj.email || localStorage.getItem("signup_email") || "").trim();
            if (email) return email.toLowerCase();
        } catch (e) {
        }
        return "anonymous";
    }

    function getDailyPlanStorageKey() {
        return `dailyPlanTasks:${getCurrentUserIdentifier()}`;
    }

    async function apiJson(url, options = {}) {
        const headers = { "Content-Type": "application/json", ...getAuthHeader(), ...(options.headers || {}) };
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP ${response.status}`);
        }
        return response.json();
    }

    // --- Task Mapping Functions ---
    function mapBackendTaskToUI(backendTask) {
        // Handle various date formats (String ISO, Array [y,m,d], etc.)
        let taskDate = "";
        const rawDate = backendTask.dueDate;

        if (Array.isArray(rawDate)) {
            const y = rawDate[0];
            const m = String(rawDate[1]).padStart(2, '0');
            const d = String(rawDate[2]).padStart(2, '0');
            taskDate = `${y}-${m}-${d}`;
        } else if (typeof rawDate === 'string') {
            taskDate = rawDate.split('T')[0]; // Handle "2023-10-10T..."
        } else {
            taskDate = todayKey; // Fallback to today if null/missing
        }

        // Prioritize specific fields
        // For doctor visits, the clinic/doctor columns must come from clinicName/doctorName.
        // Falling back to location/title causes wrong values like city/location in Clinic Name and generic titles (e.g. "Visit") in Doctor Name.
        const isDoctorVisit = String(backendTask.type || "").toLowerCase() === "doctor-visit";
        const clinic = isDoctorVisit
            ? (backendTask.clinicName || "")
            : (backendTask.location || 'N/A');
        const doctor = isDoctorVisit
            ? (backendTask.doctorName || "")
            : (backendTask.title || 'N/A');

        const capitalizeFirst = (str) => {
            if (!str) return "";
            const s = String(str);
            return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        };

        const rawStatus = backendTask.status || "Pending";
        const normStatus = String(rawStatus)
            .trim()
            .toLowerCase()
            .replace(/[_\s]+/g, "-");

        const displayStatus = (taskDate > todayKey && normStatus === "overdue")
            ? "Pending"
            : rawStatus;

        return {
            id: backendTask.id,
            type: capitalizeFirst(backendTask.type) || "Task",
            clinic: clinic,
            doctor: doctor,
            status: capitalizeFirst(displayStatus) || "Pending",
            date: taskDate
        };
    }

    function mapUITaskToBackend(uiTask, originalBackendTask) {
        // When updating, we need to send the full backend format
        return {
            id: uiTask.id,
            title: originalBackendTask?.title || `Task for ${uiTask.doctor}`,
            type: uiTask.type.toLowerCase(),
            assignedTo: originalBackendTask?.assignedTo || localStorage.getItem("signup_name") || "",
            priority: originalBackendTask?.priority || "medium",
            status: uiTask.status.toLowerCase(),
            dueDate: uiTask.date,
            location: originalBackendTask?.location || "",
            description: originalBackendTask?.description || "",
            clinicName: originalBackendTask?.clinicName || "",
            doctorName: originalBackendTask?.doctorName || ""
        };
    }

    // --- API Functions ---
    async function refreshTasksFromApi() {
        try {
            console.log("[DAILYPLAN] Fetching tasks from API...");
            const data = await apiJson(TASKS_API_BASE);
            console.log("[DAILYPLAN] API response received:", Array.isArray(data) ? data.length : 0, "tasks");

            if (Array.isArray(data)) {
                // Trusting backend filtering - removing redundant frontend identity check
                const myTasks = data;

                // Map to UI format
                tasks = myTasks.map(mapBackendTaskToUI);
                backendTasks = myTasks;

                saveTasks();
                tasksApiMode = true;
                hideApiRetryBanner();
                console.log("[DAILYPLAN] Successfully processed", tasks.length, "tasks");
                return;
            }
            console.warn("[DAILYPLAN] API returned non-array response");
            tasksApiMode = false;
        } catch (e) {
            console.error("[DAILYPLAN] API call failed:", e);
            tasksApiMode = false;
            showApiRetryBanner();
        }
    }

    function normalizeTaskStatus(status) {
        if (status == null) return status;
        return String(status)
            .trim()
            .toLowerCase()
            .replace(/[_\s]+/g, "-");
    }

    async function updateTaskStatusApi(taskId, newStatus) {
        try {
            console.log("[DAILYPLAN] Updating task status:", taskId, "->", newStatus);

            // Find the original backend task
            const backendTask = backendTasks.find(t => t.id === taskId);
            if (!backendTask) {
                throw new Error("Task not found in backend cache");
            }

            // Update the status
            const updatedTask = {
                ...backendTask,
                status: normalizeTaskStatus(newStatus)
            };

            const result = await apiJson(`${TASKS_API_BASE}/${taskId}`, {
                method: "PUT",
                body: JSON.stringify(updatedTask)
            });

            console.log("[DAILYPLAN] Status update successful:", result);
            return result;
        } catch (e) {
            console.error("[DAILYPLAN] Status update failed:", e);
            throw e;
        }
    }

    // --- Banner Functions ---
    function showApiRetryBanner() {
        let banner = document.getElementById("tasksApiRetryBanner");
        if (!banner) {
            banner = document.createElement("div");
            banner.id = "tasksApiRetryBanner";
            banner.className = "alert alert-warning alert-dismissible fade show";
            banner.style.cssText = "position: fixed; top: 10px; right: 10px; z-index: 9999; max-width: 400px;";
            banner.innerHTML = `
                <strong>âš ï¸ Offline Mode</strong>
                <p class="mb-0">Tasks API unavailable. Using local data. <button class="btn btn-sm btn-warning" onclick="location.reload()">Retry</button></p>
            `;
            document.body.appendChild(banner);
        }
        banner.style.display = "block";
    }

    function hideApiRetryBanner() {
        const banner = document.getElementById("tasksApiRetryBanner");
        if (banner) banner.style.display = "none";
    }

    // --- MOCK DATA (Fallback only) ---
    const mockManagerTasks = [];

    // --- DOM Elements Selector ---
    const $id = id => document.getElementById(id);

    // Elements
    const todayTaskListBody = $id("todayTaskListBody");
    const pastDueTaskListBody = $id("pastDueTaskListBody");
    const pastDueTasksContainer = $id("pastDueTasksContainer");
    const upcomingTaskListBody = $id("upcomingTaskListBody");
    const upcomingTasksContainer = $id("upcomingTasksContainer");

    // Summary Card Elements
    const totalCountEl = $id("totalTasksCount");
    const completedCountEl = $id("completedTasksCount");
    const pendingCountEl = $id("pendingTasksCount");

    // --- PERSISTENCE / INITIALIZATION LOGIC ---
    let tasks = [];
    let backendTasks = []; // Store original backend task format for updates

    function saveTasks() {
        localStorage.setItem(getDailyPlanStorageKey(), JSON.stringify(tasks));
    }

    function loadTasksFromStorage() {
        const scopedKey = getDailyPlanStorageKey();
        const storedTasksRaw = localStorage.getItem(scopedKey);
        if (storedTasksRaw) {
            return JSON.parse(storedTasksRaw);
        }

        // Backward compatibility: migrate from legacy shared key once.
        const legacyRaw = localStorage.getItem("dailyPlanTasks");
        if (legacyRaw) {
            localStorage.setItem(scopedKey, legacyRaw);
            localStorage.removeItem("dailyPlanTasks");
            return JSON.parse(legacyRaw);
        }

        return [];
    }

    // --- CORE LOGIC ---
    function updateSummary() {
        const total = tasks.filter(task =>
            task.date === todayKey || normalizeTaskStatus(task.status) !== "completed"
        ).length;
        const pendingOrInProgress = tasks.filter(task => normalizeTaskStatus(task.status) !== "completed").length;
        const upcomingOverall = tasks.filter(task => task.date > todayKey && normalizeTaskStatus(task.status) !== "completed").length;

        if (totalCountEl) totalCountEl.textContent = total;
        if (completedCountEl) completedCountEl.textContent = upcomingOverall;
        if (pendingCountEl) pendingCountEl.textContent = pendingOrInProgress;
    }

    function getStatusClass(status) {
        if (!status) return 'bg-secondary';
        const s = status.toLowerCase();
        if (s.includes('completed')) return 'bg-success';
        if (s.includes('progress')) return 'bg-primary';
        if (s.includes('pending')) return 'bg-danger';
        return 'bg-secondary';
    }

    // --- TASK RENDERING ---
    function renderAllTasks() {
        console.log("[DAILYPLAN] Rendering all tasks. Today is:", todayKey);
        console.log("[DAILYPLAN] Current tasks state:", tasks);

        const isCompleted = (task) => normalizeTaskStatus(task.status) === "completed";

        // Strictly only today's tasks
        const todayTasks = tasks.filter(task => task.date === todayKey);
        console.log("[DAILYPLAN] Today's tasks count:", todayTasks.length);

        // Past Due list: only tasks due BEFORE today that are not completed
        const pastDueTasks = tasks.filter(task =>
            task.date < todayKey &&
            !isCompleted(task)
        ).sort((a, b) => new Date(a.date) - new Date(b.date));
        console.log("[DAILYPLAN] Past due tasks count:", pastDueTasks.length);

        // Upcoming tasks: tasks due AFTER today and not completed
        const upcomingTasks = tasks.filter(task =>
            task.date > todayKey &&
            !isCompleted(task)
        ).sort((a, b) => new Date(a.date) - new Date(b.date));
        console.log("[DAILYPLAN] Upcoming tasks count:", upcomingTasks.length);

        renderTaskTable(todayTasks, todayTaskListBody, false, "today");
        renderTaskTable(pastDueTasks, pastDueTaskListBody, true, "past");
        renderTaskTable(upcomingTasks, upcomingTaskListBody, true, "upcoming");

        updateSummary();
    }

    function renderTaskTable(taskList, tableBodyElement, isExtended, mode) {
        if (!tableBodyElement) return;

        tableBodyElement.innerHTML = '';

        if (taskList.length === 0) {
            let emptyMessage = 'No visits assigned for today.';
            if (mode === 'past') emptyMessage = 'No past due pending tasks.';
            if (mode === 'upcoming') emptyMessage = 'No upcoming tasks.';

            const colSpan = 6;
            tableBodyElement.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-muted p-4">${emptyMessage}</td></tr>`;

            if (mode === 'past' && pastDueTasksContainer) pastDueTasksContainer.style.display = 'none';
            if (mode === 'upcoming' && upcomingTasksContainer) upcomingTasksContainer.style.display = 'none';
            return;
        }

        if (mode === 'past' && pastDueTasksContainer) pastDueTasksContainer.style.display = 'block';
        if (mode === 'upcoming' && upcomingTasksContainer) upcomingTasksContainer.style.display = 'block';

        taskList.forEach((task, index) => {
            const statusClass = getStatusClass(task.status);
            const row = document.createElement('tr');
            row.dataset.taskId = task.id;

            const completed = normalizeTaskStatus(task.status) === 'completed';
            const isPastDue = task.date < todayKey;
            const clinicMissing = !String(task.clinic || "").trim();
            const disableUpdate = completed || (mode === "past") || clinicMissing;

            let updateBtnLabel = completed ? 'Done' : 'Update';
            if (!completed && mode === "past") updateBtnLabel = 'Locked';
            if (!completed && clinicMissing) updateBtnLabel = 'Add Clinic';

            // Show date if not today
            const firstColContent = (task.date !== todayKey) ? task.date : (index + 1);

            row.innerHTML = `
                <td>${firstColContent}</td>
                <td><span class="fw-bold">${task.type}</span></td>
                <td>${task.clinic}</td>
                <td>${task.doctor}</td>
                <td class="text-center"><span class="badge ${statusClass} task-status-badge">${task.status}</span></td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button 
                            class="btn btn-outline-primary btn-update-status" 
                            data-task-id="${task.id}"
                            data-bs-toggle="modal" 
                            data-bs-target="#statusUpdateModal"
                            ${disableUpdate ? 'disabled' : ''}>
                            <i class="bi bi-pencil-square"></i> ${updateBtnLabel}
                        </button>
                    </div>
                </td>
            `;

            tableBodyElement.appendChild(row);
        });
    }

    // --- MODAL & STATUS UPDATE LOGIC ---
    const modalId = 'statusUpdateModal';
    if (!$id(modalId)) {
        const modalHTML = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="statusUpdateModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="statusUpdateModalLabel">Update Task Status</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="mb-3">Updating status for: <strong id="modalTaskTarget"></strong></p>
                            <input type="hidden" id="modalTaskId">
                            <div class="mb-3">
                                <label for="newStatus" class="form-label">New Status</label>
                                <select class="form-select" id="newStatus">
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="saveStatusBtn">Save Status</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    const statusUpdateModal = $id(modalId);
    const saveStatusBtn = $id('saveStatusBtn');
    const newStatusSelect = $id('newStatus');
    const modalTaskTarget = $id('modalTaskTarget');
    const modalTaskIdInput = $id('modalTaskId');

    // Listen for modal opening
    if (statusUpdateModal) {
        statusUpdateModal.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            if (!button) return;

            const taskId = parseInt(button.dataset.taskId);
            const task = tasks.find(t => t.id === taskId);

            if (task) {
                const clinicMissing = !String(task.clinic || "").trim();
                if (task.date < todayKey) {
                    event.preventDefault();
                    alert("Past due pending tasks cannot be updated.");
                    return;
                }
                if (clinicMissing) {
                    event.preventDefault();
                    alert("Clinic Name is mandatory. Please contact your manager to add the Clinic Name before updating status.");
                    return;
                }
                modalTaskTarget.textContent = `${task.doctor} (${task.clinic})`;
                modalTaskIdInput.value = taskId;
                
                // Restriction: Past due pending task should allow status to only completed
                if (task.date < todayKey) {
                    newStatusSelect.innerHTML = `
                        <option value="Completed">Completed</option>
                    `;
                    newStatusSelect.value = "Completed";
                } else {
                    // Reset to default options for current/upcoming tasks
                    newStatusSelect.innerHTML = `
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                    `;
                    newStatusSelect.value = task.status;
                }
            }
        });
    }

    // Listen for save button click
    if (saveStatusBtn) {
        saveStatusBtn.addEventListener('click', async () => {
            const taskId = parseInt(modalTaskIdInput.value);
            const newStatus = newStatusSelect.value;

            const task = tasks.find(t => t.id === taskId);
            if (task) {
                const clinicMissing = !String(task.clinic || "").trim();
                if (task.date < todayKey) {
                    alert("Past due pending tasks cannot be updated.");
                    return;
                }
                if (clinicMissing) {
                    alert("Clinic Name is mandatory. Please contact your manager to add the Clinic Name before updating status.");
                    return;
                }
            }

            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                const originalBtnText = saveStatusBtn.textContent;
                saveStatusBtn.disabled = true;
                saveStatusBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';

                try {
                    if (tasksApiMode) {
                        // Update via API
                        await updateTaskStatusApi(taskId, newStatus);

                        // Refresh from API to get latest data
                        await refreshTasksFromApi();
                    } else {
                        // Fallback: update locally
                        console.warn("[DAILYPLAN] API mode is OFF - updating locally only");
                        tasks[taskIndex].status = newStatus;
                        saveTasks();
                    }

                    renderAllTasks();

                    // Close modal
                    const modalInstance = bootstrap.Modal.getInstance(statusUpdateModal) || new bootstrap.Modal(statusUpdateModal);
                    modalInstance.hide();
                } catch (err) {
                    console.error("[DAILYPLAN] Status update error:", err);
                    alert("Failed to update task status. Please try again.");
                } finally {
                    saveStatusBtn.disabled = false;
                    saveStatusBtn.textContent = originalBtnText;
                }
            }
        });
    }

    // --- INITIALIZATION ---
    (async function init() {
        console.log("[DAILYPLAN] Initializing...");

        // Try to load from API first
        await refreshTasksFromApi();

        // If API failed, use localStorage or mock data
        if (!tasksApiMode) {
            const storedTasks = loadTasksFromStorage();
            if (storedTasks.length > 0) {
                tasks = storedTasks;
                console.log("[DAILYPLAN] Loaded from localStorage:", tasks.length, "tasks");
            } else {
                tasks = mockManagerTasks;
                saveTasks();
                console.log("[DAILYPLAN] Using mock data");
            }
        }

        // Initial render
        renderAllTasks();
    })();
});

