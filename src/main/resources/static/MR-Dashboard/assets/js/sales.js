document.addEventListener("DOMContentLoaded", () => {
    console.log("[SALES] sales.js (v2) starting...");

    // const API_BASE = window.location.port === "5500" ? "http://localhost:8080/api" : "/api";
    const API_BASE = window.API_BASE || "/api";


    function getAuthHeader() {
        const token = localStorage.getItem('kavya_auth_token') || localStorage.getItem('token');
        if (!token) {
            console.error("[SALES] CRITICAL: No authentication token found. User is likely not logged in.");
        } else {
            console.log("[SALES] Auth token found.");
        }
        return token ? { "Authorization": `Bearer ${token}` } : {};
    }

    async function apiJson(url, options = {}) {
        const headers = { "Content-Type": "application/json", ...getAuthHeader(), ...(options.headers || {}) };
        console.log(`[SALES] Calling API: ${url}`);

        try {
            const response = await fetch(url, { ...options, headers });
            console.log(`[SALES] Response for ${url}:`, response.status, response.statusText);

            if (!response.ok) {
                let errorBody = "";
                try {
                    errorBody = await response.text();
                } catch (e) { }
                const msg = `HTTP ${response.status} (${response.statusText}): ${errorBody}`;
                throw new Error(msg);
            }
            return response.json();
        } catch (err) {
            console.error(`[SALES] Network or API error for ${url}:`, err);
            throw err;
        }
    }

    const totalSalesEl = document.getElementById("totalSales");
    const monthlyTargetEl = document.getElementById("monthlyTarget");
    const targetGapEl = document.getElementById("targetGap");
    const achievementPercentEl = document.getElementById("achievementPercent");
    const salesListBody = document.getElementById("salesListBody");

    function formatINR(amount) {
        return "₹" + Number(amount || 0).toLocaleString('en-IN');
    }

    async function refreshSalesData() {
        const auth = getAuthHeader();
        if (!auth.Authorization) {
            showError("Authentication required. Please log in again.");
            return;
        }

        try {
            // Step 1: Summary for top cards
            console.log("[SALES] Fetching dashboard summary...");
            const summary = await apiJson(`${API_BASE}/mr-dashboard`).catch(err => {
                console.warn("[SALES] Dashboard summary failed, using fallback empty values", err);
                return { sales: 0, targetPercent: 0 };
            });

            // Step 2: Detailed targets for table
            console.log("[SALES] Fetching detailed targets...");
            const targets = await apiJson(`${API_BASE}/mr/me/sales-targets`).catch(err => {
                console.error("[SALES] Detailed targets failed", err);
                throw err;
            });

            updateTopCards(summary, targets);
            renderMonthlyTable(targets);

        } catch (e) {
            console.error("[SALES] Detailed refresh failed:", e);
            showError(`Data Load Error: ${e.message}`);
        }
    }

    function updateTopCards(summary, targets) {
        // Main Sales figure from summary record
        const totalSales = summary.sales || 0;

        // Sum targets from the detailed list (excluding visits)
        let totalTarget = 0;
        if (Array.isArray(targets)) {
            targets.forEach(t => {
                if (t.category && t.category.toLowerCase() !== 'visit') {
                    totalTarget += (t.targetUnits || 0);
                }
            });
        }

        const targetGap = Math.max(0, totalTarget - totalSales);
        const achievementPct = totalTarget > 0 ? (totalSales / totalTarget) * 100 : 0;

        if (totalSalesEl) totalSalesEl.textContent = formatINR(totalSales);
        if (monthlyTargetEl) monthlyTargetEl.textContent = formatINR(totalTarget);
        if (targetGapEl) targetGapEl.textContent = formatINR(targetGap);
        if (achievementPercentEl) achievementPercentEl.textContent = `${achievementPct.toFixed(1)}%`;
        console.log("[SALES] Top cards updated successfully.");
    }

    function renderMonthlyTable(targets) {
        if (!salesListBody) return;
        salesListBody.innerHTML = "";

        if (!Array.isArray(targets) || targets.length === 0) {
            salesListBody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-muted">No sales targets found for the current month.</td></tr>';
            return;
        }

        const now = new Date();
        const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });

        let totalTarget = 0;
        let totalAchieved = 0;

        targets.forEach(t => {
            if (t.category && t.category.toLowerCase() !== 'visit') {
                totalTarget += (t.targetUnits || 0);
                totalAchieved += (t.achievedUnits || 0);
            }
        });

        const diff = totalAchieved - totalTarget;
        const status = totalAchieved >= totalTarget ?
            '<span class="badge bg-success">Achieved</span>' :
            '<span class="badge bg-warning text-dark">On-Track</span>';

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>1</td>
            <td>${monthYear}</td>
            <td>${formatINR(totalTarget)}</td>
            <td>${formatINR(totalAchieved)}</td>
            <td class="${diff >= 0 ? 'text-success' : 'text-danger'} fw-bold">${formatINR(diff)}</td>
            <td>${status}</td>
        `;
        salesListBody.appendChild(row);
        console.log("[SALES] Monthly table rendered.");
    }

    function showError(msg) {
        if (salesListBody) {
            salesListBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4">
                <i class="bi bi-exclamation-triangle-fill me-2"></i> ${msg}
            </td></tr>`;
        }
    }

    // Auto-refresh once
    refreshSalesData();
});
