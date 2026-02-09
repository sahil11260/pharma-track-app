/**
 * Manager Sales & Target Tracking - Dynamic API Implementation
 * Fixed version: Removed Actions column and Charts
 */

const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:8080/api'
    : 'https://pharma-track-app.onrender.com/api';

let targetsData = [];
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // 1. First load MRs for the current manager (needed for dropdowns in modals)
    await populateMRDropdowns();

    // 2. Load dashboard data (Shows all assigned MRs by default)
    await loadDashboard();

    // 3. Wire other components
    wireFilters();
    wireSetTargets();
    wirePerformanceReport();
});

// Load complete dashboard
async function loadDashboard() {
    try {
        showLoading(true);
        // Using both 'token' and 'kavya_auth_token' for compatibility
        const token = localStorage.getItem('token') || localStorage.getItem('kavya_auth_token');

        const response = await fetch(
            `${API_BASE}/manager/sales-targets/summary?month=${currentMonth}&year=${currentYear}`,
            {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to load dashboard data');
        }

        const data = await response.json();
        const allTargets = data.targets || [];

        // Filter targets so only those belonging to manager's MRs are shown
        const managerMrIds = window.managerMrIds || [];
        if (managerMrIds.length > 0) {
            targetsData = allTargets.filter(t => managerMrIds.includes(String(t.mrId)));
            console.log('[TARGETS] Filtered targets from', allTargets.length, 'to', targetsData.length);
        } else {
            targetsData = allTargets;
        }

        renderSummaryCards(data);
        renderTargetsTable(targetsData);
        renderTopPerformers(data.topPerformers);

        showLoading(false);
    } catch (error) {
        console.error('Dashboard load error:', error);
        showToast('Failed to load dashboard. Please refresh the page.', 'error');
        showLoading(false);
    }
}

// Render summary cards
function renderSummaryCards(data) {
    const summaryCardsContainer = document.getElementById('summaryCards');
    if (!summaryCardsContainer) return;

    summaryCardsContainer.innerHTML = `
        <div class="col-md-3">
            <div class="card metric-card">
              <div class="card-body">
                <h6 class="text-muted mb-2">Total Target</h6>
                <h4 class="fw-bold mb-0" data-metric="total-target">₹${(data.totalTarget || 0).toLocaleString()}</h4>
                <div class="mt-2 small text-success">
                  <i class="bi bi-arrow-up"></i> 12% vs last month
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card metric-card">
              <div class="card-body">
                <h6 class="text-muted mb-2">Total Achievement</h6>
                <h4 class="fw-bold mb-0" data-metric="total-achievement">₹${(data.totalAchievement || 0).toLocaleString()}</h4>
                <div class="mt-2 small text-success">
                  <i class="bi bi-arrow-up"></i> 8% vs last month
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card metric-card">
              <div class="card-body">
                <h6 class="text-muted mb-2">Avg Achievement %</h6>
                <h4 class="fw-bold mb-0" data-metric="avg-achievement">${Math.round(data.avgAchievementPercentage || 0)}%</h4>
                <div class="progress mt-2" style="height: 5px;">
                  <div class="progress-bar bg-primary" style="width: ${data.avgAchievementPercentage || 0}%"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card metric-card">
              <div class="card-body">
                <h6 class="text-muted mb-2">Top Performer</h6>
                <h4 class="fw-bold mb-0" data-metric="top-performer">${data.topPerformer || 'N/A'}</h4>
                <div class="mt-2 small text-muted">
                  Current period leader
                </div>
              </div>
            </div>
          </div>
    `;
}

// Render targets table (Actions column removed)
function renderTargetsTable(targets) {
    const tbody = document.getElementById('targetsList');
    if (!tbody) return;

    if (!targets || targets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No targets assigned for this period</td></tr>';
        return;
    }

    tbody.innerHTML = targets.map((target, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${formatDate(target.assignedDate)}</td>
            <td>${escapeHtml(target.mrName)}</td>
            <td>${escapeHtml(target.productName)}</td>
            <td><span class="badge bg-secondary">${target.targetType}</span></td>
            <td>${target.targetUnits}</td>
            <td>${target.achievedUnits || 0}</td>
            <td><strong>${target.achievementPercentage?.toFixed(1) || 0}%</strong></td>
        </tr>
    `).join('');
}

// Render top performers
function renderTopPerformers(performers) {
    const tbody = document.getElementById('topPerformersTableBody');
    if (!tbody) return;

    if (!performers || performers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No data available</td></tr>';
        return;
    }

    tbody.innerHTML = performers.map(perf => `
        <tr>
            <td>${perf.rank}</td>
            <td>${escapeHtml(perf.mrName)}</td>
            <td>₹${perf.target?.toLocaleString() || 0}</td>
            <td>₹${perf.achievement?.toLocaleString() || 0}</td>
            <td><strong>${perf.achievementPercentage?.toFixed(1) || 0}%</strong></td>
            <td><span class="badge bg-${getStatusColor(perf.status)}">${perf.status}</span></td>
        </tr>
    `).join('');
}

// Set Targets Modal
function wireSetTargets() {
    const categoryEl = document.getElementById('targetCategory');
    const labelEl = document.getElementById('targetUnitsLabel');
    if (categoryEl && labelEl) {
        categoryEl.addEventListener('change', () => {
            if (categoryEl.value === 'Visit') {
                labelEl.textContent = 'Target (Doctor Visits)';
            } else {
                labelEl.textContent = 'Target Units';
            }
        });
    }

    const saveBtn = document.getElementById('saveTargetBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const form = document.getElementById('setTargetsForm');
            const targetMrEl = document.getElementById('targetMR');
            const category = document.getElementById('targetCategory').value;

            if (form.checkValidity() && targetMrEl.value) {
                const formData = {
                    mrId: targetMrEl.value,
                    mrName: targetMrEl.options[targetMrEl.selectedIndex].text,
                    targetUnits: parseInt(document.getElementById('salesTarget').value),
                    productName: category === 'Visit' ? "Doctor Visits" : "General Sales",
                    category: category,
                    periodMonth: currentMonth,
                    periodYear: currentYear,
                    assignedBy: localStorage.getItem("signup_name") || "Manager"
                };
                saveTarget(formData);
                const modalEl = document.getElementById('setTargetsModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                form.reset();
                if (labelEl) labelEl.textContent = 'Target Units';
            } else {
                if (!targetMrEl.value) alert('Please select an MR');
                form.reportValidity();
            }
        });
    }
}

// Performance Report Modal
function wirePerformanceReport() {
    const generateBtn = document.getElementById('generatePerformanceReportBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            const mrId = document.getElementById('performanceMRSelection').value;
            const reportType = document.getElementById('performanceReportType').value;

            showToast(`Generating ${reportType} report for ${mrId === 'all' ? 'All MRs' : 'MR ID: ' + mrId}...`);
            const modalEl = document.getElementById('performanceReportModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        });
    }
}

// Populate MR Dropdowns (Filtered by Manager)
async function populateMRDropdowns() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('kavya_auth_token');

        // Get current manager info from localStorage
        let userObj = {};
        try {
            userObj = JSON.parse(localStorage.getItem("kavya_user") || "{}");
        } catch (e) { }
        const currentName = userObj.name || localStorage.getItem("signup_name") || "";
        const currentEmail = userObj.email || localStorage.getItem("signup_email") || "";
        const managerParam = currentName || currentEmail;

        console.log('[TARGETS] Fetching MR list for manager:', managerParam);

        // Fetch only MRs assigned to this manager
        const url = managerParam
            ? `${API_BASE}/users?manager=${encodeURIComponent(managerParam)}&role=MR`
            : `${API_BASE}/users?role=MR`;

        const response = await fetch(url, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch MRs from /api/users');
        }

        let mrs = await response.json();
        console.log('[TARGETS] Found MRs for manager:', mrs.length);

        if (!Array.isArray(mrs)) return;

        // Ensure we only have MRs (Secondary client-side filter for safety)
        mrs = mrs.filter(u => u.role === 'MR' || (u.role && u.role.name === 'MR'));

        if (mrs.length === 0) {
            const noMrOpt = '<option value="">No MRs assigned</option>';
            if (document.getElementById('filterMR')) document.getElementById('filterMR').innerHTML = noMrOpt;
            if (document.getElementById('targetMR')) document.getElementById('targetMR').innerHTML = noMrOpt;
            if (document.getElementById('performanceMRSelection')) document.getElementById('performanceMRSelection').innerHTML = noMrOpt;
            return;
        }

        const mrOptions = mrs.map(mr => `<option value="${mr.id}">${escapeHtml(mr.name)}</option>`).join('');

        // Populate Main Filter (NO "All MRs" option)
        const filterMR = document.getElementById('filterMR');
        if (filterMR) {
            filterMR.innerHTML = mrOptions;
        }

        // Populate Set Targets Modal dropdown
        const targetMR = document.getElementById('targetMR');
        if (targetMR) {
            targetMR.innerHTML = '<option value="">Select MR</option>' + mrOptions;
        }

        // Populate Performance Report Modal dropdown (NO "All MRs" option)
        const performanceMRSelection = document.getElementById('performanceMRSelection');
        if (performanceMRSelection) {
            performanceMRSelection.innerHTML = mrOptions;
        }

        // Store MR names globally for filtering targetsData if needed
        window.managerMrIds = mrs.map(m => String(m.id));

    } catch (error) {
        console.error('Error populating MR dropdowns:', error);
    }
}

// Save target
async function saveTarget(formData) {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('kavya_auth_token');
        const response = await fetch(`${API_BASE}/manager/sales-targets`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Failed to assign target');
        }

        showToast('✅ Target assigned successfully!');
        loadDashboard();
        return true;
    } catch (error) {
        console.error('Assign target error:', error);
        showToast('Failed to assign target. Please try again.', 'error');
        return false;
    }
}

// Filters
function wireFilters() {
    // filterMR dropdown removed as requested by user - showing all team data by default

    const searchInput = document.getElementById('searchTarget');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            const filteredTargets = targetsData.filter(t =>
                t.mrName.toLowerCase().includes(query) ||
                t.productName.toLowerCase().includes(query)
            );
            renderTargetsTable(filteredTargets);
        });
    }
}

// Utility functions
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

function showLoading(show) {
    let loader = document.getElementById('dashboardLoader');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}

function showToast(message, type = 'success') {
    alert(message);
}
