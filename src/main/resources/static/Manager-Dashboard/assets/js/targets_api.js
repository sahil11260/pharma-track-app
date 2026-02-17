/**
 * Manager Sales & Target Tracking - Dynamic API Implementation
 * Fixed version: Removed Actions column and Charts
 */

// const API_BASE = window.location.port === '5500' ? 'http://localhost:8080/api' : '/api';
const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");

let targetsData = [];
let systemProducts = []; // Global system products
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // 1. First load MRs for the current manager (needed for dropdowns in modals)
    await populateMRDropdowns();
    await populateProductDropdowns(); // Load products for targets

    // 2. Load dashboard data (Shows all assigned MRs by default)
    await loadDashboard();

    // 3. Wire other components
    wireFilters();
    wireSetTargets();
    // wireEditTarget(); // Removed duplicate call, moved only to DOMContentLoaded at bottom
    wirePerformanceReport();
});

// Load complete dashboard
async function loadDashboard() {
    try {
        showLoading(true);
        // Using both 'token' and 'kavya_auth_token' for compatibility
        const token = localStorage.getItem('token') || localStorage.getItem('kavya_auth_token');

        const response = await fetch(
            `${API_BASE}/api/manager/sales-targets/summary?month=${currentMonth}&year=${currentYear}`,
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
            <div class="card summary-card summary-total-target">
              <div class="card-body">
                <div class="card-content">
                  <h3>₹${(data.totalTarget || 0).toLocaleString()}</h3>
                  <h5>Total Target</h5>
                </div>
                <div class="card-icon"><i class="bi bi-bullseye"></i></div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card summary-card summary-total-achievement">
              <div class="card-body">
                <div class="card-content">
                  <h3>₹${(data.totalAchievement || 0).toLocaleString()}</h3>
                  <h5>Total Achievement</h5>
                </div>
                <div class="card-icon"><i class="bi bi-trophy"></i></div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card summary-card summary-avg-achievement">
              <div class="card-body">
                <div class="card-content">
                  <h3>${Math.round(data.avgAchievementPercentage || 0)}%</h3>
                  <h5>Avg Achievement</h5>
                </div>
                <div class="card-icon"><i class="bi bi-graph-up"></i></div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card summary-card summary-top-performer">
              <div class="card-body">
                <div class="card-content">
                  <h3>${escapeHtml(data.topPerformer || 'N/A')}</h3>
                  <h5>Top Performer</h5>
                </div>
                <div class="card-icon"><i class="bi bi-star"></i></div>
              </div>
            </div>
          </div>
    `;
}

// Render targets table with Actions column
function renderTargetsTable(targets) {
    const tbody = document.getElementById('targetsList');
    if (!tbody) return;

    if (!targets || targets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No targets assigned for this period</td></tr>';
        return;
    }

    tbody.innerHTML = targets.map((target, index) => {
        const achievement = target.achievementPercentage || 0;
        const targetId = target.id || '';

        return `
        <tr>
            <td>${index + 1}</td>
            <td>${formatDate(target.assignedDate)}</td>
            <td>${escapeHtml(target.mrName)}</td>
            <td>${escapeHtml(target.productName)}</td>
            <td><span class="badge bg-secondary">${target.targetType || 'MONTHLY'}</span></td>
            <td>${target.targetUnits || 0}</td>
            <td>${target.achievedUnits || 0}</td>
            <td><strong>${achievement.toFixed(1)}%</strong></td>
            <td>
                <button class="btn btn-sm btn-primary me-1" onclick="editTarget('${targetId}')" title="Edit Achievement">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteTarget('${targetId}')" title="Delete Target">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `;
    }).join('');
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
    const productContainer = document.getElementById('productSelectContainer');

    if (categoryEl && labelEl) {
        categoryEl.addEventListener('change', () => {
            if (categoryEl.value === 'Visit') {
                labelEl.textContent = 'Target (Doctor Visits)';
                if (productContainer) productContainer.style.display = 'none';
            } else {
                labelEl.textContent = 'Target Units';
                if (productContainer) productContainer.style.display = 'block';
            }
        });
    }

    const saveBtn = document.getElementById('saveTargetBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const form = document.getElementById('setTargetsForm');
            const targetMrEl = document.getElementById('targetMR');
            const targetProductEl = document.getElementById('targetProductSelect');
            const category = categoryEl.value;

            if (form.checkValidity() && targetMrEl.value) {
                const productId = category === 'Product' ? targetProductEl.value : null;
                let productName = "General Sales";

                if (category === 'Visit') {
                    productName = "Doctor Visits";
                } else if (productId) {
                    productName = targetProductEl.options[targetProductEl.selectedIndex].text;
                }

                const formData = {
                    mrId: targetMrEl.value,
                    mrName: targetMrEl.options[targetMrEl.selectedIndex].text,
                    productId: (productId && !isNaN(productId)) ? parseInt(productId) : null,
                    productName: productName,
                    category: category,
                    targetUnits: parseInt(document.getElementById('salesTarget').value),
                    periodMonth: currentMonth,
                    periodYear: currentYear,
                    assignedBy: localStorage.getItem("signup_name") || "Manager"
                };

                const success = await saveTarget(formData);
                if (success) {
                    const modalEl = document.getElementById('setTargetsModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                    form.reset();
                    if (labelEl) labelEl.textContent = 'Target Units';
                    if (productContainer) productContainer.style.display = 'block';
                }
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
            ? `${API_BASE}/api/users?manager=${encodeURIComponent(managerParam)}&role=MR`
            : `${API_BASE}/api/users?role=MR`;

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

// Populate Product Dropdown
// Populate Product Dropdown
async function populateProductDropdowns() {
    const productSelect = document.getElementById('targetProductSelect');
    if (!productSelect) return;

    try {
        let products = [];
        const token = localStorage.getItem('token') || localStorage.getItem('kavya_auth_token');

        // 1. Fetch from system products
        try {
            const resProd = await fetch(`${API_BASE}/api/products`, {
                headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            });
            if (resProd.ok) {
                products = await resProd.json();
            }
        } catch (e) {
            console.warn('[TARGETS] Failed to fetch system products:', e);
        }

        // 2. Fetch from manager's sample stock
        const currentManager = localStorage.getItem('signup_name') || '';
        if (currentManager) {
            try {
                const resStock = await fetch(`${API_BASE}/api/mr-stock?userName=${encodeURIComponent(currentManager)}`, {
                    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
                });
                if (resStock.ok) {
                    const stockItems = await resStock.json();
                    stockItems.forEach(s => {
                        // Avoid duplicates
                        if (!products.some(p => p.name.toLowerCase() === s.name.toLowerCase())) {
                            products.push({ id: s.id, name: s.name, category: 'Sample' });
                        }
                    });
                }
            } catch (e) {
                console.warn('[TARGETS] Failed to fetch manager stock:', e);
            }
        }

        // 3. Fallback/Common Samples (present in all modules)
        const commonSamples = [
            { id: "S1", name: "Diabetex 500mg", category: "Sample" },
            { id: "S2", name: "CardioCare 10mg", category: "Sample" },
            { id: "S3", name: "PainRelief 200mg", category: "Sample" },
            { id: "S4", name: "NeuroMax 50mg", category: "Sample" },
            { id: "S5", name: "ImmunoBoost 100mg", category: "Sample" },
            { id: "S6", name: "Cetrizin - 10mg", category: "Sample" },
            { id: "S7", name: "Amlo-5", category: "Sample" }
        ];

        commonSamples.forEach(cs => {
            if (!products.some(p => p.name.toLowerCase() === cs.name.toLowerCase())) {
                products.push(cs);
            }
        });

        systemProducts = products;
        console.log('[TARGETS] Final product list for dropdown:', systemProducts.length);

        productSelect.innerHTML = '<option value="">Select Product (Optional)</option>' +
            systemProducts.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    } catch (error) {
        console.error('Error populating product dropdown:', error);
    }
}

// Save target
async function saveTarget(formData) {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('kavya_auth_token');
        const response = await fetch(`${API_BASE}/api/manager/sales-targets`, {
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
    const searchInput = document.getElementById('searchTarget');
    const achievementFilter = document.getElementById('filterAchievement');

    const applyFilters = () => {
        const query = searchInput ? searchInput.value.toLowerCase() : "";
        const achievement = achievementFilter ? achievementFilter.value.toLowerCase() : "";

        let filtered = targetsData.filter(t =>
            t.mrName.toLowerCase().includes(query) ||
            t.productName.toLowerCase().includes(query)
        );

        if (achievement) {
            filtered = filtered.filter(t => {
                const status = (t.progressStatus || "").toLowerCase();
                return status === achievement;
            });
        }

        renderTargetsTable(filtered);
    };

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (achievementFilter) achievementFilter.addEventListener('change', applyFilters);
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

// Edit Target - Opens modal with current data
function editTarget(targetId) {
    console.log('[EDIT] Opening edit modal for target ID:', targetId);

    // Find target (ensure ID match works with either string or number)
    const target = targetsData.find(t => String(t.id) === String(targetId));

    if (!target) {
        console.error('[EDIT] Target not found in local data. ID:', targetId);
        alert('Target not found in local list. Try refreshing the page.');
        return;
    }

    // Populate edit modal fields
    document.getElementById('editTargetId').value = target.id;
    document.getElementById('editMRName').value = target.mrName || '';
    document.getElementById('editProductName').value = target.productName || '';
    document.getElementById('editSalesTarget').value = target.targetUnits || 0;
    document.getElementById('editSalesAchievement').value = target.achievedUnits || 0;

    // Safety check for date formatting
    let dateStr = '';
    if (target.assignedDate) {
        if (Array.isArray(target.assignedDate)) {
            // Convert [YYYY, MM, DD] to YYYY-MM-DD
            const y = target.assignedDate[0];
            const m = String(target.assignedDate[1]).padStart(2, '0');
            const d = String(target.assignedDate[2]).padStart(2, '0');
            dateStr = `${y}-${m}-${d}`;
        } else if (typeof target.assignedDate === 'string') {
            dateStr = target.assignedDate.split('T')[0];
        }
    }

    document.getElementById('editStartDate').value = dateStr;
    document.getElementById('editEndDate').value = dateStr;

    // Show modal using Bootstrap 5 API correctly
    const modalEl = document.getElementById('editTargetModal');
    if (modalEl) {
        let modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (!modalInstance) {
            modalInstance = new bootstrap.Modal(modalEl);
        }
        modalInstance.show();
    } else {
        console.error('[EDIT] editTargetModal not found in DOM');
        alert('Internal Error: Modal not found');
    }
}

// Delete Target
async function deleteTarget(targetId) {
    if (!confirm('Are you sure you want to delete this target?')) {
        return;
    }

    try {
        showLoading(true);
        const token = localStorage.getItem('token') || localStorage.getItem('kavya_auth_token');

        // Correct endpoint for SalesTarget deletion
        const response = await fetch(`${API_BASE}/api/manager/sales-targets/${targetId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete target');
        }

        showToast('✅ Target deleted successfully!');
        await loadDashboard(); // Reload data
    } catch (error) {
        console.error('Delete target error:', error);
        showToast('Failed to delete target. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Update Target Achievement - Wire the update button
function wireEditTarget() {
    const updateBtn = document.getElementById('updateTargetBtn');
    if (!updateBtn) return;

    // Remove any existing listeners by cloning (to prevent double-firing)
    const newBtn = updateBtn.cloneNode(true);
    updateBtn.parentNode.replaceChild(newBtn, updateBtn);

    newBtn.addEventListener('click', async () => {
        const targetId = document.getElementById('editTargetId').value;
        const salesAchievement = parseInt(document.getElementById('editSalesAchievement').value);

        if (isNaN(salesAchievement) || salesAchievement < 0) {
            alert('Please enter a valid achievement value');
            return;
        }

        try {
            showLoading(true);
            const token = localStorage.getItem('token') || localStorage.getItem('kavya_auth_token');

            // Find target in local data
            const target = targetsData.find(t => String(t.id) === String(targetId));
            if (!target) {
                alert('Target data lost. Please refresh.');
                return;
            }

            const updateData = {
                mrId: target.mrId,
                productId: target.productId,
                targetUnits: parseInt(document.getElementById('editSalesTarget').value) || target.targetUnits,
                achievedUnits: salesAchievement,
                periodMonth: target.periodMonth,
                periodYear: target.periodYear
            };

            const response = await fetch(`${API_BASE}/api/manager/sales-targets/${targetId}/achievement`, {
                method: 'PUT',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorMsg = await response.text();
                throw new Error(errorMsg || 'Failed to update achievement');
            }

            // Close modal correctly
            const modalEl = document.getElementById('editTargetModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) {
                modalInstance.hide();
            }

            // Small delay for server sync, then reload
            setTimeout(async () => {
                await loadDashboard();
                showToast(`✅ Achievement updated successfully to ${salesAchievement} units!`);
            }, 300);

        } catch (error) {
            console.error('Update target error:', error);
            alert(`Failed: ${error.message}`);
        } finally {
            showLoading(false);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // The original DOMContentLoaded only contained the updateBtn listener.
    // Assuming other initializations might be here in a larger context,
    // we now call the dedicated wiring function.
    wireEditTarget();
});
