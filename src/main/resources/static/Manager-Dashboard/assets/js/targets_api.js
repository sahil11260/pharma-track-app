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

function getCurrentUserIdentifier() {
    try {
        const userObj = JSON.parse(localStorage.getItem('kavya_user') || '{}');
        const email = String(userObj.email || localStorage.getItem('signup_email') || '').trim();
        if (email) return email;
        const name = String(userObj.name || localStorage.getItem('signup_name') || '').trim();
        return name;
    } catch (e) {
        return String(localStorage.getItem('signup_email') || localStorage.getItem('signup_name') || '').trim();
    }
}

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
        
        // Debug: Log top performer value
        console.log('[TARGETS] Top performer from backend:', data.topPerformer);
        console.log('[TARGETS] Top performers data:', data.topPerformers);
        
        // Wire edit buttons after table is rendered
        wireEditTarget();

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
                  <h3>${(data.totalTarget || 0).toLocaleString()}</h3>
                  <h5>Total Target (Units)</h5>
                </div>
                <div class="card-icon"><i class="bi bi-bullseye"></i></div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card summary-card summary-total-achievement">
              <div class="card-body">
                <div class="card-content">
                  <h3>${(data.totalAchievement || 0).toLocaleString()}</h3>
                  <h5>Total Achievement (Units)</h5>
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

    // Check if all performers have 0 achievement
    const allZeroAchievement = performers.every(p => 
        (p.achievement === 0 || p.achievement === null) && 
        (p.achievementPercentage === 0 || p.achievementPercentage === null)
    );

    if (allZeroAchievement && performers.length > 1) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No clear top performer - all achievements are 0</td></tr>';
        return;
    }

    tbody.innerHTML = performers.map(perf => `
        <tr>
            <td>${perf.rank}</td>
            <td>${escapeHtml(perf.mrName)}</td>
            <td>${perf.target?.toLocaleString() || 0}</td>
            <td>${perf.achievement?.toLocaleString() || 0}</td>
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
    const startDateEl = document.getElementById('targetStartDate');
    const endDateEl = document.getElementById('targetEndDate');
    const targetProductEl = document.getElementById('targetProductSelect');

    const validateDateRangeOrReport = () => {
        if (!startDateEl || !endDateEl) return true;
        const startDate = startDateEl.value || '';
        const endDate = endDateEl.value || '';

        // Clear previous validity state
        endDateEl.setCustomValidity('');

        if (!startDate || !endDate) return true;

        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T00:00:00`);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true;

        if (end < start) {
            endDateEl.setCustomValidity('End Date cannot be earlier than Start Date');
            endDateEl.reportValidity();
            return false;
        }
        return true;
    };

    if (categoryEl && labelEl) {
        categoryEl.addEventListener('change', () => {
            if (categoryEl.value === 'Visit') {
                labelEl.textContent = 'Target (Doctor Visits)';
                if (productContainer) productContainer.style.display = 'none';
                if (targetProductEl) targetProductEl.required = false;
            } else {
                labelEl.textContent = 'Target Units';
                if (productContainer) productContainer.style.display = 'block';
                if (targetProductEl) targetProductEl.required = true;
            }
        });
    }

    if (startDateEl && endDateEl) {
        startDateEl.addEventListener('change', () => {
            endDateEl.min = startDateEl.value || '';
            if (endDateEl.value && startDateEl.value && endDateEl.value < startDateEl.value) {
                endDateEl.value = '';
            }

            validateDateRangeOrReport();
        });

        endDateEl.addEventListener('change', () => {
            validateDateRangeOrReport();
        });
    }

    const saveBtn = document.getElementById('saveTargetBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const form = document.getElementById('setTargetsForm');
            const targetMrEl = document.getElementById('targetMR');
            const category = categoryEl.value;

            if (form.checkValidity() && targetMrEl.value) {
                const startDate = startDateEl ? (startDateEl.value || '') : '';
                const endDate = endDateEl ? (endDateEl.value || '') : '';

                if (!validateDateRangeOrReport()) {
                    showToast('End Date cannot be earlier than Start Date', 'error');
                    return;
                }

                const targetUnitsValue = parseInt(document.getElementById('salesTarget').value);
                if (category === 'Product') {
                    const selectedProductIdRaw = targetProductEl ? String(targetProductEl.value || '').trim() : '';
                    if (!selectedProductIdRaw) {
                        showToast('Please select a product', 'error');
                        return;
                    }
                    if (Number.isNaN(Number(selectedProductIdRaw))) {
                        showToast('Please select a valid product', 'error');
                        return;
                    }

                    const selectedProduct = systemProducts.find(p => String(p.id) === String(selectedProductIdRaw));
                    const availableStock = selectedProduct && selectedProduct.stock != null ? parseInt(selectedProduct.stock) : null;
                    if (availableStock != null && !Number.isNaN(availableStock) && (availableStock <= 0 || targetUnitsValue > availableStock)) {
                        showToast('Insufficient stock to assign target', 'error');
                        return;
                    }
                }

                let periodMonthToUse = currentMonth;
                let periodYearToUse = currentYear;
                if (startDate) {
                    const start = new Date(startDate + 'T00:00:00');
                    if (!Number.isNaN(start.getTime())) {
                        periodMonthToUse = start.getMonth() + 1;
                        periodYearToUse = start.getFullYear();
                    }
                }

                const productId = category === 'Product' ? String(targetProductEl.value || '').trim() : null;
                let productName = "General Sales";

                if (category === 'Visit') {
                    productName = "Doctor Visits";
                } else if (productId) {
                    productName = targetProductEl.options[targetProductEl.selectedIndex].text;
                }

                const formData = {
                    mrId: targetMrEl.value,
                    mrName: targetMrEl.options[targetMrEl.selectedIndex].text,
                    productId: (productId && !Number.isNaN(Number(productId))) ? parseInt(productId, 10) : null,
                    productName: productName,
                    category: category,
                    targetUnits: targetUnitsValue,
                    startDate: startDate || null,
                    endDate: endDate || null,
                    periodMonth: periodMonthToUse,
                    periodYear: periodYearToUse,
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

        // Fetch ONLY from manager's stock (role-based filtering)
        const userObj = (() => {
            try {
                return JSON.parse(localStorage.getItem('kavya_user') || '{}');
            } catch (e) {
                return {};
            }
        })();

        const candidateIdentifiers = [
            String(userObj.email || localStorage.getItem('signup_email') || '').trim(),
            String(userObj.name || localStorage.getItem('signup_name') || '').trim()
        ].filter(Boolean);

        for (const ident of candidateIdentifiers) {
            try {
                const resStock = await fetch(`${API_BASE}/api/mr-stock?userName=${encodeURIComponent(ident)}`, {
                    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
                });

                if (!resStock.ok) continue;

                const stockItems = await resStock.json();
                if (!Array.isArray(stockItems) || stockItems.length === 0) continue;

                stockItems
                    .forEach(s => {
                        if (!products.some(p => String(p.id) === String(s.id))) {
                            products.push({ id: s.id, name: s.name, category: 'Sample', stock: s.stock });
                        }
                    });

                // If we found products for an identifier, don't try the other one
                if (products.length > 0) break;
            } catch (e) {
                console.warn('[TARGETS] Failed to fetch manager stock for identifier:', ident, e);
            }
        }

        systemProducts = products;
        console.log('[TARGETS] Final product list for dropdown:', systemProducts.length);

        if (systemProducts.length === 0) {
            productSelect.innerHTML = '<option value="">No Products Available</option>';
            return;
        }

        productSelect.innerHTML = '<option value="">Select Product</option>' +
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
            let message = 'Failed to assign target';
            try {
                const data = await response.json();
                if (data && data.message) message = data.message;
            } catch (e) {
                try {
                    const text = await response.text();
                    if (text) message = text;
                } catch (e2) { }
            }
            throw new Error(message);
        }

        showToast('✅ Target assigned successfully!');
        loadDashboard();
        return true;
    } catch (error) {
        console.error('Assign target error:', error);
        showToast(error && error.message ? error.message : 'Failed to assign target. Please try again.', 'error');
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
    console.log('[EDIT] Edit function called with targetId:', targetId);
    console.log('[EDIT] targetsData available:', targetsData ? targetsData.length : 'undefined');
    
    if (!targetId) {
        console.error('[EDIT] No targetId provided');
        alert('Error: No target ID provided');
        return;
    }

    // Find target (ensure ID match works with either string or number)
    const target = targetsData.find(t => String(t.id) === String(targetId));
    console.log('[EDIT] Found target:', target);

    if (!target) {
        console.error('[EDIT] Target not found in local data. ID:', targetId);
        console.error('[EDIT] Available targets:', targetsData.map(t => ({id: t.id, name: t.mrName})));
        alert('Target not found in local list. Try refreshing the page.');
        return;
    }

    // Check if modal element exists
    const modalEl = document.getElementById('editTargetModal');
    if (!modalEl) {
        console.error('[EDIT] Modal element not found in DOM');
        alert('Error: Edit modal not found');
        return;
    }

    console.log('[EDIT] Populating modal fields...');

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
            dateStr = `${target.assignedDate[0]}-${String(target.assignedDate[1]).padStart(2, '0')}-${String(target.assignedDate[2]).padStart(2, '0')}`;
        } else if (typeof target.assignedDate === 'string') {
            // Handle ISO string or date string
            dateStr = target.assignedDate.split('T')[0];
        }
    }

    document.getElementById('editStartDate').value = dateStr;
    document.getElementById('editEndDate').value = dateStr;

    console.log('[EDIT] Attempting to show modal...');

    try {
        // Use Bootstrap's lifecycle only
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
        modal.show();
        console.log('[EDIT] Modal show() called successfully');
        
    } catch (error) {
        console.error('[EDIT] Error showing modal:', error);
        alert('Error opening edit modal: ' + error.message);
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

            alert('Target Updated Successfully');

            // Clean Bootstrap modal close
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
    // DOMContentLoaded initialization can be dealt

    // wireEditTarget() is now called after data is loaded in loadDashboard()
    
    // Test: Make editTarget globally accessible
    window.editTarget = editTarget;
    console.log('[EDIT] editTarget function made globally available');
});
