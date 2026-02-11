// MR Dashboard - Expense Management (API-Connected Version)
// This file replaces static data with dynamic API calls

document.addEventListener("DOMContentLoaded", async () => {
    // const API_BASE = window.location.port === "5500" ? "http://localhost:8080" : "";
    const API_BASE = window.API_BASE || "/api";

    const EXPENSES_API = `${API_BASE}/api/expenses`;

    const PAGE_SIZE = 5;
    let currentPage = 1;
    let expenseList = [];

    // Elements
    const addExpenseModalEl = document.getElementById("addExpenseModal");
    const editExpenseModalEl = document.getElementById("editExpenseModal");
    const addExpenseModal = new bootstrap.Modal(addExpenseModalEl);
    const editExpenseModal = new bootstrap.Modal(editExpenseModalEl);
    const paginationUl = document.getElementById("expensePagination");
    const paginationInfo = document.getElementById("paginationInfo");
    const btnSave = document.getElementById("saveExpenseBtn");
    const btnUpdate = document.getElementById("updateExpenseBtn");

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

    // Toast notification
    function showToast(message, type = 'success') {
        const toastContainer = document.querySelector(".toast-container") || createToastContainer();
        const toast = document.createElement("div");
        toast.className = `toast align-items-center text-white bg-${type === "error" ? "danger" : "success"} border-0`;
        toast.setAttribute("role", "alert");
        toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
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

    // Load expenses from API
    async function loadExpenses() {
        try {
            const mrName = localStorage.getItem("signup_name") || "";
            if (!mrName) {
                console.warn("[MR Expenses] No MR name in localStorage");
                return [];
            }

            console.log("[MR Expenses] Loading expenses for:", mrName);
            const data = await apiJson(`${EXPENSES_API}/mr/${encodeURIComponent(mrName)}`);
            const expenses = Array.isArray(data) ? data : [];

            // Transform to match UI format
            return expenses.map(exp => ({
                id: exp.id,
                category: exp.category,
                amount: exp.amount,
                date: exp.expenseDate,
                desc: exp.description || "",
                attachment: exp.receiptFilename || null,
                status: (exp.status || "PENDING").charAt(0).toUpperCase() + (exp.status || "pending").slice(1).toLowerCase(),
                submittedDate: exp.submittedDate,
                rejectionReason: exp.rejectionReason
            }));
        } catch (error) {
            console.error("[MR Expenses] Failed to load expenses:", error);
            showToast("Failed to load expenses. Please refresh the page.", "error");
            return [];
        }
    }

    // Status badge
    function getStatusBadge(status) {
        const statusMap = {
            Pending: '<span class="badge bg-warning text-dark">Pending</span>',
            Approved: '<span class="badge bg-success">Approved</span>',
            Rejected: '<span class="badge bg-danger">Rejected</span>',
        };
        return statusMap[status] || `<span class="badge bg-secondary">${status}</span>`;
    }

    // Attachment link
    function getAttachmentLink(filename) {
        if (!filename) return '<span class="text-muted">No attachment</span>';
        return `<a href="/uploads/receipts/${filename}" target="_blank" class="text-primary"><i class="bi bi-paperclip"></i> ${filename}</a>`;
    }

    // Render pagination
    function renderPagination() {
        const totalPages = Math.ceil(expenseList.length / PAGE_SIZE);

        function createPageItem(page, text, disabled = false) {
            const li = document.createElement("li");
            li.className = `page-item ${disabled ? "disabled" : ""} ${page === currentPage ? "active" : ""}`;
            const a = document.createElement("a");
            a.className = "page-link";
            a.href = "#";
            a.textContent = text;
            if (!disabled) {
                a.addEventListener("click", (e) => {
                    e.preventDefault();
                    currentPage = page;
                    render();
                });
            }
            li.appendChild(a);
            return li;
        }

        paginationUl.innerHTML = "";

        if (totalPages <= 1) {
            paginationInfo.textContent = `Showing ${expenseList.length} of ${expenseList.length}`;
            return;
        }

        paginationUl.appendChild(createPageItem(currentPage - 1, "Previous", currentPage === 1));

        for (let i = 1; i <= totalPages; i++) {
            paginationUl.appendChild(createPageItem(i, i));
        }

        paginationUl.appendChild(createPageItem(currentPage + 1, "Next", currentPage === totalPages));

        const start = (currentPage - 1) * PAGE_SIZE + 1;
        const end = Math.min(currentPage * PAGE_SIZE, expenseList.length);
        paginationInfo.textContent = `Showing ${start} to ${end} of ${expenseList.length}`;
    }

    // Render table
    function render() {
        const tbody = document.getElementById("expenseTableBody");
        if (!tbody) return;

        const start = (currentPage - 1) * PAGE_SIZE;
        const pageExpenses = expenseList.slice(start, start + PAGE_SIZE);

        if (pageExpenses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No expenses found</td></tr>';
            renderPagination();
            return;
        }

        tbody.innerHTML = pageExpenses.map((expense, index) => {
            const globalIndex = start + index;
            const isPending = expense.status === "Pending";

            return `
        <tr>
          <td>${globalIndex + 1}</td>
          <td>${expense.category}</td>
          <td>₹${Number(expense.amount).toFixed(2)}</td>
          <td>${new Date(expense.date).toLocaleDateString()}</td>
          <td>${expense.desc || "-"}</td>
          <td>${getAttachmentLink(expense.attachment)}</td>
          <td>${getStatusBadge(expense.status)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" data-index="${globalIndex}" data-bs-toggle="modal" data-bs-target="#editExpenseModal" ${!isPending ? 'disabled' : ''}>
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense(${globalIndex})" ${!isPending ? 'disabled' : ''}>
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
        }).join("");

        renderPagination();
    }

    // Validate add inputs
    function validateAddInputs() {
        const category = document.getElementById("expCategory").value;
        const amount = document.getElementById("expAmount").value;
        const date = document.getElementById("expDate").value;

        if (!category || !amount || !date) {
            showToast("Please fill all required fields", "error");
            return false;
        }

        if (parseFloat(amount) <= 0) {
            showToast("Amount must be greater than 0", "error");
            return false;
        }

        return true;
    }

    // Save new expense
    btnSave.addEventListener("click", async () => {
        if (!validateAddInputs()) return;

        try {
            const mrName = localStorage.getItem("signup_name") || "";
            const fileInput = document.getElementById("expAttachmentFile");

            const formData = new FormData();
            formData.append("mrName", mrName);
            formData.append("category", document.getElementById("expCategory").value);
            formData.append("amount", document.getElementById("expAmount").value);
            formData.append("description", document.getElementById("expDesc").value);
            formData.append("expenseDate", document.getElementById("expDate").value);

            if (fileInput.files && fileInput.files[0]) {
                formData.append("receipt", fileInput.files[0]);
            }

            await apiJson(`${EXPENSES_API}/with-receipt`, {
                method: "POST",
                body: formData,
            });

            // Reset form
            document.getElementById("expCategory").value = "";
            document.getElementById("expAmount").value = "";
            document.getElementById("expDate").value = "";
            document.getElementById("expDesc").value = "";
            fileInput.value = "";

            addExpenseModal.hide();
            showToast("Expense submitted successfully!");

            // Reload expenses
            expenseList = await loadExpenses();
            currentPage = 1;
            render();
        } catch (error) {
            console.error("Add expense error:", error);
            showToast("Failed to submit expense", "error");
        }
    });

    // Delete expense
    window.deleteExpense = async function (index) {
        const expense = expenseList[index];
        if (!expense) return;

        if (expense.status !== "Pending") {
            showToast("Only pending expenses can be deleted", "error");
            return;
        }

        if (!confirm(`Delete expense: ${expense.category} - ₹${expense.amount}?`)) return;

        try {
            await apiJson(`${EXPENSES_API}/${expense.id}`, { method: "DELETE" });
            showToast("Expense deleted successfully!");

            expenseList = await loadExpenses();
            render();
        } catch (error) {
            console.error("Delete error:", error);
            showToast("Failed to delete expense", "error");
        }
    };

    // Populate edit modal
    editExpenseModalEl.addEventListener('show.bs.modal', (event) => {
        const button = event.relatedTarget;
        const index = button.getAttribute('data-index');
        const expense = expenseList[index];

        if (!expense) return;

        editExpenseModalEl.setAttribute('data-expense-index', index);
        document.getElementById("editCategory").value = expense.category;
        document.getElementById("editAmount").value = expense.amount;
        document.getElementById("editDate").value = expense.date;
        document.getElementById("editDesc").value = expense.desc;
        document.getElementById("editAttachmentFile").value = '';
    });

    // Validate edit inputs
    function validateEditInputs() {
        const category = document.getElementById("editCategory").value;
        const amount = document.getElementById("editAmount").value;
        const date = document.getElementById("editDate").value;

        if (!category || !amount || !date) {
            showToast("Please fill all required fields", "error");
            return false;
        }

        if (parseFloat(amount) <= 0) {
            showToast("Amount must be greater than 0", "error");
            return false;
        }

        return true;
    }

    // Update expense
    btnUpdate.addEventListener("click", async () => {
        if (!validateEditInputs()) return;

        try {
            const index = editExpenseModalEl.getAttribute('data-expense-index');
            const expense = expenseList[index];

            if (!expense) {
                showToast("Expense not found", "error");
                return;
            }

            const fileInput = document.getElementById("editAttachmentFile");
            const hasFile = fileInput.files && fileInput.files[0];

            if (hasFile) {
                // Update with file
                const formData = new FormData();
                formData.append("category", document.getElementById("editCategory").value);
                formData.append("amount", document.getElementById("editAmount").value);
                formData.append("description", document.getElementById("editDesc").value);
                formData.append("expenseDate", document.getElementById("editDate").value);
                formData.append("receipt", fileInput.files[0]);

                await apiJson(`${EXPENSES_API}/${expense.id}/with-receipt`, {
                    method: "PUT",
                    body: formData,
                });
            } else {
                // Update without file
                await apiJson(`${EXPENSES_API}/${expense.id}`, {
                    method: "PUT",
                    body: JSON.stringify({
                        category: document.getElementById("editCategory").value,
                        amount: parseFloat(document.getElementById("editAmount").value),
                        description: document.getElementById("editDesc").value,
                        expenseDate: document.getElementById("editDate").value,
                    }),
                });
            }

            editExpenseModal.hide();
            showToast("Expense updated successfully!");

            expenseList = await loadExpenses();
            render();
        } catch (error) {
            console.error("Update error:", error);
            showToast("Failed to update expense", "error");
        }
    });

    // Initialize
    console.log("[MR Expenses] Initializing...");
    expenseList = await loadExpenses();
    render();
    console.log("[MR Expenses] Loaded", expenseList.length, "expenses");
});
