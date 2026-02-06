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
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    wireFilters();
    wireSetTargets();
    wirePerformanceReport();
    populateMRDropdowns();
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
        targetsData = data.targets || [];

        renderSummaryCards(data);
        renderTargetsTable(data.targets);
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
    const saveBtn = document.getElementById('saveTargetBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const form = document.getElementById('setTargetsForm');
            const targetMrEl = document.getElementById('targetMR');
            if (form.checkValidity() && targetMrEl.value) {
                const formData = {
                    mrId: targetMrEl.value,
                    mrName: targetMrEl.options[targetMrEl.selectedIndex].text,
                    targetUnits: parseInt(document.getElementById('salesTarget').value),
                    productName: "General Sales",
                    periodMonth: currentMonth,
                    periodYear: currentYear,
                    assignedBy: localStorage.getItem("signup_name") || "Manager"
                };
                saveTarget(formData);
                const modalEl = document.getElementById('setTargetsModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                form.reset();
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

// Populate MR Dropdowns (More robust version)
async function populateMRDropdowns() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('kavya_auth_token');
        console.log('[TARGETS] Fetching MR list for dropdowns...');

        const response = await fetch(`${API_BASE}/users?role=MR`, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch MRs from /api/users');
        }

        const mrs = await response.json();
        console.log('[TARGETS] Found MRs:', mrs.length);

        if (!Array.isArray(mrs)) return;

        const mrOptions = mrs.map(mr => `<option value="${mr.id}">${escapeHtml(mr.name)}</option>`).join('');

        // Populate Main Filter
        const filterMR = document.getElementById('filterMR');
        if (filterMR) {
            filterMR.innerHTML = '<option value="">All MRs</option>' + mrOptions;
        }

        // Populate Set Targets Modal dropdown
        const targetMR = document.getElementById('targetMR');
        if (targetMR) {
            targetMR.innerHTML = '<option value="">Select MR</option>' + mrOptions;
        }

        // Populate Performance Report Modal dropdown
        const performanceMRSelection = document.getElementById('performanceMRSelection');
        if (performanceMRSelection) {
            performanceMRSelection.innerHTML = '<option value="all">All MRs</option>' + mrOptions;
        }
    } catch (error) {
        console.error('Error populating MR dropdowns:', error);
        // If API fails, try to load from localStorage as fallback
        const localMrs = JSON.parse(localStorage.getItem("kavyaPharmMRsData") || "[]");
        if (localMrs.length > 0) {
            const mrOptions = localMrs.map(mr => `<option value="${mr.id}">${escapeHtml(mr.name)}</option>`).join('');
            const targetMR = document.getElementById('targetMR');
            if (targetMR) targetMR.innerHTML = '<option value="">Select MR (Local)</option>' + mrOptions;
        }
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
    const filterMR = document.getElementById('filterMR');
    if (filterMR) {
        filterMR.addEventListener('change', () => {
            const selectedMrId = filterMR.value;
            if (selectedMrId) {
                const filteredTargets = targetsData.filter(t => t.mrId == selectedMrId);
                renderTargetsTable(filteredTargets);
            } else {
                renderTargetsTable(targetsData);
            }
        });
    }

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
