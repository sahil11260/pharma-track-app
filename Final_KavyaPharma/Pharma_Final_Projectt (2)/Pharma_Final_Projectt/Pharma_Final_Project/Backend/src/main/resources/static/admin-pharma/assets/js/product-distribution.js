// product-distribution.js
// Product Distribution with Price Display
document.addEventListener("DOMContentLoaded", () => {

  const API_BASE = "";
  const PRODUCTS_API_BASE = `${API_BASE}/api/products`;
  const STOCK_STORAGE_KEY = "receivedStock";
  const ALLOCATIONS_STORAGE_KEY = "allocations";
  const ALT_STOCK_STORAGE_KEY = "kavyaPharmAdminProductStockData";
  const ALT_ALLOCATIONS_STORAGE_KEY = "kavyaPharmAdminProductAllocationsData";
  let productsApiMode = true;
  const USERS_API_BASE = `${API_BASE}/api/users`;

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

  function parsePrice(value) {
    const n = parseFloat(String(value || "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function saveStockToStorage() {
    try {
      localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(receivedStock));
    } catch (e) { }
  }

  function saveAllocationsToStorage() {
    try {
      localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(allocations));
    } catch (e) { }
  }

  function loadFromStorageIfAny() {
    try {
      const rawAlloc = localStorage.getItem(ALLOCATIONS_STORAGE_KEY) || localStorage.getItem(ALT_ALLOCATIONS_STORAGE_KEY);
      if (rawAlloc) {
        const parsed = JSON.parse(rawAlloc);
        if (Array.isArray(parsed)) allocations = parsed;
        localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(allocations));
      } else {
        localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(allocations));
      }
    } catch (e) { }

    try {
      const rawStock = localStorage.getItem(STOCK_STORAGE_KEY) || localStorage.getItem(ALT_STOCK_STORAGE_KEY);
      if (rawStock) {
        const parsed = JSON.parse(rawStock);
        if (Array.isArray(parsed)) receivedStock = parsed;
        localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(receivedStock));
      }
    } catch (e) { }
  }

  let allManagers = [];
  let allMRs = [];
  async function refreshUsersFromApi() {
    try {
      const users = await apiJson(USERS_API_BASE);
      if (Array.isArray(users)) {
        allManagers = users.filter(u => u.role === "MANAGER" || u.role === "ADMIN" || u.role === "SUPERADMIN");
        allMRs = users.filter(u => u.role === "MR");
        populateManagerSelect();
        populateMrSelect();
      }
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
  }

  function populateManagerSelect() {
    const mSelect = document.getElementById("managerSelect");
    if (!mSelect) return;
    const currentVal = mSelect.value;
    mSelect.innerHTML = '<option value="">Select a Manager</option>' +
      allManagers.map(m => `<option value="${m.name}">${m.name}</option>`).join("");
    if (currentVal) mSelect.value = currentVal;
  }

  function populateMrSelect() {
    const mrSelect = document.getElementById("mrSelect");
    if (!mrSelect) return;
    const currentVal = mrSelect.value;
    mrSelect.innerHTML = '<option value="">Select an MR</option>' +
      allMRs.map(m => `<option value="${m.name}">${m.name}</option>`).join("");
    if (currentVal) mrSelect.value = currentVal;
  }

  async function refreshStockFromApiOrFallback() {
    try {
      const data = await apiJson(PRODUCTS_API_BASE);
      if (Array.isArray(data)) {
        receivedStock = data.map((p) => ({
          id: Number(p.id),
          name: p.name,
          available: Number(p.stock) || 0,
          price: parsePrice(p.price),
          priceStr: String(p.price || "0"),
          category: p.category || "General",
          description: p.description || p.desc || ""
        }));
        saveStockToStorage();
        productsApiMode = true;
        hideApiRetryBanner();
        return;
      }
      productsApiMode = false;
      showApiRetryBanner();
    } catch (e) {
      console.warn("Products API unavailable, using localStorage.", e);
      productsApiMode = false;
      showApiRetryBanner();
    }
  }

  async function updateProductStockApi(product, newStock) {
    if (!product || product.id == null) return;
    const payload = {
      name: product.name,
      category: product.category || "General",
      price: String(product.priceStr != null ? product.priceStr : (product.price != null ? product.price : "0")),
      stock: Number(newStock) || 0,
      description: product.description || ""
    };
    return await apiJson(`${PRODUCTS_API_BASE}/${product.id}`, { method: "PUT", body: JSON.stringify(payload) });
  }

  // Dynamic stock & allocations (API-first)
  let receivedStock = [];
  let allocations = [];

  function showApiRetryBanner() {
    if (document.getElementById("productDistApiRetryBanner")) return;
    const banner = document.createElement("div");
    banner.id = "productDistApiRetryBanner";
    banner.className = "alert alert-warning text-center";
    banner.style.margin = "10px 0";
    banner.innerHTML = '<strong>Products API unreachable.</strong> Some actions will use local data. ' +
      '<button id="productDistApiRetryBtn" class="btn btn-sm btn-outline-primary ms-2">Retry</button>';
    const container = document.querySelector(".container") || document.body;
    container.insertBefore(banner, container.firstChild);
    document.getElementById("productDistApiRetryBtn").addEventListener("click", async function () {
      hideApiRetryBanner();
      try {
        await refreshStockFromApiOrFallback();
        populateProductSelect();
        renderSummary();
        renderTable();
      } catch (e) {
        showApiRetryBanner();
      }
    });
  }

  function hideApiRetryBanner() {
    const b = document.getElementById("productDistApiRetryBanner");
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  // Pagination state
  const itemsPerPage = 6;
  let currentPage = 1;
  let currentSearch = "";

  // Elements
  const receivedSummaryRow = document.getElementById("receivedSummaryRow");
  const distributionTableBody = document.getElementById("distributionTableBody");
  const pagination = document.getElementById("pagination");
  const searchInput = document.getElementById("searchInput");
  const productSelect = document.getElementById("productSelect");
  const allocateQty = document.getElementById("allocateQty");
  const allocateRole = document.getElementById("allocateRole");
  const availableInfo = document.getElementById("availableInfo");
  const allocateForm = document.getElementById("allocateForm");
  const allocateModalTitle = document.getElementById("allocateModalTitle");
  const editingIndexInput = document.getElementById("editingIndex");
  const refreshBtn = document.getElementById("refreshBtn");

  // Elements for Add Product
  const addProductForm = document.getElementById("addProductForm");
  const newProductName = document.getElementById("newProductName");
  const managerSelect = document.getElementById("managerSelect");
  const mrSelect = document.getElementById("mrSelect");
  const mrSelectContainer = document.getElementById("mrSelectContainer");
  const managerSelectLabel = document.getElementById("managerSelectLabel");
  const newCategory = document.getElementById("newCategory");
  const newPrice = document.getElementById("newPrice");
  const newStock = document.getElementById("newStock");
  const newStockLabel = document.querySelector('label[for="newStock"]') || document.querySelector('#addProductModal label:nth-of-type(6)') || { textContent: "" }; // Fallback label lookup
  const newDescription = document.getElementById("newDescription");
  const productSuggestions = document.getElementById("productSuggestions");

  // \u2705 Add Product form submission
  addProductForm && addProductForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const payload = {
      name: (newProductName.value || "").trim(),
      category: (newCategory.value || "General").trim(),
      price: String(newPrice.value || "0").trim(),
      stock: parseInt(newStock.value || "0", 10),
      description: (newDescription.value || "").trim()
    };

    (async function () {
      try {
        await apiJson(PRODUCTS_API_BASE, { method: "POST", body: JSON.stringify(payload) });
        await refreshStockFromApiOrFallback();
        populateProductSelect();
        renderSummary();
        renderTable();
        addProductForm.reset();
        bootstrap.Modal.getOrCreateInstance(document.getElementById("addProductModal")).hide();
      } catch (err) {
        alert("Failed to add product: " + err.message);
      }
    })();
  });


  // Search
  searchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value.trim().toLowerCase();
    currentPage = 1;
    renderTable();
  });

  // Refresh
  refreshBtn && refreshBtn.addEventListener("click", () => {
    (async function () {
      await refreshStockFromApiOrFallback();
      populateProductSelect();
      renderSummary();
      renderTable();
    })();
  });

  // \u2705 Populate product dropdown (now showing price)
  function populateProductSelect() {
    productSelect.innerHTML = receivedStock
      .map(
        (p) =>
          `<option value="${p.id}">
            ${p.name} \u2014 \u20B9${p.price}/unit (Available: ${p.available})
          </option>`
      )
      .join("");
    updateAvailableInfo();
  }

  // \u2705 Update available info on product/qty change
  productSelect.addEventListener("change", updateAvailableInfo);
  allocateQty.addEventListener("input", updateAvailableInfo);

  function updateAvailableInfo() {
    const pid = parseInt(productSelect.value, 10);
    const product = receivedStock.find((p) => p.id === pid);
    const qty = Number(allocateQty.value || 0);
    if (product) {
      const after = product.available - qty;
      availableInfo.textContent = `Available: ${product.available} units \u2014 After allocation: ${after >= 0 ? after : "--- (insufficient)"
        } | Price: \u20B9${product.price}/unit`;
      if (after < 0) availableInfo.classList.add("text-danger");
      else availableInfo.classList.remove("text-danger");
    } else {
      availableInfo.textContent = "";
    }
  }

  // \u2705 Allocation Role Toggle Logic
  allocateRole && allocateRole.addEventListener("change", () => {
    const role = allocateRole.value;
    if (role === "Manager") {
      managerSelectLabel.textContent = "Select Manager";
      mrSelectContainer.style.display = "none";
      if (mrSelect) mrSelect.required = false;
    } else {
      managerSelectLabel.textContent = "Reporting Manager";
      mrSelectContainer.style.display = "block";
      if (mrSelect) mrSelect.required = true;
    }
  });

  // \u2705 View Mode State
  let summaryViewMode = "Cards"; // "Cards" or "Table"
  const btnViewCards = document.getElementById("btnViewCards");
  const btnViewTable = document.getElementById("btnViewTable");
  const summaryTableContainer = document.getElementById("receivedSummaryTableContainer");
  const summaryTableBody = document.getElementById("receivedSummaryTableBody");

  btnViewCards && btnViewCards.addEventListener("click", () => setSummaryViewMode("Cards"));
  btnViewTable && btnViewTable.addEventListener("click", () => setSummaryViewMode("Table"));

  function setSummaryViewMode(mode) {
    summaryViewMode = mode;
    if (btnViewCards) btnViewCards.classList.toggle("active", mode === "Cards");
    if (btnViewTable) btnViewTable.classList.toggle("active", mode === "Table");

    if (mode === "Cards") {
      if (receivedSummaryRow) receivedSummaryRow.style.display = "flex";
      if (summaryTableContainer) summaryTableContainer.style.display = "none";
    } else {
      if (receivedSummaryRow) receivedSummaryRow.style.display = "none";
      if (summaryTableContainer) summaryTableContainer.style.display = "block";
    }
    renderSummary();
  }

  // \u2705 Render received stock summary content
  function renderSummary() {
    if (!receivedSummaryRow) return;

    // Deduplicate by name for UI display
    const uniqueMap = new Map();
    receivedStock.forEach(p => {
      const name = p.name.trim();
      if (!uniqueMap.has(name)) {
        uniqueMap.set(name, { ...p });
      } else {
        uniqueMap.get(name).available += p.available;
      }
    });
    const displayStock = Array.from(uniqueMap.values());

    if (summaryViewMode === "Cards") {
      renderSummaryCards(displayStock);
    } else {
      renderSummaryTable(displayStock);
    }
  }

  function renderSummaryCards(displayStock) {
    receivedSummaryRow.className = "row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3 mb-4";
    receivedSummaryRow.innerHTML = displayStock
      .map(
        (p) => {
          const isLow = p.available < 20;
          const statusClass = isLow ? "text-danger" : "text-success";
          const bgClass = isLow ? "border-danger" : "border-primary-subtle";

          return `
          <div class="col">
            <div class="card h-100 shadow-sm border-2 ${bgClass}">
              <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div class="bg-primary-subtle p-2 rounded text-primary">
                    <i class="bi bi-capsule fs-4"></i>
                  </div>
                  <div class="text-end">
                    <h3 class="mb-0 fw-bold">${p.available}</h3>
                    <small class="${statusClass} fw-medium">${isLow ? "Low Stock" : "In Stock"}</small>
                  </div>
                </div>
                <div>
                  <h6 class="mb-0 fw-bold text-dark">${p.name}</h6>
                  <div class="text-muted small">${p.category} | \u20B9${p.price}/unit</div>
                </div>
              </div>
            </div>
          </div>
        `;
        }
      )
      .join("");
  }

  function renderSummaryTable(displayStock) {
    if (!summaryTableBody) return;
    summaryTableBody.innerHTML = displayStock
      .map(p => {
        const isLow = p.available < 20;
        return `
        <tr>
          <td><span class="fw-bold text-dark">${p.name}</span></td>
          <td><span class="badge bg-light text-dark border">${p.category}</span></td>
          <td class="text-end">\u20B9${p.price}</td>
          <td class="text-end fw-bold ${isLow ? 'text-danger' : 'text-primary'}">${p.available}</td>
          <td class="text-center">
            <span class="badge ${isLow ? 'bg-danger' : 'bg-success'}">${isLow ? 'Low' : 'OK'}</span>
          </td>
        </tr>`;
      })
      .join("");
  }

  // \u2705 Render distribution table
  function renderTable() {
    let filtered = allocations.filter((a) => {
      if (!currentSearch) return true;
      return (
        (a.productName && a.productName.toLowerCase().includes(currentSearch)) ||
        (a.allocateTo && a.allocateTo.toLowerCase().includes(currentSearch)) ||
        (a.role && a.role.toLowerCase().includes(currentSearch))
      );
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filtered.slice(start, start + itemsPerPage);

    distributionTableBody.innerHTML = pageItems
      .map(
        (a) => `
      <tr>
        <td>${a.date}</td>
        <td>${a.productName}</td>
        <td>${a.allocateTo}</td>
        <td>${a.role}</td>
        <td>${a.qty}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="pd_edit(${allocations.indexOf(
          a
        )})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="pd_delete(${allocations.indexOf(
          a
        )})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`
      )
      .join("");

    renderPagination(totalPages);
  }

  // Pagination controls
  function renderPagination(totalPages) {
    pagination.innerHTML = "";
    const prev = document.createElement("li");
    prev.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
    prev.innerHTML = `<a class="page-link" href="#" onclick="pd_changePage(${currentPage - 1})">Previous</a>`;
    pagination.appendChild(prev);

    const range = 2;
    const start = Math.max(1, currentPage - range);
    const end = Math.min(totalPages, currentPage + range);

    for (let i = start; i <= end; i++) {
      const li = document.createElement("li");
      li.className = `page-item ${i === currentPage ? "active" : ""}`;
      li.innerHTML = `<a class="page-link" href="#" onclick="pd_changePage(${i})">${i}</a>`;
      pagination.appendChild(li);
    }

    const next = document.createElement("li");
    next.className = `page-item ${currentPage === totalPages ? "disabled" : ""}`;
    next.innerHTML = `<a class="page-link" href="#" onclick="pd_changePage(${currentPage + 1})">Next</a>`;
    pagination.appendChild(next);
  }

  function setFilter(f) {
    currentPage = 1;
    renderTable();
  }

  // \u2705 Add/Edit Allocation form
  allocateForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const editingIndex = Number(editingIndexInput.value);
    const pid = Number(productSelect.value);
    const product = receivedStock.find((p) => p.id === pid);
    const qty = Number(allocateQty.value);
    const manager = managerSelect.value;
    const mrName = mrSelect ? mrSelect.value : "";
    const role = allocateRole.value;
    const status = "Completed"; // Defaulted to Completed

    if (!product) return alert("Select a product");
    if (role === "Manager" && !manager) return alert("Please select a manager");
    if (role === "MR" && (!mrName || !manager)) return alert("Please select MR and reporting manager");
    if (!qty || qty <= 0) return alert("Enter a valid quantity");

    const to = role === "Manager" ? manager : mrName;

    (async function () {
      const prev = editingIndex >= 0 ? allocations[editingIndex] : null;
      const prevIsCompleted = Boolean(prev && prev.status === "Completed");
      const prevProd = prevIsCompleted
        ? receivedStock.find((p) => p.id === Number(prev.productId))
        : null;

      if (status === "Completed") {
        let availableForCheck = product.available;
        if (prevIsCompleted && prevProd && Number(prev.productId) === Number(product.id)) {
          availableForCheck += Number(prev.qty);
        }
        if (qty > availableForCheck) {
          alert("Quantity exceeds available stock");
          return;
        }
      }

      if (editingIndex >= 0) {
        if (prev && prev.status === "Completed") {
          const prevProd = receivedStock.find((p) => p.id === prev.productId);
          if (prevProd) {
            prevProd.available += Number(prev.qty);
            if (productsApiMode) {
              try {
                await updateProductStockApi(prevProd, prevProd.available);
              } catch (err) {
                console.warn("Stock refund API failed. Falling back to localStorage.", err);
                productsApiMode = false;
              }
            }
          }
        }
      }

      if (status === "Completed") {
        product.available -= qty;
        if (productsApiMode) {
          try {
            await updateProductStockApi(product, product.available);
          } catch (err) {
            console.warn("Stock deduct API failed. Falling back to localStorage.", err);
            productsApiMode = false;
          }
        }
      }

      const today = new Date().toISOString().split("T")[0];
      const entry = {
        date: today,
        productId: product.id,
        productName: product.name,
        allocateTo: to,
        manager: manager,
        role,
        qty,
        availableAfter: product.available,
        status,
      };

      if (editingIndex >= 0) {
        allocations[editingIndex] = entry;
        editingIndexInput.value = -1;
      } else {
        allocations.unshift(entry);
      }

      saveAllocationsToStorage();
      saveStockToStorage();

      populateProductSelect();
      renderSummary();
      renderTable();
      allocateForm.reset();
      bootstrap.Modal.getInstance(document.getElementById("allocateModal")).hide();
    })();
  });

  // \u2705 Global functions for edit/delete/page change
  window.pd_edit = function (index) {
    const item = allocations[index];
    if (!item) return;
    editingIndexInput.value = index;
    productSelect.value = item.productId;
    allocateRole.value = item.role;
    managerSelect.value = item.manager || "";
    if (item.role === "Manager") {
      mrSelectContainer.style.display = "none";
      if (mrSelect) mrSelect.value = "";
    } else {
      mrSelectContainer.style.display = "block";
      if (mrSelect) mrSelect.value = item.allocateTo;
    }
    allocateQty.value = item.qty;
    updateAvailableInfo();
    allocateModalTitle.textContent = "Edit Allocation";
    new bootstrap.Modal(document.getElementById("allocateModal")).show();
  };

  window.pd_delete = function (index) {
    if (!confirm("Delete this allocation?")) return;
    (async function () {
      const removed = allocations.splice(index, 1)[0];
      if (removed && removed.status === "Completed") {
        const prod = receivedStock.find((p) => p.id === removed.productId);
        if (prod) {
          prod.available += Number(removed.qty);
          if (productsApiMode) {
            try {
              await updateProductStockApi(prod, prod.available);
            } catch (err) {
              console.warn("Stock refund API failed. Falling back to localStorage.", err);
              productsApiMode = false;
            }
          }
        }
      }

      saveAllocationsToStorage();
      saveStockToStorage();
      populateProductSelect();
      renderSummary();
      renderTable();
    })();
  };

  window.pd_changePage = function (page) {
    const totalPages = Math.max(1, Math.ceil(allocations.length / itemsPerPage));
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPage = page;
    renderTable();
  };

  // \u2705 Initial render
  loadFromStorageIfAny();
  (async function () {
    await refreshStockFromApiOrFallback();
    await refreshUsersFromApi();
    updateProductSuggestions();
    populateProductSelect();
    renderSummary();
    renderTable();
  })();

  function updateProductSuggestions() {
    if (!productSuggestions) return;
    productSuggestions.innerHTML = receivedStock
      .map(p => `<option value="${p.name}">`)
      .join("");
  }

  // Auto-fill form when existing product name is typed/selected
  newProductName && newProductName.addEventListener("change", () => {
    const name = newProductName.value.trim();
    const existing = receivedStock.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      newCategory.value = existing.category || "";
      newPrice.value = existing.price || "";
      newDescription.value = existing.description || "";
      // Find the actual label for newStock (might be tricky due to structure)
      const labels = document.getElementById("addProductModal").querySelectorAll("label");
      labels.forEach(l => {
        if (l.textContent.includes("Stock Quantity") || l.textContent.includes("Stock to Add")) {
          l.textContent = "Stock to Add";
          l.classList.add("text-success", "fw-bold");
        }
      });
    } else {
      const labels = document.getElementById("addProductModal").querySelectorAll("label");
      labels.forEach(l => {
        if (l.textContent.includes("Stock to Add")) {
          l.textContent = "Stock Quantity";
          l.classList.remove("text-success", "fw-bold");
        }
      });
    }
  });
});
