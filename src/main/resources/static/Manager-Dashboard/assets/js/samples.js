// Samples Page JavaScript
let samplesData; // Declare as global to be accessible by global functions
let distributionHistory;
let mrData;
let productsData;
let recentActivities;
let alertsData;
let pendingDistributeProductName = null;

// --- Persistence Functions ---

// Function to load data from localStorage or use mock data
function loadInitialData(key, mockData) {
  const storedData = localStorage.getItem(key);
  if (storedData) {
    return JSON.parse(storedData);
  }
  return mockData;
}

// Function to save data to localStorage
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadSampleMetaByProductId() {
  const raw = localStorage.getItem("sampleMetaByProductId");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}

function saveSampleMetaByProductId(meta) {
  localStorage.setItem("sampleMetaByProductId", JSON.stringify(meta || {}));
}

function upsertSampleMeta(productId, metaPatch) {
  const key = String(productId || "");
  if (!key) return;
  const meta = loadSampleMetaByProductId();
  meta[key] = Object.assign({}, meta[key] || {}, metaPatch || {});
  saveSampleMetaByProductId(meta);
}

// const API_BASE = window.location.port === "5500" ? "http://localhost:8080" : "";
const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");

const USERS_API_BASE = `${API_BASE}/api/users`;
const MR_STOCK_API_BASE = `${API_BASE}/api/mr-stock`;
const STOCK_RECEIVED_API_BASE = `${API_BASE}/api/stock-received`;
const DISTRIBUTIONS_API_BASE = `${API_BASE}/api/distributions`;
let samplesApiMode = true;

