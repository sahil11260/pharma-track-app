document.addEventListener("DOMContentLoaded", async () => {
    console.log("[PRODUCT-SAMPLE] Initializing Dynamic Module...");

    const API_BASE = window.location.port === "5500" ? "http://localhost:8080/api" : "/api";

    function getAuthHeader() {
        const token = localStorage.getItem('kavya_auth_token') || localStorage.getItem('token');
        return token ? { "Authorization": `Bearer ${token}` } : {};
    }

    async function apiJson(url, options = {}) {
        const headers = { "Content-Type": "application/json", ...getAuthHeader(), ...(options.headers || {}) };
        try {
            const response = await fetch(url, { ...options, headers });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.status === 204 ? null : response.json();
        } catch (e) {
            console.error(`API Error (${url}):`, e);
            throw e;
        }
    }

    // --- State ---
    let productsList = [];
    let stockReceivedHistory = [];
    let submittedDCRs = [];

    // --- DOM Elements ---
    const tableBody = document.getElementById('productStockTableBody');
    const modalProductName = document.getElementById('modalProductName');
    const modalTotalDistributed = document.getElementById('modalTotalDistributed');
    const distributionDetailsTableBody = document.getElementById('distributionDetailsTableBody');

    // --- Robust User Identification ---
    function getMRName() {
        const userStr = localStorage.getItem('kavya_user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.name) return user.name;
            } catch (e) { }
        }
        return localStorage.getItem('signup_name') || 'MR User';
    }

    // --- Calculations ---
    function calculateTotalReceived(productId) {
        return stockReceivedHistory
            .filter(item => String(item.productId) === String(productId))
            .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    }

    function calculateTotalDistributed(productId) {
        let distributed = 0;
        submittedDCRs.forEach(dcr => {
            if (dcr && Array.isArray(dcr.samplesGiven)) {
                dcr.samplesGiven.forEach(s => {
                    if (s && String(s.productId) === String(productId)) {
                        distributed += (Number(s.quantity) || 0);
                    }
                });
            }
        });
        return distributed;
    }

    // --- Rendering ---
    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (productsList.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="text-muted mb-2"><i class="bi bi-box-seam fs-1"></i></div>
                        <h6 class="text-secondary">No stock items allocated yet.</h6>
                        <small>Samples allocated by Admin will appear here.</small>
                    </td>
                </tr>`;
            return;
        }

        productsList.forEach((product, index) => {
            const received = calculateTotalReceived(product.id);
            const distributed = calculateTotalDistributed(product.id);
            const remaining = received - distributed;

            const stockStatus = remaining <= 0 ?
                '<span class="badge bg-danger">Out of Stock</span>' :
                (remaining <= 10 ? '<span class="badge bg-warning text-dark">Low Stock</span>' : '<span class="badge bg-success">Available</span>');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-center">${index + 1}</td>
                <td>
                    <div class="fw-bold text-dark">${product.name}</div>
                    <div class="small text-muted">ID: ${product.id}</div>
                </td>
                <td class="text-center fw-medium">${received}</td>
                <td class="text-center text-primary fw-bold">${distributed}</td>
                <td class="text-center h5 mb-0">
                    <span class="${remaining <= 10 ? 'text-danger' : 'text-success'} fw-bold">${remaining}</span>
                </td>
                <td class="text-center">
                    <div class="d-flex flex-column align-items-center gap-1">
                        ${stockStatus}
                        <button class="btn btn-sm btn-link text-decoration-none view-details-btn" 
                            data-id="${product.id}" data-name="${product.name}" 
                            data-bs-toggle="modal" data-bs-target="#distributionModal">
                            <i class="bi bi-clock-history"></i> History
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    async function init() {
        const mrName = getMRName();
        const encodedName = encodeURIComponent(mrName);

        try {
            // Load everything in parallel
            const [stock, received, dcrs] = await Promise.all([
                apiJson(`${API_BASE}/mr-stock?userName=${encodedName}`),
                apiJson(`${API_BASE}/stock-received?userName=${encodedName}`),
                apiJson(`${API_BASE}/dcrs?mrName=${encodedName}`)
            ]);

            productsList = stock || [];
            stockReceivedHistory = received || [];
            submittedDCRs = dcrs || [];

            renderTable();
        } catch (e) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4">Error loading data. Please check connection.</td></tr>`;
        }
    }

    // --- Modal Logic ---
    const distModal = document.getElementById('distributionModal');
    if (distModal) {
        distModal.addEventListener('show.bs.modal', (event) => {
            const btn = event.relatedTarget;
            const pid = btn.dataset.id;
            const name = btn.dataset.name;

            modalProductName.textContent = name;
            const entries = submittedDCRs
                .filter(dcr => dcr.samplesGiven && dcr.samplesGiven.some(s => String(s.productId) === String(pid)))
                .map(dcr => ({
                    ...dcr,
                    qty: dcr.samplesGiven.find(s => String(s.productId) === String(pid)).quantity
                }))
                .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

            modalTotalDistributed.textContent = entries.reduce((s, e) => s + e.qty, 0);
            distributionDetailsTableBody.innerHTML = entries.length ? entries.map(e => `
                <tr>
                    <td>${new Date(e.dateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                    <td><div class="fw-bold">${e.doctorName}</div><div class="small text-muted">${e.clinicLocation}</div></td>
                    <td class="text-center fw-bold text-primary">${e.qty}</td>
                    <td class="small text-muted">${e.remarks || ''}</td>
                </tr>
            `).join('') : '<tr><td colspan="4" class="text-center text-muted">No history found.</td></tr>';
        });
    }

    init();
});
