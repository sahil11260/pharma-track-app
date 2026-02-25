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

    function formatUnits(amount) {
        return Number(amount || 0).toLocaleString('en-IN');
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
        // We unify data source: use 'targets' list for EVERYTHING to ensure consistency with the table
        let totalTarget = 0;
        let totalAchieved = 0;
        let targetLines = [];
        let achievedLines = [];
        let gapLines = [];
        let achievementLines = [];

        if (Array.isArray(targets)) {
            targets.forEach(t => {
                // Sum target and achieved units (excluding purely visit-based targets if any)
                if (t.category && t.category.toLowerCase() !== 'visit') {
                    const tUnits = t.targetUnits || 0;
                    const aUnits = t.achievedUnits || 0;
                    const gap = Math.max(0, tUnits - aUnits);
                    const pct = t.achievementPercentage || 0;

                    totalTarget += tUnits;
                    totalAchieved += aUnits;

                    // Product-wise lines
                    const pName = t.productName || "Unknown";
                    targetLines.push(`<div>${pName}: <strong>${tUnits}</strong></div>`);
                    achievedLines.push(`<div>${pName}: <strong>${aUnits}</strong></div>`);
                    gapLines.push(`<div>${pName}: <strong>${gap}</strong></div>`);
                    achievementLines.push(`<div>${pName}: <strong>${pct.toFixed(1)}%</strong></div>`);
                }
            });
        }

        const totalGap = Math.max(0, totalTarget - totalAchieved);

        // Revised Calculation: Use the average of individual product achievement percentages
        // This ensures the summary represents "Product-wise" performance accurately
        const salesTargets = targets.filter(t => t.category && t.category.toLowerCase() !== 'visit');
        const achievementPct = salesTargets.length > 0
            ? (salesTargets.reduce((sum, t) => sum + (t.achievementPercentage || 0), 0) / salesTargets.length)
            : 0;

        // Populate Cards and Breakdowns
        // Card 1: Total Target
        if (totalSalesEl) totalSalesEl.textContent = formatUnits(totalTarget);
        const targetBreakdownEl = document.getElementById("targetBreakdown");
        if (targetBreakdownEl && targetLines.length > 0) {
            targetBreakdownEl.innerHTML = targetLines.join('');
            targetBreakdownEl.style.display = "block";
        }

        // Card 2: Total Achieved
        if (monthlyTargetEl) monthlyTargetEl.textContent = formatUnits(totalAchieved);
        const achievedBreakdownEl = document.getElementById("achievedBreakdown");
        if (achievedBreakdownEl && achievedLines.length > 0) {
            achievedBreakdownEl.innerHTML = achievedLines.join('');
            achievedBreakdownEl.style.display = "block";
        }

        // Card 3: Target Gap
        if (targetGapEl) targetGapEl.textContent = formatUnits(totalGap);
        const gapBreakdownEl = document.getElementById("gapBreakdown");
        if (gapBreakdownEl && gapLines.length > 0) {
            gapBreakdownEl.innerHTML = gapLines.join('');
            gapBreakdownEl.style.display = "block";
        }

        // Card 4: Achievement %
        if (achievementPercentEl) achievementPercentEl.textContent = `${achievementPct.toFixed(1)}%`;
        const achievementBreakdownEl = document.getElementById("achievementBreakdown");
        if (achievementBreakdownEl && achievementLines.length > 0) {
            achievementBreakdownEl.innerHTML = achievementLines.join('');
            achievementBreakdownEl.style.display = "block";
        }
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
