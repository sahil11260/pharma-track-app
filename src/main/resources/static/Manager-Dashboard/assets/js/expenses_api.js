// Manager Dashboard - Expense Management (API-Connected Version)
// This file replaces static data with dynamic API calls

(() => {
    const API_BASE = window.location.port === "5500" ? "http://localhost:8080" : "";
    const EXPENSES_API = `${API_BASE}/api/expenses`;
    const USERS_API = `${API_BASE}/api/users`;

    // State
    let expensesData = [];
    let mrData = [];
    let currentPage = 1;
    const perPage = 6;
    let currentFiltered = [];
    let addExpenseWired = false;

    // Auth helper
    function getAuthHeader() {
        const token = localStorage.getItem("kavya_auth_token");
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    // API helper
    async function apiJson(url, options = {}) {
        const headers = {
            ...getAuthHeader(),
            ...(options.headers || {})
        };

        // Don't add Content-Type for FormData
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const res = await fetch(url, { ...options, headers });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(text || `HTTP ${res.status}`);
        }
        if (res.status === 204) return null;
        return await res.json();
    }

    // Utility functions
    function esc(s) {
        if (s === null || s === undefined) return "";
        return String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function fmtDate(d) {
        if (!d) return "-";
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return d;
        return dt.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }

    function catIcon(c) {
        const map = {
            travel: "bi bi-car-front",
            meals: "bi bi-cup-straw",
            accommodation: "bi bi-house",
            samples: "bi bi-box-seam",
            miscellaneous: "bi bi-three-dots",
            fuel: "bi bi-fuel-pump",
            marketing: "bi bi-megaphone",
        };
        return map[(c || "").toLowerCase()] || "bi bi-receipt";
    }

    function statusBadge(s) {
        const statusMap = {
            PENDING: '<span class="badge bg-warning">Pending</span>',
            APPROVED: '<span class="badge bg-success">Approved</span>',
            REJECTED: '<span class="badge bg-danger">Rejected</span>',
            pending: '<span class="badge bg-warning">Pending</span>',
            approved: '<span class="badge bg-success">Approved</span>',
            rejected: '<span class="badge bg-danger">Rejected</span>',
        };
        return statusMap[s] || `<span class="badge bg-secondary">${esc(s)}</span>`;
    }

    // Load expenses from API
    async function loadExpenses() {
        try {
            console.log("[Manager Expenses] Loading expenses from API...");
            const data = await apiJson(EXPENSES_API);
            expensesData = Array.isArray(data) ? data : [];
            console.log("[Manager Expenses] Loaded", expensesData.length, "expenses");
            return expensesData;
        } catch (error) {
            console.error("[Manager Expenses] Failed to load expenses:", error);
            showToast("Failed to load expenses. Please refresh the page.", "error");
            return [];
        }
    }

    // Load MRs from API
    async function loadMRs() {
        try {
            const currentManager = localStorage.getItem("signup_name") || "";
            const users = await apiJson(`${USERS_API}?manager=${encodeURIComponent(currentManager)}`);
            if (!Array.isArray(users)) return;

            mrData = users
                .filter((u) => String(u?.role || "").toUpperCase() === "MR")
                .map((u) => ({ id: u.id, name: u.name }))
                .filter((m) => m && m.name);

            console.log("[Manager Expenses] Loaded", mrData.length, "MRs");
        } catch (error) {
            console.error("[Manager Expenses] Failed to load MRs:", error);
        }
    }

    // Show toast notification
    function showToast(message, type = "success") {
        const toastContainer = document.querySelector(".toast-container") || createToastContainer();
        const toast = document.createElement("div");
        toast.className = `toast align-items-center text-white bg-${type === "error" ? "danger" : "success"} border-0`;
        toast.setAttribute("role", "alert");
        toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${esc(message)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        toast.addEventListener("hidden.bs.toast", () => toast.remove());
    }

    function createToastContainer() {
        const container = document.createElement("div");
        container.className = "toast-container position-fixed top-0 end-0 p-3";
        container.style.zIndex = "9999";
        document.body.appendChild(container);
        return container;
    }

    // Render summary cards
    function renderSummary() {
        const el = document.getElementById("summaryCards");
        if (!el) return;

        const all = Array.isArray(expensesData) ? expensesData : [];
        const pending = all.filter((x) => (x.status || "").toUpperCase() === "PENDING").length;
        const approved = all.filter((x) => (x.status || "").toUpperCase() === "APPROVED").length;
        const rejected = all.filter((x) => (x.status || "").toUpperCase() === "REJECTED").length;
        const totalAmt = all.reduce((s, e) => s + (Number(e.amount) || 0), 0);

        el.innerHTML = `
      <div class="col-md-3">
        <div class="card summary-card summary-pending">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div><h4 class="mb-0">${pending}</h4><small>Pending</small></div>
            <i class="bi bi-clock fs-3 text-white"></i>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card summary-card summary-approved">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div><h4 class="mb-0">${approved}</h4><small>Approved</small></div>
            <i class="bi bi-check-circle fs-3 text-white"></i>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card summary-card summary-rejected">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div><h4 class="mb-0">${rejected}</h4><small>Rejected</small></div>
            <i class="bi bi-x-circle fs-3 text-white"></i>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card summary-card summary-total">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div><h5 class="mb-0">₹${totalAmt.toLocaleString()}</h5><small>Total</small></div>
            <i class="bi bi-cash-stack fs-3 text-white"></i>
          </div>
        </div>
      </div>
    `;
    }

    // Render table
    function renderTable(items) {
        const tbody = document.getElementById("expensesList");
        if (!tbody) return;

        items = Array.isArray(items) ? items : [];
        const total = items.length;
        const totalPages = Math.max(1, Math.ceil(total / perPage));
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * perPage;
        const pageItems = items.slice(start, start + perPage);

        tbody.innerHTML =
            pageItems
                .map((exp) => {
                    const isPending = (exp.status || "").toUpperCase() === "PENDING";
                    const isApproved = (exp.status || "").toUpperCase() === "APPROVED";
                    return `
        <tr>
          <td><i class="${catIcon(exp.category)} me-2"></i>${esc(exp.mrName)}</td>
          <td>${esc(exp.category)}</td>
          <td>₹${Number(exp.amount || 0).toFixed(2)}</td>
          <td>${statusBadge(exp.status)}</td>
          <td>${fmtDate(exp.submittedDate)}</td>
          <td class="table-actions">
            ${isPending ? `<button class="btn btn-outline-success btn-sm btn-approve me-1" data-id="${exp.id}" title="Approve"><i class="bi bi-check-lg"></i></button>` : `<button class="btn btn-outline-success btn-sm me-1 disabled-btn" disabled><i class="bi bi-check-lg"></i></button>`}
            <button class="btn btn-outline-primary btn-sm btn-edit me-1" data-id="${exp.id}" title="Edit"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger btn-sm btn-delete" data-id="${exp.id}" title="Delete"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
                })
                .join("") || `<tr><td colspan="6" class="text-center text-muted">No expenses found</td></tr>`;

        wireTableButtons();
        renderPagination(Math.max(1, Math.ceil(items.length / perPage)));
        const tableCount = document.getElementById("tableCount");
        if (tableCount) tableCount.textContent = `${items.length} item(s)`;
    }

    // Wire table buttons
    function wireTableButtons() {
        const tbody = document.getElementById("expensesList");
        if (!tbody) return;

        tbody.querySelectorAll(".btn-approve").forEach((b) => {
            b.removeEventListener("click", onApprove);
            b.addEventListener("click", onApprove);
        });
        tbody.querySelectorAll(".btn-edit").forEach((b) => {
            b.removeEventListener("click", onEdit);
            b.addEventListener("click", onEdit);
        });
        tbody.querySelectorAll(".btn-reject").forEach((b) => {
            b.removeEventListener("click", onReject);
            b.addEventListener("click", onReject);
        });
        tbody.querySelectorAll(".btn-delete").forEach((b) => {
            b.removeEventListener("click", onDelete);
            b.addEventListener("click", onDelete);
        });
    }

    // Pagination
    function renderPagination(totalPages) {
        const ul = document.getElementById("pagination");
        if (!ul) return;
        if (totalPages <= 1) {
            ul.innerHTML = "";
            return;
        }
        let html = `<li class="page-item ${currentPage === 1 ? "disabled" : ""}"><a class="page-link" href="#" data-page="prev">Prev</a></li>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<li class="page-item ${i === currentPage ? "active" : ""}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
        html += `<li class="page-item ${currentPage === totalPages ? "disabled" : ""}"><a class="page-link" href="#" data-page="next">Next</a></li>`;
        ul.innerHTML = html;
        ul.querySelectorAll(".page-link").forEach((a) => {
            a.removeEventListener("click", onPageClick);
            a.addEventListener("click", onPageClick);
        });
    }

    function onPageClick(e) {
        e.preventDefault();
        const page = e.currentTarget.dataset.page;
        const totalPages = Math.max(1, Math.ceil(currentFiltered.length / perPage));
        if (page === "prev" && currentPage > 1) currentPage--;
        else if (page === "next" && currentPage < totalPages) currentPage++;
        else if (!isNaN(Number(page))) currentPage = Number(page);
        renderTable(currentFiltered);
    }

    // Apply filters
    function applyFilters() {
        const q = (document.getElementById("searchExpense")?.value || "").trim().toLowerCase();
        const month = (document.getElementById("monthFilter")?.value || "");
        const status = (document.getElementById("filterStatus")?.value || "");

        currentFiltered = (Array.isArray(expensesData) ? expensesData : []).filter((e) => {
            let ok = true;
            if (q) {
                ok =
                    (e.mrName || "").toLowerCase().includes(q) ||
                    (e.description || "").toLowerCase().includes(q) ||
                    (e.category || "").toLowerCase().includes(q);
            }
            if (ok && month) {
                const d = new Date(e.expenseDate || e.submittedDate || "");
                const m = isNaN(d.getTime()) ? "" : d.toLocaleString("default", { month: "long" });
                ok = m === month;
            }
            if (ok && status) ok = (e.status || "").toUpperCase() === status.toUpperCase();
            return ok;
        });

        currentPage = 1;
        renderTable(currentFiltered);
    }

    // Action handlers
    async function onApprove(e) {
        const id = Number(e.currentTarget.dataset.id);
        const exp = expensesData.find(x => x.id === id);
        if (!exp) {
            showToast("Expense not found", "error");
            return;
        }

        if (!confirm(`Approve expense from ${exp.mrName}?\n\nCategory: ${exp.category}\nAmount: ₹${Number(exp.amount).toFixed(2)}\n\nClick OK to approve.`)) return;

        try {
            const approvedBy = localStorage.getItem("signup_name") || "Manager";
            await apiJson(`${EXPENSES_API}/${id}/approve`, {
                method: "PUT",
                body: JSON.stringify({ approvedBy }),
            });

            showToast(`✅ Expense approved! ₹${Number(exp.amount).toFixed(2)} from ${exp.mrName}`);
            await loadExpenses();
            applyFilters();
            renderSummary();
        } catch (error) {
            console.error("Approve error:", error);
            showToast("Failed to approve expense. Please try again.", "error");
        }
    }

    async function onReject(e) {
        const id = Number(e.currentTarget.dataset.id);
        const exp = expensesData.find(x => x.id === id);
        if (!exp) {
            showToast("Expense not found", "error");
            return;
        }

        const reason = prompt(`Reject expense from ${exp.mrName}?\n\nCategory: ${exp.category}\nAmount: ₹${Number(exp.amount).toFixed(2)}\n\nPlease enter rejection reason:`);
        if (!reason || !reason.trim()) {
            showToast("Rejection cancelled - reason is required", "error");
            return;
        }

        try {
            const rejectedBy = localStorage.getItem("signup_name") || "Manager";
            await apiJson(`${EXPENSES_API}/${id}/reject`, {
                method: "PUT",
                body: JSON.stringify({ rejectedBy, reason: reason.trim() }),
            });

            showToast(`❌ Expense rejected: ${exp.mrName} - ${exp.category}`);
            await loadExpenses();
            applyFilters();
            renderSummary();
        } catch (error) {
            console.error("Reject error:", error);
            showToast("Failed to reject expense. Please try again.", "error");
        }
    }

    async function onDelete(e) {
        const id = Number(e.currentTarget.dataset.id);
        const exp = expensesData.find((x) => x.id === id);
        if (!exp) {
            showToast("Expense not found", "error");
            return;
        }

        if (!confirm(`⚠️ DELETE EXPENSE?\n\nMR: ${exp.mrName}\nCategory: ${exp.category}\nAmount: ₹${Number(exp.amount).toFixed(2)}\nStatus: ${exp.status}\n\nThis action cannot be undone. Click OK to delete.`)) return;

        try {
            await apiJson(`${EXPENSES_API}/${id}`, { method: "DELETE" });
            showToast(`🗑️ Expense deleted: ${exp.mrName} - ₹${Number(exp.amount).toFixed(2)}`);
            await loadExpenses();
            applyFilters();
            renderSummary();
        } catch (error) {
            console.error("Delete error:", error);
            showToast("Failed to delete expense. Please try again.", "error");
        }
    }

    function onEdit(e) {
        const id = Number(e.currentTarget.dataset.id);
        openEditModal(id);
    }

    // Edit modal
    function openEditModal(id) {
        const exp = expensesData.find((x) => x.id === id);
        if (!exp) return alert("Expense not found");

        // Create modal if doesn't exist
        if (!document.getElementById("editExpenseModal")) {
            const html = `
        <div class="modal fade" id="editExpenseModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header"><h5 class="modal-title">Edit Expense</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
              <div class="modal-body">
                <form id="editExpenseForm">
                  <input type="hidden" id="editExpenseId" />
                  <div class="row g-2">
                    <div class="col-md-6"><label class="form-label">MR</label><select id="editMrSelect" class="form-select"></select></div>
                    <div class="col-md-6"><label class="form-label">Category</label>
                      <select id="editCategorySelect" class="form-select">
                        <option value="">Select category</option>
                        <option value="Travel">Travel</option>
                        <option value="Meals">Meals</option>
                        <option value="Accommodation">Accommodation</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Fuel">Fuel</option>
                        <option value="Miscellaneous">Miscellaneous</option>
                      </select>
                    </div>
                  </div>
                  <div class="row g-2 mt-2">
                    <div class="col-md-6"><label class="form-label">Amount</label><input id="editAmount" type="number" step="0.01" class="form-control" required /></div>
                    <div class="col-md-6"><label class="form-label">Expense Date</label><input id="editExpenseDate" type="date" class="form-control" required /></div>
                  </div>
                  <div class="mt-2"><label class="form-label">Description</label><textarea id="editDescription" rows="3" class="form-control"></textarea></div>
                  <div class="row g-2 mt-3">
                    <div class="col-md-6"><label class="form-label">Status</label><select id="editStatus" class="form-select"><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></div>
                    <div class="col-md-6" id="rejectionReasonContainer" style="display: none;"><label class="form-label">Rejection Reason</label><input id="editRejectionReason" class="form-control" placeholder="Provide reason for rejection" /></div>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button id="saveEditBtn" class="btn btn-primary">Save</button>
                <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      `;
            document.body.insertAdjacentHTML("beforeend", html);

            // Toggle rejection reason visibility
            const statusSelect = document.getElementById("editStatus");
            const reasonContainer = document.getElementById("rejectionReasonContainer");
            const toggleReason = () => {
                reasonContainer.style.display = statusSelect.value === "REJECTED" ? "block" : "none";
            };
            statusSelect.addEventListener("change", toggleReason);

            // Populate MR select
            const mrSel = document.getElementById("editMrSelect");
            if (mrSel) {
                const mrs = mrData.length > 0 ? mrData : [...new Set(expensesData.map(e => e.mrName))].map(name => ({ name }));
                mrSel.innerHTML = mrs.map((m) => `<option value="${esc(m.name)}">${esc(m.name)}</option>`).join("");
            }

            // Save handler
            document.getElementById("saveEditBtn").addEventListener("click", async () => {
                const id = Number(document.getElementById("editExpenseId").value);
                const category = document.getElementById("editCategorySelect").value || "";
                const amount = parseFloat(document.getElementById("editAmount").value) || 0;
                const expenseDate = document.getElementById("editExpenseDate").value;
                const description = document.getElementById("editDescription").value;
                const status = document.getElementById("editStatus").value;
                const rejectionReason = document.getElementById("editRejectionReason").value;

                if (!category) {
                    showToast("Please select a category", "error");
                    return;
                }
                if (!expenseDate) {
                    showToast("Please select an expense date", "error");
                    return;
                }
                if (amount <= 0) {
                    showToast("Amount must be greater than 0", "error");
                    return;
                }

                // Validate rejection reason if status is REJECTED
                if (status === "REJECTED" && (!rejectionReason || !rejectionReason.trim())) {
                    showToast("Rejection reason is required when status is Rejected", "error");
                    return;
                }

                try {
                    // Update expense including status
                    await apiJson(`${EXPENSES_API}/${id}`, {
                        method: "PUT",
                        body: JSON.stringify({
                            category,
                            amount,
                            description,
                            expenseDate,
                            status,
                            rejectionReason
                        }),
                    });

                    const statusMsg = status === "APPROVED" ? "✅ Approved" : status === "REJECTED" ? "❌ Rejected" : "📝 Updated";
                    showToast(`${statusMsg}: ${category} - ₹${amount.toFixed(2)}`);
                    bootstrap.Modal.getInstance(document.getElementById("editExpenseModal"))?.hide();
                    await loadExpenses();
                    applyFilters();
                    renderSummary();
                } catch (error) {
                    console.error("Update error:", error);
                    showToast("Failed to update expense", "error");
                }
            });
        }

        // Populate form
        document.getElementById("editExpenseId").value = String(exp.id);
        document.getElementById("editMrSelect").value = exp.mrName || "";
        document.getElementById("editCategorySelect").value = exp.category || "";
        document.getElementById("editAmount").value = Number(exp.amount || 0);
        document.getElementById("editExpenseDate").value = exp.expenseDate || "";
        document.getElementById("editDescription").value = exp.description || "";
        document.getElementById("editStatus").value = exp.status ? exp.status.toUpperCase() : "PENDING";
        document.getElementById("editRejectionReason").value = exp.rejectionReason || "";

        // Initial visibility check
        document.getElementById("rejectionReasonContainer").style.display = (exp.status || "").toUpperCase() === "REJECTED" ? "block" : "none";

        const modal = new bootstrap.Modal(document.getElementById("editExpenseModal"));
        modal.show();
    }

    // Add expense
    function wireAdd() {
        const sel = document.getElementById("addMrSelect");
        function renderMrOptions() {
            if (sel && Array.isArray(mrData)) {
                sel.innerHTML = `<option value="">Select MR</option>` + mrData.map((m) => `<option value="${esc(m.name)}">${esc(m.name)}</option>`).join("");
            }
        }

        renderMrOptions();

        const form = document.getElementById("addExpenseForm");
        if (!form || addExpenseWired) return;
        addExpenseWired = true;

        form.addEventListener("submit", async (ev) => {
            ev.preventDefault();

            const mrName = document.getElementById("addMrSelect").value;
            const category = (document.getElementById("addCategory")?.value || "").trim();
            const amount = parseFloat(document.getElementById("addAmount").value) || 0;
            const expenseDate = document.getElementById("addExpenseDate").value;
            const description = document.getElementById("addDescription").value;
            const fileEl = document.getElementById("addAttachment");

            if (!mrName) {
                showToast("Please select an MR", "error");
                return;
            }
            if (!category) {
                showToast("Please select a category", "error");
                return;
            }
            if (!expenseDate) {
                showToast("Please select an expense date", "error");
                return;
            }
            if (amount <= 0) {
                showToast("Amount must be greater than 0", "error");
                return;
            }

            try {
                const formData = new FormData();
                formData.append("mrName", mrName);
                formData.append("category", category);
                formData.append("amount", amount);
                formData.append("description", description || "");
                formData.append("expenseDate", expenseDate);

                if (fileEl && fileEl.files && fileEl.files[0]) {
                    formData.append("receipt", fileEl.files[0]);
                }

                await apiJson(`${EXPENSES_API}/with-receipt`, {
                    method: "POST",
                    body: formData,
                });

                showToast(`✅ Expense added: ${mrName} - ₹${amount.toFixed(2)}`);
                form.reset();
                bootstrap.Modal.getInstance(document.getElementById("addExpenseModal"))?.hide();
                await loadExpenses();
                applyFilters();
                renderSummary();
            } catch (error) {
                console.error("Add expense error:", error);
                showToast("Failed to add expense", "error");
            }
        });
    }

    // Initialization
    document.addEventListener("DOMContentLoaded", async () => {
        console.log("[Manager Expenses] Initializing...");

        // Load data
        await Promise.all([loadExpenses(), loadMRs()]);

        // Render
        renderSummary();
        applyFilters();

        // Wire filters
        document.getElementById("searchExpense")?.addEventListener("input", applyFilters);
        document.getElementById("monthFilter")?.addEventListener("change", applyFilters);
        document.getElementById("filterStatus")?.addEventListener("change", applyFilters);

        // Wire add expense
        wireAdd();

        console.log("[Manager Expenses] Initialization complete");
    });
})();
