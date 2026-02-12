document.addEventListener("DOMContentLoaded", () => {
    console.log("[SALES] sales.js starting...");

    const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");

    function getAuthHeader() {
        const token = localStorage.getItem('kavya_auth_token') || localStorage.getItem('token');
        if (!token) {
            console.error("[SALES] CRITICAL: No authentication token found.");
        }
        return token ? { "Authorization": `Bearer ${token}` } : {};
    }

    async function apiJson(url, options = {}) {
        const headers = { "Content-Type": "application/json", ...getAuthHeader(), ...(options.headers || {}) };
        try {
            const response = await fetch(url, { ...options, headers });
            if (!response.ok) {
                let errorBody = "";
                try { errorBody = await response.text(); } catch (e) { }
                throw new Error(`HTTP ${response.status}: ${errorBody}`);
            }
            return response.json();
        } catch (err) {
            console.error(`[SALES] API error for ${url}:`, err);
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

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function getProgressColor(percentage) {
        if (percentage >= 90) return 'success';
        if (percentage >= 75) return 'info';
        if (percentage >= 50) return 'warning';
        return 'danger';
    }

    function getStatusColor(status) {
        const colors = {
            'Excellent': 'success',
            'Good': 'info',
            'Average': 'warning',
            'Poor': 'danger'
        };
        return colors[status] || 'secondary';
    }

    async function refreshSalesData() {
        try {
            showLoading(true);
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();

            // Step 1: Summary for top cards
            const summary = await apiJson(`${API_BASE}/api/mr-dashboard`).catch(err => {
                console.warn("[SALES] Summary failed, using empty values", err);
                return { sales: 0, targetPercent: 0 };
            });

            // Step 2: Detailed targets for table
            const targets = await apiJson(`${API_BASE}/api/mr/me/sales-targets?month=${month}&year=${year}`).catch(err => {
                console.error("[SALES] Targets load failed", err);
                return [];
            });

            updateTopCards(summary, targets);
            renderTargetsList(targets);
            showLoading(false);
        } catch (e) {
            console.error("[SALES] Refresh failed:", e);
            showError(`Data Load Error: ${e.message}`);
            showLoading(false);
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
    }

    function renderTargetsList(targets) {
        if (!salesListBody) return;
        salesListBody.innerHTML = "";

        if (!Array.isArray(targets) || targets.length === 0) {
            salesListBody.innerHTML = '<tr><td colspan="8" class="text-center p-4 text-muted">No sales targets found for the current month.</td></tr>';
            return;
        }

        salesListBody.innerHTML = targets.map((target, index) => {
            const percentage = target.achievementPercentage || 0;
            const progressColor = getProgressColor(percentage);

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${formatDate(target.assignedDate)}</td>
                    <td class="fw-bold text-primary">${target.productName}</td>
                    <td><span class="badge bg-secondary">${target.targetType}</span></td>
                    <td>${target.targetUnits}</td>
                    <td>${target.achievedUnits || 0}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <span class="me-2 small fw-bold">${percentage.toFixed(1)}%</span>
                            <div class="progress flex-grow-1" style="height: 6px;">
                                <div class="progress-bar bg-${progressColor}" 
                                     role="progressbar" 
                                     style="width: ${Math.min(percentage, 100)}%"
                                     aria-valuenow="${percentage}">
                                </div>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge bg-${getStatusColor(target.progressStatus)}">${target.progressStatus}</span></td>
                </tr>
            `;
        }).join('');
    }

    function showLoading(show) {
        if (show && salesListBody) {
            salesListBody.innerHTML = '<tr><td colspan="8" class="text-center p-4">Loading data...</td></tr>';
        }
    }

    function showError(msg) {
        if (salesListBody) {
            salesListBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger p-4"><i class="bi bi-exclamation-triangle me-2"></i> ${msg}</td></tr>`;
        }
    }

    refreshSalesData();
});
