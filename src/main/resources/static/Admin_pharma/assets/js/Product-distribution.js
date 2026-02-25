// product-distribution.js
// Product Distribution with Price Display
document.addEventListener("DOMContentLoaded", () => {

  const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");

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
        allManagers = users.filter(u => {
          const roleRaw = (u.role && typeof u.role === 'object') ? u.role.name : u.role;
          const role = String(roleRaw || "").toUpperCase();
          return role === "MANAGER";
        });

        allMRs = users.filter(u => {
          const roleRaw = (u.role && typeof u.role === 'object') ? u.role.name : u.role;
          const role = String(roleRaw || "").toUpperCase();
          return role === "MR";
        });

        populateManagerSelect();

        const mSelect = document.getElementById("managerSelect");
        if (mSelect && mSelect.value) {
          populateMrSelect(mSelect.value);
        } else {
          populateMrSelect(null);
        }
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
      allManagers.map(m => `<option value="${m.email || m.name}">${m.name}</option>`).join("");
    if (currentVal) mSelect.value = currentVal;
  }

  function populateMrSelect(targetMgr = null) {
    const mrSelect = document.getElementById("mrSelect");
    if (!mrSelect) return;
    const currentVal = mrSelect.value;

    let filteredMRs = [];
    if (targetMgr && targetMgr.trim() !== "") {
      const target = targetMgr.trim().toLowerCase();
      const managerObj = allManagers.find(m =>
        (m.email && m.email.toLowerCase() === target) ||
        (m.name && m.name.toLowerCase() === target) ||
        (m.id && String(m.id) === target)
      );

      const mgrName = managerObj ? managerObj.name.toLowerCase() : null;
      const mgrEmail = managerObj ? managerObj.email.toLowerCase() : null;
      const mgrId = managerObj ? String(managerObj.id) : null;

      filteredMRs = allMRs.filter(m => {
        if (!m.assignedManager) return false;
        const assigned = String(m.assignedManager).trim().toLowerCase();
        return assigned === target ||
          (mgrName && assigned === mgrName) ||
          (mgrEmail && assigned === mgrEmail) ||
          (mgrId && assigned === mgrId);
      });
    }

    const countText = filteredMRs.length > 0 ? ` (${filteredMRs.length} found)` : (targetMgr ? ' (0 found)' : '');
    mrSelect.innerHTML = `<option value="">Select an MR${countText}</option>` +
      filteredMRs.map(m => `<option value="${m.name}">${m.name}</option>`).join("");

    if (currentVal && filteredMRs.some(m => m.name === currentVal)) {
      mrSelect.value = currentVal;
    } else {
      mrSelect.value = "";
    }
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
          description: p.description || p.desc || "",
          expiryDate: p.expiryDate || ""
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
      description: product.description || "",
      expiryDate: product.expiryDate || ""
    };
    return await apiJson(`${PRODUCTS_API_BASE}/${product.id}`, { method: "PUT", body: JSON.stringify(payload) });
  }

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

  const itemsPerPage = 6;
  let currentPage = 1;
  let currentSearch = "";

  const receivedSummaryRow = document.getElementById("receivedSummaryRow");
  const summaryTableBody = document.getElementById("receivedSummaryTableBody");
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
  const editingProductIdInput = document.getElementById("editingProductId");
  const editingStockValueInput = document.getElementById("editingStockValue");
  const addProductModalTitle = document.getElementById("addProductModalTitle");
  const refreshBtn = document.getElementById("refreshBtn");

  const addProductForm = document.getElementById("addProductForm");
  const newProductName = document.getElementById("newProductName");
  const managerSelect = document.getElementById("managerSelect");
  if (managerSelect) {
    managerSelect.addEventListener("change", (e) => {
      const selectedManager = e.target.value;
      if (typeof allocateRole !== 'undefined' && allocateRole && allocateRole.value === "MR") {
        populateMrSelect(selectedManager);
      }
    });
  }
  const mrSelect = document.getElementById("mrSelect");
  const mrSelectContainer = document.getElementById("mrSelectContainer");
  const managerSelectLabel = document.getElementById("managerSelectLabel");
  const newCategory = document.getElementById("newCategory");
  const newPrice = document.getElementById("newPrice");
  const newStock = document.getElementById("newStock");
  const newDescription = document.getElementById("newDescription");
  const productSuggestions = document.getElementById("productSuggestions");

  addProductForm && addProductForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const price = parseFloat(newPrice.value || "0");
    let stockToAdd = parseInt(newStock.value || "0", 10);
    const editingProductId = editingProductIdInput ? editingProductIdInput.value : "-1";

    if (price < 0) return alert("Product price cannot be negative.");
    if (stockToAdd < 0) return alert("Stock quantity cannot be negative.");

    const existingProduct = receivedStock.find(p => String(p.id) === String(editingProductId));
    const finalStock = existingProduct ? (existingProduct.available + stockToAdd) : stockToAdd;

    const payload = {
      name: (newProductName.value || "").trim(),
      category: (newCategory.value || "General").trim(),
      price: String(price).trim(),
      stock: finalStock,
      description: (newDescription.value || "").trim(),
      expiryDate: (document.getElementById("newExpiryDate") ? document.getElementById("newExpiryDate").value : "").trim()
    };

    (async function () {
      try {
        if (editingProductId !== "-1" && editingProductId !== "") {
          await apiJson(`${PRODUCTS_API_BASE}/${editingProductId}`, { method: "PUT", body: JSON.stringify(payload) });
          editingProductIdInput.value = "-1";
          addProductModalTitle.textContent = "Add New Product";
        } else {
          await apiJson(PRODUCTS_API_BASE, { method: "POST", body: JSON.stringify(payload) });
        }
        await refreshStockFromApiOrFallback();
        populateProductSelect();
        renderSummary();
        renderTable();
        addProductForm.reset();
        bootstrap.Modal.getOrCreateInstance(document.getElementById("addProductModal")).hide();
      } catch (err) {
        if (err.message.includes("already added")) alert("Product cannot be created as its been already added as per the project standards");
        else alert("Failed to save product: " + err.message);
      }
    })();
  });

  const addProductModal = document.getElementById("addProductModal");
  if (addProductModal) {
    addProductModal.addEventListener('hidden.bs.modal', function () {
      if (addProductForm) addProductForm.reset();
      if (editingProductIdInput) editingProductIdInput.value = "-1";
      if (addProductModalTitle) addProductModalTitle.textContent = "Add New Product";

      const labels = addProductModal.querySelectorAll("label");
      labels.forEach(l => {
        if (l.textContent.includes("Stock to Add")) {
          l.textContent = "Stock Quantity";
          l.classList.remove("text-success", "fw-bold");
        }
      });
    });
  }

  const allocateModalEl = document.getElementById("allocateModal");
  if (allocateModalEl) {
    allocateModalEl.addEventListener('show.bs.modal', async function () {
      await refreshUsersFromApi();
      if (editingIndexInput.value === "-1") {
        allocateForm.reset();
        allocateModalTitle.textContent = "New Allocation";
        mrSelectContainer.style.display = "none";
        populateMrSelect(null);
        updateAvailableInfo();
      }
    });
    allocateModalEl.addEventListener('hidden.bs.modal', function () {
      if (allocateForm) {
        allocateForm.reset();
        editingIndexInput.value = "-1";
        allocateModalTitle.textContent = "New Allocation";
        mrSelectContainer.style.display = "none";
        availableInfo.textContent = "";
        availableInfo.classList.remove("text-danger");
      }
    });
  }

  searchInput && searchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value.trim().toLowerCase();
    currentPage = 1;
    renderTable();
  });

  newProductName && newProductName.addEventListener("change", () => {
    const name = newProductName.value.trim();
    const existing = receivedStock.find(p => p.name.toLowerCase() === name.toLowerCase());
    const isEditMode = editingProductIdInput && editingProductIdInput.value !== "-1";

    if (existing && !isEditMode) {
      alert("Product cannot be created as its been already added as per the project standards");
      newProductName.value = "";
    } else if (existing) {
      newCategory.value = existing.category || "";
      newPrice.value = existing.price || "";
      newDescription.value = existing.description || "";
      const labels = document.getElementById("addProductModal").querySelectorAll("label");
      labels.forEach(l => {
        if (l.textContent.includes("Stock Quantity") || l.textContent.includes("Stock to Add")) {
          l.textContent = "Stock to Add (Current: " + existing.available + ")";
          l.classList.add("text-success", "fw-bold");
        }
      });
    }
  });

  refreshBtn && refreshBtn.addEventListener("click", async () => {
    await refreshStockFromApiOrFallback();
    populateProductSelect();
    renderSummary();
    renderTable();
  });

  function populateProductSelect() {
    if (!productSelect) return;
    productSelect.innerHTML = receivedStock
      .map(p => `<option value="${p.id}">${p.name} — ₹${p.price}/unit (Available: ${p.available})</option>`)
      .join("");
    updateAvailableInfo();
  }

  productSelect && productSelect.addEventListener("change", updateAvailableInfo);
  allocateQty && allocateQty.addEventListener("input", updateAvailableInfo);

  function updateAvailableInfo() {
    if (!productSelect || !availableInfo) return;
    const pid = parseInt(productSelect.value, 10);
    const product = receivedStock.find((p) => p.id === pid);
    const qty = Number(allocateQty.value || 0);
    if (product) {
      const after = product.available - qty;
      availableInfo.textContent = `Available: ${product.available} units — After allocation: ${after >= 0 ? after : "--- (insufficient)"} | Price: ₹${product.price}/unit`;
      if (after < 0) availableInfo.classList.add("text-danger");
      else availableInfo.classList.remove("text-danger");
    } else {
      availableInfo.textContent = "";
    }
  }

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
      if (managerSelect && managerSelect.value) populateMrSelect(managerSelect.value);
      else populateMrSelect(null);
    }
  });

  let summaryViewMode = "Cards";
  const btnViewCards = document.getElementById("btnViewCards");
  const btnViewTable = document.getElementById("btnViewTable");
  const summaryTableContainer = document.getElementById("receivedSummaryTableContainer");

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

  function renderSummary() {
    if (!receivedSummaryRow) return;
    const uniqueMap = new Map();
    receivedStock.forEach(p => {
      const name = p.name.trim();
      if (!uniqueMap.has(name)) uniqueMap.set(name, { ...p });
      else uniqueMap.get(name).available += p.available;
    });
    const displayStock = Array.from(uniqueMap.values()).sort((a, b) => a.id - b.id);
    if (summaryViewMode === "Cards") renderSummaryCards(displayStock);
    else renderSummaryTable(displayStock);
  }

  function renderSummaryCards(displayStock) {
    receivedSummaryRow.className = "row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3 mb-4";
    receivedSummaryRow.innerHTML = displayStock.map((p) => {
      const isLow = p.available < 20;
      return `
        <div class="col">
          <div class="card h-100 shadow-sm border-2 ${isLow ? "border-danger" : "border-primary-subtle"}">
            <div class="card-body p-3">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div class="bg-primary-subtle p-2 rounded text-primary"><i class="bi bi-capsule fs-4"></i></div>
                <div class="text-end">
                  <h3 class="mb-0 fw-bold">${p.available}</h3>
                  <small class="${isLow ? "text-danger" : "text-success"} fw-medium">${isLow ? "Low Stock" : "In Stock"}</small>
                </div>
              </div>
              <div>
                <h6 class="mb-0 fw-bold text-dark">${p.name}</h6>
                <div class="text-muted small">${p.category} | ₹${p.price}/unit</div>
              </div>
              <div class="d-flex justify-content-end mt-2 gap-1">
                <button class="btn btn-sm btn-outline-primary" onclick="prod_edit(${p.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="prod_delete(${p.id})"><i class="bi bi-trash"></i></button>
              </div>
            </div>
          </div>
        </div>`;
    }).join("");
  }

  function renderSummaryTable(displayStock) {
    if (!summaryTableBody) return;
    summaryTableBody.innerHTML = displayStock.map(p => {
      const isLow = p.available < 20;
      return `
        <tr>
          <td><span class="text-muted small">${p.id}</span></td>
          <td><span class="fw-bold text-dark">${p.name}</span></td>
          <td><span class="badge bg-light text-dark border">${p.category}</span></td>
          <td class="text-end">₹${p.price}</td>
          <td class="text-end fw-bold ${isLow ? 'text-danger' : 'text-primary'}">${p.available}</td>
          <td class="text-center"><span class="badge ${isLow ? 'bg-danger' : 'bg-success'}">${isLow ? 'Low' : 'OK'}</span></td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="prod_edit(${p.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="prod_delete(${p.id})"><i class="bi bi-trash"></i></button>
          </td>
        </tr>`;
    }).join("");
  }

  function renderTable() {
    if (!distributionTableBody) return;
    let filtered = allocations.filter((a) => {
      if (!currentSearch) return true;
      return (a.productName && a.productName.toLowerCase().includes(currentSearch)) ||
        (a.allocateTo && a.allocateTo.toLowerCase().includes(currentSearch)) ||
        (a.role && a.role.toLowerCase().includes(currentSearch));
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;
    const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    distributionTableBody.innerHTML = pageItems.map((a) => `
      <tr>
        <td>${a.date}</td>
        <td><span class="text-muted small">${a.productId || '-'}</span></td>
        <td>${a.productName}</td>
        <td>${a.allocateTo}</td>
        <td>${a.role}</td>
        <td>${a.qty}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="pd_edit(${allocations.indexOf(a)})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="pd_delete(${allocations.indexOf(a)})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join("");
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (!pagination) return;
    pagination.innerHTML = "";
    const prev = document.createElement("li");
    prev.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
    prev.innerHTML = `<a class="page-link" href="#" onclick="pd_changePage(${currentPage - 1})">Previous</a>`;
    pagination.appendChild(prev);

    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
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

  allocateForm && allocateForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const editingIndex = Number(editingIndexInput.value);
    const pid = Number(productSelect.value);
    const product = receivedStock.find((p) => p.id === pid);
    const qty = Number(allocateQty.value);
    const manager = managerSelect.value;
    const mrName = mrSelect ? mrSelect.value : "";
    const role = allocateRole.value;

    if (!product) return alert("Select a product");
    if (role === "Manager" && !manager) return alert("Please select a manager");
    if (role === "MR" && (!mrName || !manager)) return alert("Please select MR and reporting manager");
    if (!qty || qty <= 0) return alert("Enter a valid quantity");

    const to = role === "Manager" ? manager : mrName;

    (async function () {
      const prev = editingIndex >= 0 ? allocations[editingIndex] : null;
      const prevProd = (prev && prev.status === "Completed") ? receivedStock.find(p => p.id === prev.productId) : null;
      let availableForCheck = product.available + (prevProd && prevProd.id === product.id ? prev.qty : 0);

      if (qty > availableForCheck) return alert("Quantity exceeds available stock");

      if (prevProd) {
        prevProd.available += prev.qty;
        if (productsApiMode) await updateProductStockApi(prevProd, prevProd.available);
      }

      product.available -= qty;
      if (productsApiMode) {
        await updateProductStockApi(product, product.available);
        try {
          await fetch(`${API_BASE}/api/stock-received`, {
            method: "POST",
            headers: Object.assign({ "Content-Type": "application/json" }, getAuthHeader()),
            body: JSON.stringify({ productId: String(product.id), quantity: qty, date: new Date().toISOString(), userName: to, notes: `Allocated by Admin` })
          });
        } catch (err) { console.warn("MR stock sync failed", err); }
      }

      const entry = { date: new Date().toISOString().split("T")[0], productId: product.id, productName: product.name, allocateTo: to, manager, role, qty, status: "Completed" };
      if (editingIndex >= 0) {
        allocations[editingIndex] = entry;
        editingIndexInput.value = -1;
      } else {
        allocations.unshift(entry);
      }
      saveAllocationsToStorage(); saveStockToStorage(); populateProductSelect(); renderSummary(); renderTable();
      allocateForm.reset(); bootstrap.Modal.getInstance(allocateModalEl).hide();
    })();
  });

  window.pd_edit = function (index) {
    const item = allocations[index];
    if (!item) return;
    editingIndexInput.value = index;
    productSelect.value = item.productId;
    allocateRole.value = item.role;
    managerSelect.value = item.manager || "";
    if (item.role === "Manager") mrSelectContainer.style.display = "none";
    else {
      mrSelectContainer.style.display = "block";
      refreshUsersFromApi().then(() => {
        populateMrSelect(item.manager);
        if (mrSelect) mrSelect.value = item.allocateTo;
      });
    }
    allocateQty.value = item.qty;
    updateAvailableInfo();
    allocateModalTitle.textContent = "Edit Allocation";
    bootstrap.Modal.getOrCreateInstance(allocateModalEl).show();
  };

  window.pd_delete = function (index) {
    if (!confirm("Delete this allocation?")) return;
    const removed = allocations.splice(index, 1)[0];
    if (removed && removed.status === "Completed") {
      const prod = receivedStock.find(p => p.id === removed.productId);
      if (prod) {
        prod.available += removed.qty;
        if (productsApiMode) updateProductStockApi(prod, prod.available);
      }
    }
    saveAllocationsToStorage(); saveStockToStorage(); populateProductSelect(); renderSummary(); renderTable();
  };

  window.prod_edit = function (id) {
    const product = receivedStock.find(p => p.id === id);
    if (!product) return alert("Product not found.");
    editingProductIdInput.value = id;
    editingStockValueInput.value = product.available;
    addProductModalTitle.textContent = "Edit Product";
    newProductName.value = product.name;
    newCategory.value = product.category || "General";
    newPrice.value = product.price;
    newStock.value = 0;
    newDescription.value = product.description || "";
    const expiryDateEl = document.getElementById("newExpiryDate");
    if (expiryDateEl) expiryDateEl.value = product.expiryDate || "";
    const labels = document.getElementById("addProductModal").querySelectorAll("label");
    labels.forEach(l => {
      if (l.textContent.includes("Stock Quantity") || l.textContent.includes("Stock to Add")) {
        l.textContent = "Stock to Add (Current: " + product.available + ")";
        l.classList.add("text-success", "fw-bold");
      }
    });
    bootstrap.Modal.getOrCreateInstance(addProductModal).show();
  };

  window.prod_delete = function (id) {
    const product = receivedStock.find(p => p.id === id);
    if (!product || !confirm(`Delete product "${product.name}"?`)) return;
    (async function () {
      try {
        await apiJson(`${PRODUCTS_API_BASE}/${id}`, { method: "DELETE" });
        await refreshStockFromApiOrFallback();
        populateProductSelect(); renderSummary(); renderTable();
      } catch (err) { alert("Failed to delete product: " + err.message); }
    })();
  };

  window.pd_changePage = function (page) {
    currentPage = page;
    renderTable();
  };

  loadFromStorageIfAny();
  (async function () {
    await refreshStockFromApiOrFallback();
    await refreshUsersFromApi();
    if (productSuggestions) productSuggestions.innerHTML = receivedStock.map(p => `<option value="${p.name}">`).join("");
    populateProductSelect(); renderSummary(); renderTable();
  })();
});
