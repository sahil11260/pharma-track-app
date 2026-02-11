/**
 * MR Sales & Target Tracking - Dynamic API Implementation
 * Replaces static/mock data with real backend calls
 */

// const API_BASE = window.location.hostname === 'localhost'
//     ? 'http://localhost:8080/api'
//     : 'https://pharma-track-app.onrender.com/api';
const API_BASE = window.API_BASE || "/api";


let salesTargets = [];
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();
let mrId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    getMrId();
    loadSalesTargets();
    wireFilters();
});

// Get MR ID from localStorage or session
function getMrId() {
    mrId = localStorage.getItem('userId') || localStorage.getItem('mrId');

    if (!mrId) {
        console.warn('MR ID not found in localStorage');
        showToast('Unable to identify user. Please log in again.', 'error');
    }

    return mrId;
}

// Load sales targets for MR
async function loadSalesTargets() {
    if (!mrId) {
        showNoTargetsMessage();
        return;
    }

    try {
        showLoading(true);
        const token = localStorage.getItem('token');

        const response = await fetch(
            `${API_BASE}/mr/${mrId}/sales-targets?month=${currentMonth}&year=${currentYear}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            if (response.status === 404 || response.status === 401) {
                showNoTargetsMessage();
                return;
            }
            throw new Error('Failed to load sales targets');
        }

        const data = await response.json();
        salesTargets = data || [];

        if (salesTargets.length === 0) {
            showNoTargetsMessage();
        } else {
            renderSalesTargetsTable(salesTargets);
        }

        showLoading(false);
    } catch (error) {
        console.error('Load sales targets error:', error);
        showToast('Failed to load sales targets. Please refresh the page.', 'error');
        showNoTargetsMessage();
        showLoading(false);
    }
}

// Render sales targets table
function renderSalesTargetsTable(targets) {
    const tbody = document.getElementById('salesTargetsBody');
    if (!tbody) return;

    const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('en-US', { month: 'long' });
    const headerEl = document.querySelector('[data-period-header]');
    if (headerEl) {
        headerEl.textContent = `Product-wise Target & Achievement for ${monthName} ${currentYear}`;
    }

    tbody.innerHTML = targets.map((target, index) => {
        const percentage = target.achievementPercentage || 0;
        const progressColor = getProgressColor(percentage);

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${formatDate(target.assignedDate)}</td>
                <td>${escapeHtml(target.productName)}</td>
                <td><span class="badge bg-secondary">${target.targetType}</span></td>
                <td>${target.targetUnits}</td>
                <td>${target.achievedUnits || 0}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <span class="me-2"><strong>${percentage.toFixed(1)}%</strong></span>
                        <div class="progress flex-grow-1" style="height: 20px; min-width: 100px;">
                            <div class="progress-bar bg-${progressColor}" 
                                 role="progressbar" 
                                 style="width: ${Math.min(percentage, 100)}%"
                                 aria-valuenow="${percentage}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                            </div>
                        </div>
                    </div>
                </td>
                <td><span class="badge bg-${getStatusColor(target.progressStatus)}">${target.progressStatus}</span></td>
                <td>${target.remarks || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Show "No targets" message
function showNoTargetsMessage() {
    const tbody = document.getElementById('salesTargetsBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No sales targets found for your account.</td></tr>';
    }

    const visitTargetBody = document.getElementById('visitTargetsBody');
    if (visitTargetBody) {
        visitTargetBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No visit targets found for your account.</td></tr>';
    }
}

// Wire month/year filters
function wireFilters() {
    const monthSelect = document.getElementById('filterMonth');
    const yearSelect = document.getElementById('filterYear');

    if (monthSelect) {
        monthSelect.value = currentMonth;
        monthSelect.addEventListener('change', () => {
            currentMonth = parseInt(monthSelect.value);
            loadSalesTargets();
        });
    }

    if (yearSelect) {
        yearSelect.value = currentYear;
        yearSelect.addEventListener('change', () => {
            currentYear = parseInt(yearSelect.value);
            loadSalesTargets();
        });
    }
}

// Record achievement (future enhancement - can be triggered from sales submission)
async function recordAchievement(productId, achievedUnits, remarks = '') {
    if (!mrId) {
        showToast('Unable to record achievement. User not identified.', 'error');
        return false;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/mr/sales-achievements`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mrId: parseInt(mrId),
                productId: productId,
                achievedUnits: achievedUnits,
                periodMonth: currentMonth,
                periodYear: currentYear,
                remarks: remarks
            })
        });

        if (!response.ok) {
            throw new Error('Failed to record achievement');
        }

        showToast('✅ Sales achievement recorded successfully!');
        loadSalesTargets(); // Reload to show updated data
        return true;
    } catch (error) {
        console.error('Record achievement error:', error);
        showToast('Failed to record sales achievement. Please try again.', 'error');
        return false;
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

function showLoading(show) {
    const loader = document.getElementById('salesLoader');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}

function showToast(message, type = 'success') {
    // Use the existing toast function if available
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Fallback to alert or implement Bootstrap toast
        const alertClass = type === 'error' ? 'danger' : 'success';
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) {
            const toast = document.createElement('div');
            toast.className = `alert alert-${alertClass} alert-dismissible fade show`;
            toast.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
            toastContainer.appendChild(toast);
            setTimeout(() => toast.remove(), 5000);
        }
    }
}

// Export for use in other modules
window.SalesAPI = {
    recordAchievement,
    loadSalesTargets,
    getSalesTargets: () => salesTargets
};
