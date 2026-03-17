document.addEventListener("DOMContentLoaded", () => {
  // const API_BASE = window.location.port === "5500" ? "http://localhost:8080" : "";
  const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? (window.location.port === "8080" ? "" : "http://localhost:8080")
    : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");
  const EXPENSES_API_BASE = `${API_BASE}/api/expenses`;
  const STORAGE_KEY = "kavyaPharmAdminExpensesData";
  let expensesApiMode = true;

  const cardsContainer = document.getElementById("expenseCards");
  const form = document.getElementById("expenseForm");
  const searchInput = document.getElementById("searchExpense");
  const monthFilter = document.getElementById("monthFilter");
  const statusFilter = document.getElementById("statusFilter");
  const pagination = document.getElementById("pagination");

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

  async function uploadFile(file) {
    if (!file) return "";
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: getAuthHeader(),
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        return data.filename;
      }
    } catch (e) {
      console.error("Upload failed", e);
    }
    return file.name;
  }

  function toUiStatus(s) {
    const v = String(s || "").toLowerCase();
    if (v === "approved") return "Approved";
    if (v === "rejected") return "Rejected";
    return "Pending";
  }

  function toApiStatus(s) {
    const v = String(s || "").toLowerCase();
    if (v.includes("approved")) return "approved";
    if (v.includes("rejected")) return "rejected";
    return "pending";
  }

  function billUrlFromAttachments(storedFilename) {
    if (!storedFilename) return "";
    return `/uploads/receipts/${storedFilename}`;
  }

  function normalizeExpenseFromApi(e) {
    const storedFilename = e.receiptPath ? e.receiptPath.split(/[\\/]/).pop() : null;
    return {
      id: Number(e.id),
      person: e.mrName,
      type: e.category,
      amount: Number(e.amount) || 0,
      date: e.expenseDate ? String(e.expenseDate) : (e.submittedDate ? String(e.submittedDate) : ""),
      status: toUiStatus(e.status),
      bill: billUrlFromAttachments(storedFilename),
      originalName: e.receiptFilename || ""
    };
  }

  async function refreshExpensesFromApiOrFallback() {
    try {
      const data = await apiJson(EXPENSES_API_BASE);
      if (Array.isArray(data)) {
        expenses = data.map(normalizeExpenseFromApi);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
        expensesApiMode = true;
        return;
      }
      expensesApiMode = false;
    } catch (e) {
      console.warn("Expenses API unavailable, using localStorage.", e);
      expensesApiMode = false;
    }
  }

  async function createExpenseApi(payload) {
    return await apiJson(EXPENSES_API_BASE, { method: "POST", body: JSON.stringify(payload) });
  }

  async function updateExpenseApi(id, payload) {
    return await apiJson(`${EXPENSES_API_BASE}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  }

  async function deleteExpenseApi(id) {
    await apiJson(`${EXPENSES_API_BASE}/${id}`, { method: "DELETE" });
  }

  function loadExpensesFromStorageIfAny() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) expenses = parsed;
    } catch (e) {
      console.warn("Failed to parse stored admin expenses.", e);
    }
  }

  let expenses = [];

  let currentPage = 1;
  const itemsPerPage = 4;
  let editIndex = null;

  // ---------------------------------------------------------
  // ðŸ”¥ Render Cards
  // ---------------------------------------------------------
  function renderCards() {
    let filtered = expenses.filter(
      (e) =>
        (e.person.toLowerCase().includes(searchInput.value.toLowerCase()) ||
          e.type.toLowerCase().includes(searchInput.value.toLowerCase())) &&
        (monthFilter.value === "" ||
          new Date(e.date).toLocaleString("default", { month: "long" }) ===
          monthFilter.value) &&
        (statusFilter.value === "" || e.status === statusFilter.value)
    );

    // Sort: Pending first, then by date (newest first)
    filtered.sort((a, b) => {
      const isAPending = (a.status || "").toUpperCase() === "PENDING";
      const isBPending = (b.status || "").toUpperCase() === "PENDING";
      
      if (isAPending && !isBPending) return -1;
      if (!isAPending && isBPending) return 1;
      
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA; // descending
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);

    cardsContainer.innerHTML =
      paginated
        .map(
          (e, i) => `
        <div class="col-md-3 col-sm-6">
          <div class="card expense-card shadow-sm border-0 h-100">
            <div class="card-body">
              <h5 class="card-title text-success">${e.type}</h5>
              <p><strong>MR:</strong> ${e.person}</p>
              <p><strong>Amount:</strong> \u20B9${e.amount}</p>
              <p><strong>Date:</strong> ${e.date}</p>
              <p><strong>Receipt:</strong> ${e.bill
              ? `<a href="${e.bill}" target="_blank" class="text-primary" title="${e.originalName || 'View Bill'}"><i class="bi bi-paperclip"></i> ${e.originalName || 'View Bill'}</a>`
              : `<span class="text-muted">Not Uploaded</span>`
            }</p>
              <span class="badge ${e.status === "Approved"
              ? "bg-success"
              : e.status === "Rejected"
                ? "bg-danger"
                : "bg-warning text-dark"
            }">${e.status}</span>
            </div>

            <div class="card-footer bg-transparent border-0 pt-0">
              ${e.status === "Pending"
              ? `
                  <div class="d-flex gap-2 w-100 mt-2">
                    <button class="btn btn-sm btn-outline-success flex-grow-1 shadow-sm py-1" onclick="approveExpense(${e.id})">
                      <i class="bi bi-check-lg pe-1"></i> Approve
                    </button>
                    <button class="btn btn-sm btn-outline-danger flex-grow-1 shadow-sm py-1" onclick="rejectExpense(${e.id})">
                      <i class="bi bi-x-lg pe-1"></i> Reject
                    </button>
                  </div>`
              : ""
            }
            </div>
          </div>
        </div>`
        )
        .join("") || `<p class="text-center text-muted">No expenses found</p>`;

    renderPagination(totalPages);
  }

  // ---------------------------------------------------------
  // ðŸ”¥ Pagination (Previous + Numbers + Next)
  // ---------------------------------------------------------
  function renderPagination(totalPages) {
    pagination.innerHTML = "";
    if (totalPages <= 1) return;

    let html = `
      <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
        <a class="page-link" href="#" data-page="prev">Previous</a>
      </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
      html += `
        <li class="page-item ${i === currentPage ? "active" : ""}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `;
    }

    html += `
      <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
        <a class="page-link" href="#" data-page="next">Next</a>
      </li>
    `;

    pagination.innerHTML = html;

    document.querySelectorAll(".page-link").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const value = btn.dataset.page;

        if (value === "prev" && currentPage > 1) currentPage--;
        else if (value === "next" && currentPage < totalPages) currentPage++;
        else if (!isNaN(value)) currentPage = parseInt(value);

        renderCards();
      })
    );
  }

  // ---------------------------------------------------------
  // ðŸ”¥ Validation
  // ---------------------------------------------------------
  function validateForm() {
    const name = form.expensePerson.value.trim();
    const type = form.expenseType.value.trim();
    const amount = Number(form.expenseAmount.value);
    const date = form.expenseDate.value;
    const nameRegex = /^[A-Za-z\s]+$/;

    if (!name || !type || !amount || !date) {
      alert("âš ï¸ Please fill all fields.");
      return false;
    }

    if (!nameRegex.test(name)) {
      alert("âš  MR Name must contain only letters.");
      return false;
    }

    if (amount <= 0) {
      alert("âš  Amount must be positive.");
      return false;
    }

    return true;
  }

  // ---------------------------------------------------------
  // ðŸ”¥ CRUD Operations
  // ---------------------------------------------------------
  window.approveExpense = (id) => {
    const idx = expenses.findIndex((x) => Number(x.id) === Number(id));
    if (idx === -1) return;
    expenses[idx].status = "Approved";

    (async function () {
      if (expensesApiMode) {
        try {
          await updateExpenseApi(id, {
            mrName: expenses[idx].person,
            category: expenses[idx].type,
            amount: Number(expenses[idx].amount) || 0,
            status: "approved",
            expenseDate: expenses[idx].date || null,
            description: "",
            attachments: expenses[idx].attachments || [],
            approvedBy: localStorage.getItem("signup_name") || "Admin",
            approvedDate: new Date().toISOString().split("T")[0],
            rejectionReason: null,
          });
          await refreshExpensesFromApiOrFallback();
        } catch (e) {
          console.warn("Expense approve API failed. Falling back to localStorage.", e);
          expensesApiMode = false;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      renderCards();
    })();
  };

  window.rejectExpense = (id) => {
    const idx = expenses.findIndex((x) => Number(x.id) === Number(id));
    if (idx === -1) return;
    expenses[idx].status = "Rejected";

    (async function () {
      if (expensesApiMode) {
        try {
          await updateExpenseApi(id, {
            mrName: expenses[idx].person,
            category: expenses[idx].type,
            amount: Number(expenses[idx].amount) || 0,
            status: "rejected",
            expenseDate: expenses[idx].date || null,
            description: "",
            attachments: expenses[idx].attachments || [],
            approvedBy: localStorage.getItem("signup_name") || "Admin",
            approvedDate: new Date().toISOString().split("T")[0],
            rejectionReason: "Rejected",
          });
          await refreshExpensesFromApiOrFallback();
        } catch (e) {
          console.warn("Expense reject API failed. Falling back to localStorage.", e);
          expensesApiMode = false;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      renderCards();
    })();
  };

  /*
  window.deleteExpense = (id) => {
    if (!confirm("Delete this expense?")) return;

    (async function () {
      if (expensesApiMode) {
        try {
          await deleteExpenseApi(id);
          await refreshExpensesFromApiOrFallback();
          renderCards();
          return;
        } catch (e) {
          console.warn("Expense delete API failed. Falling back to localStorage.", e);
          expensesApiMode = false;
        }
      }
      const idx = expenses.findIndex((x) => Number(x.id) === Number(id));
      if (idx !== -1) expenses.splice(idx, 1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      renderCards();
    })();
  };

  window.editExpense = (id) => {
    const e = expenses.find((x) => Number(x.id) === Number(id));
    if (!e) return;
    editIndex = Number(id);

    form.expensePerson.value = e.person;
    form.expenseType.value = e.type;
    form.expenseAmount.value = e.amount;
    form.expenseDate.value = e.date;
    form.expenseStatus.value = e.status;

    new bootstrap.Modal(document.getElementById("expenseModal")).show();
  };

  // ---------------------------------------------------------
  // 🔥 Add / Update Expense
  // ---------------------------------------------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const billFile = form.expenseBill.files[0];
    const category = form.expenseType.value.trim();
    const amount = Number(form.expenseAmount.value) || 0;
    const expenseDate = form.expenseDate.value;
    const mrName = form.expensePerson.value.trim();
    const description = "";
    const status = toApiStatus(form.expenseStatus.value);

    (async function () {
      if (expensesApiMode) {
        try {
          const formData = new FormData();
          formData.append("category", category);
          formData.append("amount", amount);
          formData.append("expenseDate", expenseDate);
          formData.append("description", description);
          formData.append("status", status);
          if (billFile) {
            formData.append("receipt", billFile);
          }

          if (editIndex !== null) {
            // Update
            await fetch(`${EXPENSES_API}/$ {editIndex}/with-receipt`, {
              method: "PUT",
              headers: getAuthHeader(),
              body: formData
            });
          } else {
            // Create
            formData.append("mrName", mrName);
            await fetch(`${EXPENSES_API}/with-receipt`, {
              method: "POST",
              headers: getAuthHeader(),
              body: formData
            });
          }

          await refreshExpensesFromApiOrFallback();
          form.reset();
          bootstrap.Modal.getInstance(document.getElementById("expenseModal")).hide();
          editIndex = null;
          renderCards();
          return;
        } catch (e) {
          console.warn("Expense save API failed. Falling back to localStorage.", e);
          expensesApiMode = false;
        }
      }

      // Fallback for localStorage (offline mode)
      const data = {
        id: editIndex !== null ? Number(editIndex) : Date.now(),
        person: mrName,
        type: category,
        amount: amount,
        date: expenseDate,
        status: form.expenseStatus.value,
        bill: billFile ? URL.createObjectURL(billFile) : "",
        attachments: billFile ? [billFile.name] : [],
      };

      if (editIndex !== null) {
        const idx = expenses.findIndex((x) => Number(x.id) === Number(editIndex));
        if (idx !== -1) expenses[idx] = data;
        editIndex = null;
      } else {
        expenses.push(data);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      form.reset();
      bootstrap.Modal.getInstance(document.getElementById("expenseModal")).hide();
      renderCards();
    })();
  });
  */

  // ---------------------------------------------------------
  // ðŸ”¥ Filters
  // ---------------------------------------------------------
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderCards();
  });

  monthFilter.addEventListener("change", () => {
    currentPage = 1;
    renderCards();
  });

  statusFilter.addEventListener("change", () => {
    currentPage = 1;
    renderCards();
  });

  loadExpensesFromStorageIfAny();
  (async function () {
    await refreshExpensesFromApiOrFallback();
    renderCards();
  })();
});

