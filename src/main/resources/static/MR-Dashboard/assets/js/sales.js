document.addEventListener("DOMContentLoaded", () => {
    console.log("[SALES] sales.js loaded and DOM ready");

    // --- API Configuration ---
    const API_BASE = window.location.port === "5500" ? "http://localhost:8080" : "";
    const TARGETS_API_BASE = `${API_BASE}/api/targets`;
    let targetsApiMode = true;

    function getAuthHeader() {
        const token = localStorage.getItem("kavya_auth_token");
        return token ? { "Authorization": `Bearer ${token}` } : {};
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

    // --- Data Storage ---
    let productTargetsData = [];
    let visitTargetsData = [];

    // --- Elements ---
    const productBody = document.getElementById("salesTargetTableBody");
    const doctorVisitBody = document.getElementById("doctorVisitTargetBody");
    const bannerContainer = document.getElementById("salesApiRetryBanner") || createBannerContainer();

    function createBannerContainer() {
        const div = document.createElement("div");
        div.id = "salesApiRetryBanner";
        div.className = "alert alert-warning alert-dismissible fade show";
        div.style.cssText = "position: fixed; top: 10px; right: 10px; z-index: 9999; max-width: 400px; display: none;";
        div.innerHTML = `
            <strong>âš ï¸ Offline Mode</strong>
            <p class="mb-0">Targets API unavailable. Showing generic/empty data. <button class="btn btn-sm btn-warning" onclick="location.reload()">Retry</button></p>
        `;
        document.body.appendChild(div);
        return div;
    }

    function showApiRetryBanner() {
        if (bannerContainer) bannerContainer.style.display = "block";
    }

    function hideApiRetryBanner() {
        if (bannerContainer) bannerContainer.style.display = "none";
    }

    // --- Data Mapping ---
    function processTargets(backendTargets) {
        // Backend returns a list of targets (TargetResponse)
        // Each target has salesTarget, salesAchievement, visitsTarget, visitsAchievement
        // We will split each backend target into one "Product/Sales" entry and one "Visit" entry for the UI.

        const newProductTargets = [];
        const newVisitTargets = [];

        backendTargets.forEach(t => {
            // Safe date handling
            const assignmentDate = t.startDate || t.lastUpdated || new Date().toISOString().split('T')[0];

            // 1. Sales/Product Target Entry
            // Since backend is aggregate, we label it "Total Sales"
            newProductTargets.push({
                assignedDate: assignmentDate,
                product: "Total Sales", // Aggregate
                type: t.period || "Monthly",
                target: t.salesTarget || 0,
                achieved: t.salesAchievement || 0,
                remark: t.status || "-"
            });

            // 2. Visit Target Entry
            newVisitTargets.push({
                assignedDate: assignmentDate,
                category: "Doctor Visits",
                type: t.period || "Monthly",
                target: t.visitsTarget || 0,
                achieved: t.visitsAchievement || 0,
                remark: t.status || "-"
            });
        });

        productTargetsData = newProductTargets;
        visitTargetsData = newVisitTargets;
    }

    // --- API Functions ---
    async function refreshTargetsFromApi() {
        try {
            console.log("[SALES] Fetching targets from API...");
            const data = await apiJson(TARGETS_API_BASE);
            console.log("[SALES] API response received:", data);

            if (Array.isArray(data)) {
                processTargets(data);
                targetsApiMode = true;
                hideApiRetryBanner();
                saveLocalData();
                renderAll();
            } else {
                console.warn("[SALES] API returned non-array response");
                throw new Error("Invalid API response format");
            }
        } catch (e) {
            console.error("[SALES] API call failed:", e);
            targetsApiMode = false;
            showApiRetryBanner();
            loadLocalData(); // Fallback to local storage
            renderAll();
        }
    }

    // --- Local Storage ---
    function saveLocalData() {
        localStorage.setItem("mr_sales_targets_products", JSON.stringify(productTargetsData));
        localStorage.setItem("mr_sales_targets_visits", JSON.stringify(visitTargetsData));
    }

    function loadLocalData() {
        const p = localStorage.getItem("mr_sales_targets_products");
        const v = localStorage.getItem("mr_sales_targets_visits");
        if (p) productTargetsData = JSON.parse(p);
        if (v) visitTargetsData = JSON.parse(v);
    }

    // --- Rendering ---
    function getAchievementStatus(percentage) {
        let status = '';
        let colorClass = '';

        if (percentage >= 100) {
            status = 'Completed';
            colorClass = 'bg-success';
        } else if (percentage >= 90) {
            status = 'Outstanding';
            colorClass = 'bg-info';
        } else if (percentage >= 70) {
            status = 'Average';
            colorClass = 'bg-warning text-dark';
        } else {
            status = 'Poor';
            colorClass = 'bg-danger';
        }

        return `<span class="badge ${colorClass}">${status}</span>`;
    }

    function renderProducts() {
        productBody.innerHTML = "";

        if (productTargetsData.length === 0) {
            productBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No sales targets found for your account.</td></tr>';
            return;
        }

        productTargetsData.forEach((item, index) => {
            const targetVal = item.target || 1; // Prevent division by zero
            const achievementPercentage = ((item.achieved / targetVal) * 100).toFixed(1);
            const statusBadge = getAchievementStatus(parseFloat(achievementPercentage));

            const row = document.createElement('tr');
            // Highlight successful achievement in green
            const percentageColor = (parseFloat(achievementPercentage) >= 100) ? 'text-success fw-bold' : '';

            // Format date
            let displayDate = item.assignedDate;
            try {
                displayDate = new Date(item.assignedDate).toLocaleDateString('en-IN');
            } catch (e) { }

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${displayDate}</td>
                <td class="fw-medium">${item.product}</td>
                <td><span class="badge bg-secondary">${item.type}</span></td>
                <td>${(item.target || 0).toLocaleString()}</td>
                <td>${(item.achieved || 0).toLocaleString()}</td>
                <td class="${percentageColor}">${achievementPercentage}%</td>
                <td>${statusBadge}</td>
                <td class="small text-muted">${item.remark}</td>
            `;
            productBody.appendChild(row);
        });
    }

    function renderVisits() {
        doctorVisitBody.innerHTML = "";

        if (visitTargetsData.length === 0) {
            doctorVisitBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No visit targets found for your account.</td></tr>';
            return;
        }

        visitTargetsData.forEach((item, index) => {
            const targetVal = item.target || 1;
            const achievementPercentage = ((item.achieved / targetVal) * 100).toFixed(1);
            const statusBadge = getAchievementStatus(parseFloat(achievementPercentage));

            const row = document.createElement('tr');
            const percentageColor = (parseFloat(achievementPercentage) >= 100) ? 'text-success fw-bold' : '';

            // Format date
            let displayDate = item.assignedDate;
            try {
                displayDate = new Date(item.assignedDate).toLocaleDateString('en-IN');
            } catch (e) { }

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${displayDate}</td>
                <td class="fw-medium">${item.category}</td>
                <td><span class="badge bg-primary">${item.type}</span></td>
                <td>${(item.target || 0).toLocaleString()}</td>
                <td>${(item.achieved || 0).toLocaleString()}</td>
                <td class="${percentageColor}">${achievementPercentage}%</td>
                <td>${statusBadge}</td>
                <td class="small text-muted">${item.remark}</td>
            `;
            doctorVisitBody.appendChild(row);
        });
    }

    function renderAll() {
        renderProducts();
        renderVisits();
    }

    // --- Initialization ---
    (async function init() {
        await refreshTargetsFromApi();
    })();
});
