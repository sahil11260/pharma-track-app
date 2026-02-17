document.addEventListener("DOMContentLoaded", () => {
  // const API_BASE = window.location.port === "5500" ? "http://localhost:8080" : "";
  const API_BASE = (window.location.port === "5500" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? (window.location.port === "8080" ? "" : "http://localhost:8080")
    : "";

  const TARGETS_API_BASE = `${API_BASE}/api/targets`;
  const USERS_API_BASE = `${API_BASE}/api/users`;
  const PRODUCTS_API_BASE = `${API_BASE}/api/products`;
  const STORAGE_KEY = "kavyaPharmAdminTargetsData";
  let targetsApiMode = true;

  const tableBody = document.getElementById("targetTableBody");
  const form = document.getElementById("targetForm");
  const searchInput = document.getElementById("searchTarget");
  const pagination = document.getElementById("pagination");
  const fromDate = document.getElementById("fromDate");
  const toDate = document.getElementById("toDate");
  const targetProduct = document.getElementById("targetProduct");
  const targetQty = document.getElementById("targetQty");
  const availableInfo = document.getElementById("availableInfo");

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

  // loadFromStorageIfAny removed to enforce dynamic data

  function mapApiStatusToUi(t) {
    const s = String(t.status || "").toLowerCase();
    if ((Number(t.achievementPercentage) || 0) >= 100) return "Achieved";
    if (s === "excellent" || s === "achieved" || s === "completed") return "Achieved";
    return "Pending";
  }

  function uiStatusToApiStatus(status) {
    return String(status) === "Achieved" ? "excellent" : "poor";
  }

  function normalizeTargetFromApi(t) {
    return {
      id: Number(t.id),
      mrName: t.mrName,
      period: t.period,
      salesTarget: Number(t.salesTarget) || 0,
      salesAchievement: Number(t.salesAchievement) || 0,
      achievementPercentage: Math.round(Number(t.achievementPercentage) || 0),
      startDate: t.startDate || "",
      endDate: t.endDate || "",
      status: mapApiStatusToUi(t)
    };
  }

  async function refreshTargetsFromApiOrFallback() {
    try {
      const data = await apiJson(TARGETS_API_BASE);
      if (Array.isArray(data)) {
        targets = data.map(normalizeTargetFromApi);
        targetsApiMode = true;
        hideApiRetryBanner();
        // Update cache
        localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
      } else {
        loadFromStorage();
        showApiRetryBanner();
      }
    } catch (e) {
      console.warn("Targets API unavailable.", e);
      targetsApiMode = false;
      loadFromStorage();
      showApiRetryBanner();
    }
  }

  function loadFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        targets = JSON.parse(saved);
      } catch (e) {
        targets = [];
      }
    }
  }

  function showApiRetryBanner() {
    if (document.getElementById("targetApiRetryBanner")) return;
    const banner = document.createElement("div");
    banner.id = "targetApiRetryBanner";
    banner.className = "alert alert-warning text-center";
    banner.style.margin = "10px 0";
    banner.innerHTML =
      '<strong>Targets API unreachable.</strong> Some actions will use local data. ' +
      '<button id="targetApiRetryBtn" class="btn btn-sm btn-outline-primary ms-2">Retry</button>';
    const container = document.querySelector(".container") || document.body;
    container.insertBefore(banner, container.firstChild);
    document.getElementById("targetApiRetryBtn").addEventListener("click", async function () {
      hideApiRetryBanner();
      try {
        await refreshTargetsFromApiOrFallback();
        renderTable();
      } catch (e) {
        showApiRetryBanner();
      }
    });
  }

  function hideApiRetryBanner() {
    const b = document.getElementById("targetApiRetryBanner");
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  async function createTargetApi(t) {
    return await apiJson(TARGETS_API_BASE, {
      method: "POST",
      body: JSON.stringify({
        mrName: t.mrName,
        period: t.period,
        salesTarget: Number(t.salesTarget) || 0,
        visitsTarget: 0,
        startDate: t.startDate || null,
        endDate: t.endDate || null,
        status: uiStatusToApiStatus(t.status)
      })
    });
  }

  async function updateTargetApi(id, t) {
    const isAchieved = String(t.status) === "Achieved";
    return await apiJson(`${TARGETS_API_BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        mrName: t.mrName,
        period: t.period,
        salesTarget: Number(t.salesTarget) || 0,
        salesAchievement: isAchieved ? (Number(t.salesTarget) || 0) : 0,
        visitsTarget: 0,
        visitsAchievement: 0,
        startDate: t.startDate || null,
        endDate: t.endDate || null,
        status: uiStatusToApiStatus(t.status)
      })
    });
  }

  async function deleteTargetApi(id) {
    await apiJson(`${TARGETS_API_BASE}/${id}`, { method: "DELETE" });
  }

  // \u2705 Fetch and Populate Dropdowns
  let allManagers = [];
  let allProducts = [];

  async function refreshUsersAndProducts() {
    try {
      const [users, products] = await Promise.all([
        apiJson(USERS_API_BASE),
        apiJson(PRODUCTS_API_BASE)
      ]);
      if (Array.isArray(users)) {
        // Filter only for MANAGER role and deduplicate by name
        const managerNames = new Set();
        allManagers = users.filter(u => {
          const role = (u.role && typeof u.role === 'object') ? u.role.name : u.role;
          if (role === "MANAGER" && !managerNames.has(u.name)) {
            managerNames.add(u.name);
            return true;
          }
          return false;
        });
        populateManagerSelect();
      }
      if (Array.isArray(products)) {
        allProducts = products;
        populateProductSelect();
      }
    } catch (e) {
      console.error("Failed to fetch users or products", e);
    }
  }

  function updateAvailableInfo() {
    const productName = targetProduct.value;
    const product = allProducts.find((p) => p.name === productName);
    const qty = Number(targetQty.value || 0);

    if (product) {
      const stock = Number(product.stock) || 0;

      // Calculate total assigned for this product
      const assignedTotal = targets
        .filter(t => t.period === productName && (editIndex === null || Number(t.id) !== Number(editIndex)))
        .reduce((sum, t) => sum + (Number(t.salesTarget) || 0), 0);

      const availableToAssign = stock - assignedTotal;
      const after = availableToAssign - qty;

      let infoText = `Total Stock: ${stock} | Assigned: ${assignedTotal} | Remaining: ${availableToAssign}`;
      if (qty > 0) {
        infoText += ` \u2014 After this: ${after >= 0 ? after : "--- (insufficient)"}`;
      }

      availableInfo.textContent = infoText;
      if (after < 0) availableInfo.classList.add("text-danger");
      else availableInfo.classList.remove("text-danger");
    } else {
      availableInfo.textContent = "";
    }
  }

  targetProduct && targetProduct.addEventListener("change", updateAvailableInfo);
  targetQty && targetQty.addEventListener("input", updateAvailableInfo);

  function populateManagerSelect() {
    const sel = document.getElementById("targetPerson");
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">Select a Manager</option>' +
      allManagers.map(m => `<option value="${m.name}">${m.name}</option>`).join("");
    if (currentVal) sel.value = currentVal;
  }

  function populateProductSelect() {
    const sel = document.getElementById("targetProduct");
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">Select a Product</option>' +
      allProducts.map(p => `<option value="${p.name}">${p.name} (Code: ${p.productId || p.id})</option>`).join("");
    if (currentVal) sel.value = currentVal;
  }

  // dynamic: initially empty; load from API or localStorage
  let targets = [];

  let currentPage = 1;
  const itemsPerPage = 6;
  let editIndex = null;

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
  }

  // ---------------------------------------------------------
  // ðŸ”¥ MAIN RENDER FUNCTION (Table)
  // ---------------------------------------------------------
  function renderTable() {
    const searchTerm = (searchInput.value || "").toLowerCase();
    const from = fromDate.value ? new Date(fromDate.value) : null;
    const to = toDate.value ? new Date(toDate.value) : null;

    let filtered = targets.filter((t) => {
      const matchSearch =
        (t.mrName || "").toLowerCase().includes(searchTerm) ||
        (t.period || "").toLowerCase().includes(searchTerm);

      const startDateObj = t.startDate ? new Date(t.startDate) : null;
      const matchDate = (!from || (startDateObj && startDateObj >= from)) &&
        (!to || (startDateObj && startDateObj <= to));

      return matchSearch && matchDate;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);

    tableBody.innerHTML =
      paginated
        .map(
          (t, i) => `
        <tr>
          <td>${start + i + 1}</td>
          <td>${formatDate(t.startDate)}</td>
          <td>${t.mrName}</td>
          <td class="fw-bold text-primary">${t.period}</td>
          <td>${(t.salesTarget || 0).toLocaleString()}</td>
          <td>${(t.salesAchievement || 0).toLocaleString()}</td>
          <td class="${(t.achievementPercentage || 0) >= 100 ? 'text-success fw-bold' : ''}">${t.achievementPercentage || 0}%</td>
          <td>
            <span class="badge ${t.status === 'Achieved' ? 'bg-success' : 'bg-warning text-dark'}">
              ${t.status}
            </span>
          </td>
          <td>
            <div class="d-flex align-items-center">
              ${t.status === "Pending"
              ? `
                <button class="btn btn-sm btn-outline-success me-1" onclick="markAchieved(${t.id})" title="Achieved"><i class="bi bi-check-lg"></i></button>
                `
              : `<button class="btn btn-sm btn-outline-warning me-1" onclick="markPending(${t.id})" title="Mark Pending"><i class="bi bi-arrow-repeat"></i></button>`
            }
              <button class="btn btn-sm btn-outline-primary me-1" onclick="editTarget(${t.id})"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteTarget(${t.id})"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>`
        )
        .join("") || `<tr><td colspan="9" class="text-center text-muted">No targets found</td></tr>`;

    renderPagination(totalPages, filtered);
  }

  // ---------------------------------------------------------
  // ðŸ”¥ PAGINATION WITH PREVIOUS / NEXT
  // ---------------------------------------------------------
  function renderPagination(totalPages, filtered) {
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
        </li>`;
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

        if (value === "prev" && currentPage > 1) {
          currentPage--;
        } else if (value === "next" && currentPage < totalPages) {
          currentPage++;
        } else if (!isNaN(value)) {
          currentPage = parseInt(value);
        }

        renderTable();
      })
    );
  }

  // ---------------------------------------------------------
  // ðŸ”¥ FORM VALIDATION
  // ---------------------------------------------------------
  function validateForm() {
    const name = form.targetPerson.value.trim();
    const product = form.targetProduct.value.trim();
    const qty = Number(form.targetQty.value.trim());
    const given = form.targetGivenDate.value;
    const deadline = form.targetDeadline.value;

    const productObj = allProducts.find(p => p.name === product);
    const totalStock = productObj ? (Number(productObj.stock) || 0) : 0;

    // Calculate total assigned for this product (excluding current if editing)
    const prevAssignedTotal = targets
      .filter(t => t.period === product && (editIndex === null || Number(t.id) !== Number(editIndex)))
      .reduce((sum, t) => sum + (Number(t.salesTarget) || 0), 0);

    if (!name || !product || !qty || !given || !deadline) {
      alert("âš ï¸ Fill all fields.");
      return false;
    }

    if (qty <= 0) {
      alert("âš  Quantity must be positive.");
      return false;
    }

    const availableToAssign = totalStock - prevAssignedTotal;
    if (qty > availableToAssign) {
      const msg = prevAssignedTotal > 0
        ? `âš  Insufficient stock. Available: ${totalStock} units. \nAlready assigned: ${prevAssignedTotal} units. \nRemaining capacity: ${availableToAssign} units.`
        : `âš  Insufficient stock. Available: ${totalStock} units.`;
      alert(msg);
      return false;
    }

    if (new Date(deadline) < new Date(given)) {
      alert("âš  Deadline cannot be before Given Date.");
      return false;
    }

    return true;
  }

  // ---------------------------------------------------------
  // ðŸ”¥ CRUD OPERATIONS
  // ---------------------------------------------------------
  window.markAchieved = (id) => {
    const idx = targets.findIndex((x) => Number(x.id) === Number(id));
    if (idx === -1) return;
    targets[idx].status = "Achieved";
    targets[idx].salesAchievement = targets[idx].salesTarget; // Update achievement locally
    targets[idx].achievementPercentage = 100;

    (async function () {
      if (targetsApiMode) {
        try {
          await updateTargetApi(id, targets[idx]);
          await refreshTargetsFromApiOrFallback();
        } catch (e) {
          console.warn("Target update API failed. Falling back to localStorage.", e);
          targetsApiMode = false;
          showApiRetryBanner();
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
      renderTable();
    })();
  };

  window.markPending = (id) => {
    const idx = targets.findIndex((x) => Number(x.id) === Number(id));
    if (idx === -1) return;
    targets[idx].status = "Pending";
    targets[idx].salesAchievement = 0; // Reset achievement locally
    targets[idx].achievementPercentage = 0;

    (async function () {
      if (targetsApiMode) {
        try {
          await updateTargetApi(id, targets[idx]);
          await refreshTargetsFromApiOrFallback();
        } catch (e) {
          console.warn("Target update API failed. Falling back to localStorage.", e);
          targetsApiMode = false;
          showApiRetryBanner();
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
      renderTable();
    })();
  };

  window.deleteTarget = (id) => {
    if (!confirm("Delete this target?")) return;

    (async function () {
      if (targetsApiMode) {
        try {
          await deleteTargetApi(id);
          await refreshTargetsFromApiOrFallback();
          renderTable();
          return;
        } catch (e) {
          console.warn("Target delete API failed. Falling back to localStorage.", e);
          targetsApiMode = false;
          showApiRetryBanner();
        }
      }

      const idx = targets.findIndex((x) => Number(x.id) === Number(id));
      if (idx !== -1) targets.splice(idx, 1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
      renderTable();
    })();
  };

  window.editTarget = (id) => {
    const t = targets.find((x) => Number(x.id) === Number(id));
    if (!t) return;
    editIndex = Number(id);

    form.targetPerson.value = t.mrName;
    form.targetProduct.value = t.period;
    form.targetQty.value = t.salesTarget;
    form.targetGivenDate.value = t.startDate;
    form.targetDeadline.value = t.endDate;

    updateAvailableInfo();
    new bootstrap.Modal(document.getElementById("targetModal")).show();
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const data = {
      id: editIndex !== null ? Number(editIndex) : ((targets.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) || 0) + 1),
      mrName: form.targetPerson.value.trim(),
      period: form.targetProduct.value.trim(),
      salesTarget: Number(form.targetQty.value),
      salesAchievement: 0,
      achievementPercentage: 0,
      startDate: form.targetGivenDate.value,
      endDate: form.targetDeadline.value,
      status: editIndex !== null ? (targets.find(x => x.id === editIndex)?.status || "Pending") : "Pending",
    };

    (async function () {
      if (targetsApiMode) {
        try {
          if (editIndex !== null) {
            await updateTargetApi(editIndex, data);
          } else {
            const created = await createTargetApi(data);
            if (created && created.id && String(data.status) === "Achieved") {
              await updateTargetApi(created.id, Object.assign({}, data, { id: Number(created.id) }));
            }
          }

          await refreshTargetsFromApiOrFallback();
          alert("Record saved successfully");
          form.reset();
          bootstrap.Modal.getInstance(document.getElementById("targetModal")).hide();
          editIndex = null;
          renderTable();
          return;
        } catch (e) {
          console.warn("Target save API failed. Falling back to localStorage.", e);
          targetsApiMode = false;
          showApiRetryBanner();
        }
      }

      if (editIndex !== null) {
        const idx = targets.findIndex((x) => Number(x.id) === Number(editIndex));
        if (idx !== -1) targets[idx] = data;
        editIndex = null;
      } else {
        targets.push(data);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
      form.reset();
      alert("Record saved successfully");
      bootstrap.Modal.getInstance(document.getElementById("targetModal")).hide();
      renderTable();
    })();
  });

  // ---------------------------------------------------------
  // ðŸ”¥ FILTERS
  // ---------------------------------------------------------
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderTable();
  });

  fromDate.addEventListener("change", renderTable);
  toDate.addEventListener("change", renderTable);

  // loadFromStorageIfAny();
  (async function () {
    await refreshTargetsFromApiOrFallback();
    await refreshUsersAndProducts();
    renderTable();
  })();
});