function getAuthHeader() {
  const token = localStorage.getItem("kavya_auth_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function apiJson(url, options) {
  const res = await fetch(url, Object.assign({
    headers: Object.assign({ "Content-Type": "application/json" }, getAuthHeader()),
  }, options || {}));

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return await res.json();
}

async function refreshMrsFromApiOrFallback() {
  try {
    let userObj = {};
    try {
      userObj = JSON.parse(localStorage.getItem("kavya_user") || "{}");
    } catch (e) { }

    const currentName = userObj.name || localStorage.getItem("signup_name") || "";
    const currentEmail = userObj.email || localStorage.getItem("signup_email") || "";

    console.log("[SAMPLES] Fetching MRs for manager:", currentName || currentEmail);
    let users = await apiJson(`${USERS_API_BASE}?manager=${encodeURIComponent(currentName || currentEmail)}&role=MR`);

    if ((!users || users.length === 0) && currentName && currentEmail && currentName !== currentEmail) {
      console.log("[SAMPLES] First query empty, trying email fallback query...");
      users = await apiJson(`${USERS_API_BASE}?manager=${encodeURIComponent(currentEmail)}&role=MR`);
    }

    if (Array.isArray(users)) {
      // Use backend results directly (backend handles manager identity filtering securely)
      const onlyMrs = users
        .filter((u) => u && u.role && String(u.role).toUpperCase().includes("MR"))
        .map((u) => ({ id: String(u.id), name: u.name, email: u.email }))
        .filter((u) => u && u.name);

      const uniqueByEmail = new Map();
      onlyMrs.forEach((u) => {
        const key = String(u.email || u.name).trim().toLowerCase();
        if (!key) return;
        if (!uniqueByEmail.has(key)) uniqueByEmail.set(key, u);
      });

      mrData = Array.from(uniqueByEmail.values());
      console.log("[SAMPLES] Loaded", mrData.length, "MRs from API");
      saveData("mrData", mrData);
      return;
    }
  } catch (e) {
    console.warn("[SAMPLES] MR users API unavailable, using localStorage.", e);
  }

  // Fallback (localStorage), and if empty then mock data
  mrData = loadInitialData("mrData", mockMrData);
  saveData("mrData", mrData);
}

async function refreshSamplesFromApiOrFallback() {
  try {
    const currentUserName = localStorage.getItem("signup_name") || "";
    const stockItems = await apiJson(`${MR_STOCK_API_BASE}?userName=${encodeURIComponent(currentUserName)}`);
    if (!Array.isArray(stockItems)) {
      samplesApiMode = false;
      return;
    }

    const existingLocal = Array.isArray(samplesData) ? samplesData : [];
    const localByProductId = new Map(existingLocal.map((s) => [String(s.productId || s.id), s]));
    const metaByProductId = loadSampleMetaByProductId();

    samplesData = stockItems.map((it, idx) => {
      const productId = String(it.id);
      const prev = localByProductId.get(productId);
      const remaining = Number(it.stock) || 0;
      const meta = metaByProductId[productId] || {};
      const metaUnitPrice = meta.unitPrice === "" || meta.unitPrice == null ? NaN : Number(meta.unitPrice);

      return {
        id: productId,
        productId: productId,
        productName: it.name,
        batchNumber: meta.batchNumber || (prev ? prev.batchNumber : productId),
        totalStock: remaining,
        distributed: 0,
        remaining: remaining,
        unitPrice: !isNaN(metaUnitPrice) ? metaUnitPrice : (prev ? prev.unitPrice : 0),
        expiryDate: meta.expiryDate || (prev ? prev.expiryDate : ""),
        mrStocks: {},
        description: meta.description || (prev ? (prev.description || "") : ""),
      };
    });

    productsData = stockItems.map((it, idx) => ({
      id: String(it.id),
      name: it.name,
      category: "Sample",
    }));

    saveData("samplesData", samplesData);
    saveData("productsData", productsData);
    // If distribution history was loaded from backend, re-apply it so distributed totals persist.
    if (Array.isArray(distributionHistory) && distributionHistory.length > 0) {
      applyDistributionsToSamples();
    }
    samplesApiMode = true;
  } catch (e) {
    console.warn("Samples API unavailable, using localStorage.", e);
    samplesApiMode = false;
  }
}

async function refreshDistributionsFromApiOrFallback() {
  try {
    const currentUserName = localStorage.getItem("signup_name") || "";
    const list = await apiJson(`${DISTRIBUTIONS_API_BASE}?userName=${encodeURIComponent(currentUserName)}`);
    if (!Array.isArray(list)) {
      return;
    }

    distributionHistory = list
      .map((d) => ({
        id: d.id,
        date: d.date,
        product: d.product,
        mr: d.mr,
        quantity: d.quantity,
        recipient: d.recipient,
      }))
      .sort((a, b) => {
        const da = new Date(a.date);
        const db = new Date(b.date);
        if (db.getTime() !== da.getTime()) return db.getTime() - da.getTime();
        return (b.id || 0) - (a.id || 0);
      });

    saveData("distributionHistory", distributionHistory);
    applyDistributionsToSamples();
  } catch (e) {
    console.warn("Distributions API unavailable, using localStorage.", e);
  }
}

function applyDistributionsToSamples() {
  if (!Array.isArray(samplesData)) return;
  const byProduct = new Map();

  (Array.isArray(distributionHistory) ? distributionHistory : []).forEach((d) => {
    const productName = String(d.product || "");
    if (!productName) return;
    const qty = Number(d.quantity) || 0;
    const mr = String(d.mr || "");

    if (!byProduct.has(productName)) {
      byProduct.set(productName, { distributed: 0, mrStocks: {} });
    }
    const agg = byProduct.get(productName);
    agg.distributed += qty;
    if (mr) {
      agg.mrStocks[mr] = (Number(agg.mrStocks[mr]) || 0) + qty;
    }
  });

  samplesData.forEach((s) => {
    const agg = byProduct.get(String(s.productName || ""));
    const distributed = agg ? Number(agg.distributed) || 0 : 0;
    s.distributed = distributed;
    s.mrStocks = agg ? (agg.mrStocks || {}) : {};
    const remaining = Number(s.remaining) || 0;
    // Total stock should reflect CURRENT stock (remaining), not historical (remaining + distributed)
    s.totalStock = remaining;
  });

  saveData("samplesData", samplesData);
}

// --- Mock Data Definitions (Used only if no data in localStorage) ---
const mockMrData = [
  { id: 1, name: "Rajesh Kumar" },
  { id: 2, name: "Priya Sharma" },
  { id: 3, name: "Amit Singh" },
  { id: 4, name: "Sneha Patel" },
  { id: 5, name: "Manish Patel" },
  { id: 6, name: "Kavita Jain" },
];

const mockProductsData = [
  { id: 1, name: "Diabetex 500mg", category: "Diabetes" },
  { id: 2, name: "CardioCare 10mg", category: "Cardiology" },
  { id: 3, name: "PainRelief 200mg", category: "Pain Management" },
  { id: 4, name: "NeuroMax 50mg", category: "Neurology" },
  { id: 5, name: "ImmunoBoost 100mg", category: "Immunology" },
];

const mockSamplesData = [
  {
    id: 1,
    productName: "Diabetex 500mg",
    batchNumber: "DBT20251101",
    totalStock: 500,
    distributed: 320,
    remaining: 180,
    unitPrice: 25.5,
    expiryDate: "2026-11-01",
    mrStocks: {
      "Rajesh Kumar": 45,
      "Priya Sharma": 38,
      "Amit Singh": 42,
      "Sneha Patel": 35,
      "Manish Patel": 20,
    },
    description: "Advanced diabetes medication with improved efficacy",
  },
  {
    id: 2,
    productName: "CardioCare 10mg",
    batchNumber: "CRC20251102",
    totalStock: 300,
    distributed: 280,
    remaining: 20,
    unitPrice: 45.0,
    expiryDate: "2026-08-15",
    mrStocks: {
      "Rajesh Kumar": 25,
      "Priya Sharma": 30,
      "Amit Singh": 28,
      "Sneha Patel": 22,
      "Kavita Jain": 15,
    },
    description: "Cardiovascular health supplement",
  },
  {
    id: 3,
    productName: "PainRelief 200mg",
    batchNumber: "PNR20251103",
    totalStock: 800,
    distributed: 650,
    remaining: 150,
    unitPrice: 15.75,
    expiryDate: "2027-01-20",
    mrStocks: {
      "Rajesh Kumar": 60,
      "Priya Sharma": 55,
      "Amit Singh": 58,
      "Sneha Patel": 52,
      "Manish Patel": 45,
      "Kavita Jain": 40,
    },
    description: "Fast-acting pain relief medication",
  },
  {
    id: 4,
    productName: "NeuroMax 50mg",
    batchNumber: "NRM20251104",
    totalStock: 200,
    distributed: 180,
    remaining: 20,
    unitPrice: 85.0,
    expiryDate: "2026-05-10",
    mrStocks: {
      "Rajesh Kumar": 15,
      "Priya Sharma": 18,
      "Amit Singh": 12,
      "Sneha Patel": 20,
    },
    description: "Neurological disorder treatment",
  },
  {
    id: 5,
    productName: "ImmunoBoost 100mg",
    batchNumber: "IMB20251105",
    totalStock: 400,
    distributed: 350,
    remaining: 50,
    unitPrice: 35.25,
    expiryDate: "2026-12-30",
    mrStocks: {
      "Rajesh Kumar": 30,
      "Priya Sharma": 28,
      "Amit Singh": 32,
      "Sneha Patel": 25,
      "Manish Patel": 22,
      "Kavita Jain": 18,
    },
    description: "Immune system booster supplement",
  },
];

const mockDistributionHistory = [
  {
    id: 1,
    date: "2025-11-08",
    product: "Diabetex 500mg",
    mr: "Rajesh Kumar",
    quantity: 10,
    recipient: "Dr. Ramesh Gupta",
    status: "completed",
  },
  {
    id: 2,
    date: "2025-11-07",
    product: "CardioCare 10mg",
    mr: "Priya Sharma",
    quantity: 15,
    recipient: "MedPlus Pharmacy",
    status: "completed",
  },
  {
    id: 3,
    date: "2025-11-06",
    product: "PainRelief 200mg",
    mr: "Amit Singh",
    quantity: 20,
    recipient: "Dr. Vikram Singh",
    status: "completed",
  },
  {
    id: 4,
    date: "2025-11-05",
    product: "NeuroMax 50mg",
    mr: "Sneha Patel",
    quantity: 5,
    recipient: "Wellness Chemist",
    status: "completed",
  },
  {
    id: 5,
    date: "2025-11-04",
    product: "ImmunoBoost 100mg",
    mr: "Kavita Jain",
    quantity: 12,
    recipient: "City Pharmacy",
    status: "completed",
  },
];

// Mock Recent Activities
recentActivities = [];

// Mock Alerts & Notifications
alertsData = [];

// --- Document Ready ---
document.addEventListener("DOMContentLoaded", () => {
  // Debug: ensure Bootstrap and modal are available
  const modalEl = document.getElementById('distributeSampleModal');
  if (modalEl && typeof bootstrap !== 'undefined') {
    console.log('Bootstrap and modal elements found.');
  } else {
    console.error('Bootstrap or modal missing:', { modalEl, bootstrap: typeof bootstrap });
  }

  // --- Data Initialization (Updated to use Persistence) ---
  samplesData = loadInitialData("samplesData", []);
  distributionHistory = loadInitialData(
    "distributionHistory",
    []
  );
  mrData = loadInitialData("mrData", []); // Assuming MR data is static or updated elsewhere
  productsData = loadInitialData("productsData", []); // Assuming Products data is static or updated elsewhere

  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");

  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    mainContent.classList.toggle("expanded");
  });



  // Populate dropdowns
  function populateDropdowns() {
    // Product filter dropdown
    const filterProduct = document.getElementById("filterProduct");
    filterProduct.innerHTML = '<option value="">All Products</option>'; // Reset and add 'All' option
    productsData.forEach((product) => {
      const option = document.createElement("option");
      option.value = product.name;
      option.textContent = product.name;
      filterProduct.appendChild(option);
    });

    // MR filter dropdown
    const filterMR = document.getElementById("filterMR");
    filterMR.innerHTML = '<option value="">All MRs</option>'; // Reset and add 'All' option
    mrData.forEach((mr) => {
      const option = document.createElement("option");
      option.value = mr.name;
      option.textContent = mr.name;
      filterMR.appendChild(option);
    });

    // Distribute product dropdown
    const distributeProduct = document.getElementById("distributeProduct");
    distributeProduct.innerHTML = '<option value="">Select Product</option>'; // Reset and add default option
    productsData.forEach((product) => {
      const option = document.createElement("option");
      option.value = product.name;
      option.textContent = product.name;
      distributeProduct.appendChild(option);
    });

    // Distribute MR dropdown
    const distributeMR = document.getElementById("distributeMR");
    distributeMR.innerHTML = '<option value="">Select MR</option>'; // Reset and add default option
    mrData.forEach((mr) => {
      const option = document.createElement("option");
      option.value = mr.name;
      option.textContent = mr.name;
      distributeMR.appendChild(option);
    });

    // Add stock product dropdown
    const addStockProduct = document.getElementById("productName");
    if (addStockProduct && addStockProduct.tagName === "SELECT") {
      addStockProduct.innerHTML = '<option value="">Select Product</option>';
      productsData.forEach((product) => {
        const option = document.createElement("option");
        option.value = String(product.id);
        option.textContent = product.name;
        addStockProduct.appendChild(option);
      });
    }
  }

  // When the distribution modal is shown, refresh dropdowns from backend
  const distributeSampleModal = document.getElementById('distributeSampleModal');
  if (distributeSampleModal) {
    distributeSampleModal.addEventListener('show.bs.modal', async () => {
      await refreshSamplesFromApiOrFallback();
      await refreshMrsFromApiOrFallback();
      populateDropdowns();

      if (pendingDistributeProductName) {
        const distributeProductSelect = document.getElementById("distributeProduct");
        if (distributeProductSelect) {
          distributeProductSelect.value = pendingDistributeProductName;
        }
        pendingDistributeProductName = null;
      }
    });
  }

  // When the add stock modal is shown, refresh products from backend and populate product dropdown
  const addStockModal = document.getElementById('addStockModal');
  if (addStockModal) {
    addStockModal.addEventListener('show.bs.modal', async () => {
      await refreshSamplesFromApiOrFallback();
      populateDropdowns();
    });
  }

  // Function to render sample table
  function renderSampleTable(data) {
    const samplesList = document.getElementById("samplesList");
    samplesList.innerHTML = "";

    data.forEach((sample) => {
      let stockBadge = "";

      if (sample.remaining === 0) {
        stockBadge = '<span class="badge bg-danger">Out of Stock</span>';
      } else if (sample.remaining < 50) {
        stockBadge = '<span class="badge bg-warning">Low Stock</span>';
      } else {
        stockBadge = '<span class="badge bg-success">In Stock</span>';
      }

      const row = document.createElement("tr");
      row.innerHTML = `
                <td><i class="bi bi-box-seam me-2"></i>${sample.productName
        }</td>
                <td>${sample.totalStock}</td>
                <td>${sample.distributed}</td>
                <td>${sample.remaining}</td>
                <td>\u20B9${sample.unitPrice}</td>
                <td>${formatDate(sample.expiryDate)}</td>
                <td>
                  <button class="btn btn-outline-info btn-sm me-1" onclick="viewMRStocks()">
                    <i class="bi bi-eye"></i>
                  </button>
                  <button class="btn btn-outline-primary btn-sm" type="button" data-sample-action="distribute" data-sample-id="${String(sample.id).replace(/"/g, '&quot;')}">
                    <i class="bi bi-truck"></i>
                  </button>
                </td>
              `;
      samplesList.appendChild(row);
    });
  }

  const samplesListEl = document.getElementById("samplesList");
  if (samplesListEl) {
    samplesListEl.addEventListener("click", (e) => {
      const btn = e.target.closest('button[data-sample-action="distribute"]');
      if (!btn) return;
      const sampleId = btn.getAttribute("data-sample-id");
      if (!sampleId) return;
      distributeSample(sampleId);
    });
  }

  // Function to render summary cards
  function renderSummaryCards(data) {
    const summaryCards = document.getElementById("summaryCards");
    const totalStock = data.reduce((sum, sample) => sum + sample.totalStock, 0);
    const totalDistributed = data.reduce(
      (sum, sample) => sum + sample.distributed,
      0
    );
    const lowStock = data.filter(
      (sample) => sample.remaining < 50 && sample.remaining > 0
    ).length;
    const outOfStock = data.filter((sample) => sample.remaining === 0).length;

    summaryCards.innerHTML = `
                <div class="col-md-3">
                  <div class="card summary-card summary-total-stock">
                    <div class="card-body">
                      <div class="card-content">
                        <h3>${totalStock}</h3>
                        <h5>Total Stock</h5>
                      </div>
                      <div class="card-icon">
                        <i class="bi bi-boxes"></i>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card summary-card summary-distributed">
                    <div class="card-body">
                      <div class="card-content">
                        <h3>${totalDistributed}</h3>
                        <h5>Distributed</h5>
                      </div>
                      <div class="card-icon">
                        <i class="bi bi-truck"></i>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card summary-card summary-low-stock">
                    <div class="card-body">
                      <div class="card-content">
                        <h3>${lowStock}</h3>
                        <h5>Low Stock</h5>
                      </div>
                      <div class="card-icon">
                        <i class="bi bi-exclamation-triangle"></i>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card summary-card summary-out-stock">
                    <div class="card-body">
                      <div class="card-content">
                        <h3>${outOfStock}</h3>
                        <h5>Out of Stock</h5>
                      </div>
                      <div class="card-icon">
                        <i class="bi bi-x-circle"></i>
                      </div>
                    </div>
                  </div>
                </div>
              `;
  }

  // Function to render distribution history
  function renderDistributionHistory(data) {
    const tableBody = document.getElementById("distributionTableBody");
    tableBody.innerHTML = "";

    data.forEach((distribution) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${formatDate(distribution.date)}</td>
                <td>${distribution.product}</td>
                <td>${distribution.mr}</td>
                <td>${distribution.quantity}</td>
                <td>${distribution.recipient}</td>
              `;
      tableBody.appendChild(row);
    });
  }

  function formatDate(dateStr) {
    if (!dateStr || dateStr === "Invalid Date") return "NA";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "NA";
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return "NA";
    }
  }

  // Search functionality
  const searchInput = document.getElementById("searchSample");
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredData = samplesData.filter(
      (sample) =>
        sample.productName.toLowerCase().includes(searchTerm) ||
        sample.batchNumber.toLowerCase().includes(searchTerm) ||
        sample.description.toLowerCase().includes(searchTerm)
    );
    renderSampleTable(filteredData);
  });

  // Filter functionality
  const filterProduct = document.getElementById("filterProduct");
  const filterMR = document.getElementById("filterMR");
  const filterStockStatus = document.getElementById("filterStockStatus");

  function applyFilters() {
    let filteredData = samplesData;

    if (filterProduct.value) {
      filteredData = filteredData.filter(
        (sample) => sample.productName === filterProduct.value
      );
    }

    if (filterMR.value) {
      filteredData = filteredData.filter(
        (sample) => sample.mrStocks[filterMR.value] !== undefined
      );
    }

    if (filterStockStatus.value) {
      switch (filterStockStatus.value) {
        case "low":
          filteredData = filteredData.filter(
            (sample) => sample.remaining < 50 && sample.remaining > 0
          );
          break;
        case "medium":
          filteredData = filteredData.filter(
            (sample) => sample.remaining >= 50 && sample.remaining <= 100
          );
          break;
        case "high":
          filteredData = filteredData.filter(
            (sample) => sample.remaining > 100
          );
          break;
        case "out":
          filteredData = filteredData.filter(
            (sample) => sample.remaining === 0
          );
          break;
      }
    }

    renderSampleTable(filteredData);
  }

  filterProduct.addEventListener("change", applyFilters);
  filterMR.addEventListener("change", applyFilters);
  filterStockStatus.addEventListener("change", applyFilters);

  // Add stock functionality (UPDATED)
  const saveStockBtn = document.getElementById("saveStockBtn");
  saveStockBtn.addEventListener("click", () => {
    const form = document.getElementById("addStockForm");
    if (form.checkValidity()) {
      const quantityAdded = parseInt(
        document.getElementById("quantityAdded").value
      );
      const unitPriceEl = document.getElementById("unitPrice");
      const unitPriceValue = unitPriceEl ? parseFloat(unitPriceEl.value) : NaN;
      const batchNumberValue = "";
      const expiryDateEl = document.getElementById("expiryDate");
      const expiryDateValue = expiryDateEl ? String(expiryDateEl.value || "").trim() : "";
      const descEl = document.getElementById("productDescription");
      const descValue = descEl ? String(descEl.value || "").trim() : "";
      const productSelect = document.getElementById("productName");
      const productId = productSelect ? String(productSelect.value || "") : "";
      const productName = productSelect && productSelect.selectedOptions && productSelect.selectedOptions[0]
        ? productSelect.selectedOptions[0].textContent
        : "";

      if (!productId) {
        alert("Please select a Product");
        return;
      }

      // Check if product already exists
      let existingSample = samplesData.find(
        (s) => String(s.productId || s.id) === String(productId)
      );

      (async function () {
        if (samplesApiMode) {
          try {
            const currentUserName = localStorage.getItem("signup_name") || "";
            const stockItem = await apiJson(`${MR_STOCK_API_BASE}/${productId}?userName=${encodeURIComponent(currentUserName)}`);
            const currentStock = Number(stockItem.stock) || 0;
            const nextStock = currentStock + quantityAdded;

            await apiJson(`${MR_STOCK_API_BASE}/${productId}?userName=${encodeURIComponent(currentUserName)}`, {
              method: "PUT",
              body: JSON.stringify({
                name: stockItem.name || productName,
                stock: nextStock,
              }),
            });

            try {
              await apiJson(STOCK_RECEIVED_API_BASE, {
                method: "POST",
                body: JSON.stringify({
                  productId: String(productId),
                  quantity: quantityAdded,
                  date: new Date().toISOString(),
                  userName: currentUserName,
                  notes: `Added stock via Manager Samples page`,
                }),
              });
            } catch (e) {
              console.warn("Stock received API failed (stock already updated).", e);
            }

            upsertSampleMeta(productId, {
              unitPrice: !isNaN(unitPriceValue) && unitPriceValue >= 0 ? unitPriceValue : undefined,
              batchNumber: batchNumberValue || undefined,
              expiryDate: expiryDateValue || undefined,
              description: descValue || undefined,
            });

            await refreshSamplesFromApiOrFallback();
            await refreshDistributionsFromApiOrFallback();
            populateDropdowns();
            renderSampleTable(samplesData);
            renderSummaryCards(samplesData);
            renderDistributionHistory(distributionHistory);

            const modal = bootstrap.Modal.getInstance(
              document.getElementById("addStockModal")
            );
            modal.hide();
            form.reset();
            return;
          } catch (e) {
            console.warn("Add stock API failed. Falling back to localStorage.", e);
            samplesApiMode = false;
            alert("Backend stock update failed, so refresh ke baad old data aa sakta hai. Please login / restart backend and try again.\n\nError: " + (e && e.message ? e.message : e));
          }
        }

        if (existingSample) {
          // If exists, update stock and unitPrice
          existingSample.totalStock += quantityAdded;
          existingSample.remaining += quantityAdded;
          const newUnitPrice = parseFloat(document.getElementById("unitPrice").value);
          if (!isNaN(newUnitPrice) && newUnitPrice >= 0) {
            existingSample.unitPrice = newUnitPrice;
          }
          upsertSampleMeta(productId, {
            unitPrice: !isNaN(newUnitPrice) && newUnitPrice >= 0 ? newUnitPrice : undefined,
            batchNumber: batchNumberValue || undefined,
            expiryDate: expiryDateValue || undefined,
            description: descValue || undefined,
          });
        } else {
          // If new product, create new sample object
          const newSample = {
            id: samplesData.length + 1,
            productId: String(productId),
            productName: productName,
            batchNumber: document.getElementById("batchNumber").value,
            totalStock: quantityAdded,
            distributed: 0,
            remaining: quantityAdded,
            unitPrice: parseFloat(document.getElementById("unitPrice").value),
            expiryDate: document.getElementById("expiryDate").value,
            mrStocks: {},
            description: document.getElementById("productDescription").value,
          };
          samplesData.push(newSample);

          upsertSampleMeta(productId, {
            unitPrice: !isNaN(newSample.unitPrice) && newSample.unitPrice >= 0 ? newSample.unitPrice : undefined,
            batchNumber: newSample.batchNumber || undefined,
            expiryDate: newSample.expiryDate || undefined,
            description: newSample.description || undefined,
          });

          // Add to static productsData to update dropdowns immediately
          productsData.push({
            id: productsData.length + 1,
            name: newSample.productName,
            category: "New",
          });
          saveData("productsData", productsData); // Save updated products list
          populateDropdowns(); // Re-populate dropdowns with new product
        }

        // Save updated samples data to localStorage
        saveData("samplesData", samplesData);

        renderSampleTable(samplesData);
        renderSummaryCards(samplesData);

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("addStockModal")
        );
        modal.hide();
        form.reset();
      })();
    } else {
      form.reportValidity();
    }
  });

  // Distribute sample functionality (UPDATED)
  const distributeBtn = document.getElementById("distributeBtn");
  distributeBtn.addEventListener("click", () => {
    const form = document.getElementById("distributeSampleForm");
    if (form.checkValidity()) {
      const productName = document.getElementById("distributeProduct").value;
      const mrName = document.getElementById("distributeMR").value;
      const quantity = parseInt(
        document.getElementById("distributeQuantity").value
      );
      const recipientName = document.getElementById("recipientName").value;
      const notes = document.getElementById("distributionNotes").value;

      // Find the sample and update stock
      const sample = samplesData.find((s) => s.productName === productName);
      if (sample && sample.remaining >= quantity) {
        (async function () {
          if (samplesApiMode && sample.productId) {
            try {
              const currentUserName = localStorage.getItem("signup_name") || "";
              const stockItem = await apiJson(`${MR_STOCK_API_BASE}/${sample.productId}?userName=${encodeURIComponent(currentUserName)}`);
              const currentStock = Number(stockItem.stock) || 0;
              const nextStock = currentStock - quantity;
              if (nextStock < 0) {
                alert("Insufficient stock!");
                return;
              }

              await apiJson(`${MR_STOCK_API_BASE}/${sample.productId}?userName=${encodeURIComponent(currentUserName)}`, {
                method: "PUT",
                body: JSON.stringify({
                  name: stockItem.name,
                  stock: nextStock,
                }),
              });

              // SYNC with MR Stock
              // Call stock-received API to increment the "field stock" for the receiving MR
              try {
                await apiJson(`${API_BASE}/api/stock-received`, {
                  method: "POST",
                  body: JSON.stringify({
                    productId: String(sample.productId),
                    quantity: Number(quantity),
                    date: new Date().toISOString(),
                    userName: mrName,
                    notes: `Allocated to ${mrName} by Manager ${currentUserName}`
                  })
                });
                console.log("Successfully synced with MR stock");
              } catch (err) {
                console.warn("MR stock sync failed", err);
              }

              // Save distribution record to backend
              await apiJson(`${API_BASE}/api/distributions`, {
                method: "POST",
                body: JSON.stringify({
                  product: productName,
                  mr: mrName,
                  quantity: quantity,
                  recipient: recipientName,
                  notes: notes,
                  userName: currentUserName
                }),
              });

              // Re-fetch from backend so state is permanent and consistent after refresh.
              await refreshSamplesFromApiOrFallback();
              await refreshDistributionsFromApiOrFallback();

              populateDropdowns();
              renderSampleTable(samplesData);
              renderSummaryCards(samplesData);
              renderDistributionHistory(distributionHistory);

              const modal = bootstrap.Modal.getInstance(
                document.getElementById("distributeSampleModal")
              );
              if (modal) modal.hide();
              form.reset();
              return;
            } catch (e) {
              console.warn("Distribute API failed. Falling back to localStorage.", e);
              samplesApiMode = false;
              alert("Backend distribution save failed, so refresh ke baad old data aa sakta hai. Please login / restart backend and try again.\n\nError: " + (e && e.message ? e.message : e));
            }
          }

          if (!samplesApiMode) {
            sample.distributed += quantity;
            sample.remaining -= quantity;
            sample.totalStock = sample.remaining;
          }

          // Update MR stock
          if (!sample.mrStocks[mrName]) {
            sample.mrStocks[mrName] = 0;
          }
          sample.mrStocks[mrName] += quantity;

          // Add to distribution history
          const newDistribution = {
            id: distributionHistory.length + 1,
            date: new Date().toISOString().split("T")[0],
            product: productName,
            mr: mrName,
            quantity: quantity,
            recipient: recipientName,
            status: "completed",
          };
          distributionHistory.unshift(newDistribution);

          // Save updated data to localStorage
          saveData("samplesData", samplesData);
          saveData("distributionHistory", distributionHistory);

          renderSampleTable(samplesData);
          renderSummaryCards(samplesData);
          renderDistributionHistory(distributionHistory);

          // Close modal and reset form
          const modal = bootstrap.Modal.getInstance(
            document.getElementById("distributeSampleModal")
          );
          modal.hide();
          form.reset();

          if (samplesApiMode) {
            await refreshSamplesFromApiOrFallback();
            await refreshDistributionsFromApiOrFallback();
            populateDropdowns();
            renderSampleTable(samplesData);
            renderSummaryCards(samplesData);
            renderDistributionHistory(distributionHistory);
          }
        })();
      } else {
        alert("Insufficient stock or invalid product!");
      }
    } else {
      form.reportValidity();
    }
  });

  // Render Notifications for Modal
  function renderNotifications() {
    const container = document.getElementById("notificationsList");
    if (!container) return;

    const allNotifications = [
      ...alertsData.map((alert) => ({ ...alert, type: "alert" })),
      ...recentActivities.map((activity) => ({
        ...activity,
        type: "activity",
      })),
    ];

    container.innerHTML = allNotifications
      .slice(0, 10) // Show latest 10 notifications
      .map(
        (notification) => `
                  <div class="notification-item p-3 border-bottom">
                    <div class="d-flex align-items-start">
                      <div class="notification-icon ${notification.iconClass || "bg-primary"
          } text-white me-3">
                        <i class="bi ${notification.icon}"></i>
                      </div>
                      <div class="flex-grow-1">
                        <h6 class="mb-1">${notification.title}</h6>
                        <p class="mb-1 text-muted small">${notification.description
          }</p>
                        <small class="text-muted">${notification.time || "Just now"
          }</small>
                      </div>
                    </div>
                  </div>
                `
      )
      .join("");
  }

  // Profile Modal Data Load
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");

  const savedName = localStorage.getItem("signup_name") || "Admin User";
  const savedEmail =
    localStorage.getItem("signup_email") || "admin@kavyapharm.com";

  profileName.textContent = savedName;
  profileEmail.textContent = savedEmail;

  (async function () {
    await refreshSamplesFromApiOrFallback();
    await refreshDistributionsFromApiOrFallback();
    populateDropdowns();
    renderSampleTable(samplesData);
    renderSummaryCards(samplesData);
    renderDistributionHistory(distributionHistory);
    renderNotifications();
  })();
});

// Global functions for sample actions
function viewMRStocks() {
  const modalElement = document.getElementById("mrStocksModal");
  const modalTitle = modalElement.querySelector(".modal-title");
  const modalBody = modalElement.querySelector(".modal-body");

  // Update modal content
  modalTitle.innerHTML = `<i class="bi bi-person-badge me-2"></i> All MR Stocks`;

  // Aggregate all MR stocks across all products
  const allMRStocks = {};
  let totalWarehouseStock = 0;

  samplesData.forEach((sample) => {
    totalWarehouseStock += sample.remaining;
    Object.entries(sample.mrStocks).forEach(([mr, stock]) => {
      if (!allMRStocks[mr]) {
        allMRStocks[mr] = 0;
      }
      allMRStocks[mr] += stock;
    });
  });

  let tableHtml = `<div class="table-responsive"><table class="table table-striped table-hover">
                <thead><tr><th>MR Name</th><th>Total Stock Quantity</th></tr></thead>
                <tbody>`;

  let totalMRStock = 0;
  Object.entries(allMRStocks).forEach(([mr, stock]) => {
    tableHtml += `<tr><td>${mr}</td><td><span class="badge bg-primary">${stock} units</span></td></tr>`;
    totalMRStock += stock;
  });

  tableHtml += `</tbody><tfoot><tr class="table-dark"><td><strong>Total Assigned to MRs:</strong></td><td><strong>${totalMRStock} units</strong></td></tr></tfoot></table></div>`;

  // Add total warehouse remaining stock
  tableHtml += `<p class="mt-3"><strong>Total Warehouse Remaining Stock:</strong> <span class="badge bg-success">${totalWarehouseStock} units</span></p>`;

  modalBody.innerHTML = tableHtml;

  // Show the modal
  const mrStocksModal = new bootstrap.Modal(modalElement);
  mrStocksModal.show();
}

function distributeSample(sampleId) {
  // Find the sample to pre-select the product
  const sample = samplesData.find((s) => String(s.id) === String(sampleId));
  if (sample) {
    // Selection must happen AFTER the modal refreshes dropdowns from backend.
    pendingDistributeProductName = sample.productName;

    const modal = new bootstrap.Modal(
      document.getElementById("distributeSampleModal")
    );
    modal.show();
  }
}

