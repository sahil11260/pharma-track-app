document.addEventListener("DOMContentLoaded", () => {

    // --- CONFIGURATION ---
    const PAGE_SIZE = 3;

    const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");
    const API = {
        DCRS: `${API_BASE}/api/dcrs`,
        MR_STOCK: `${API_BASE}/api/mr-stock`
    };

    let apiMode = true;

    function getAuthHeader() {
        const token = localStorage.getItem("kavya_auth_token");
        return token ? { "Authorization": `Bearer ${token}` } : {};
    }

    function getCurrentUserIdentifier() {
        try {
            const userObj = JSON.parse(localStorage.getItem("kavya_user") || "{}");
            const name = (userObj.name || localStorage.getItem("signup_name") || "").trim();
            if (name) return name.toLowerCase();
            const email = (userObj.email || localStorage.getItem("signup_email") || "").trim();
            if (email) return email.toLowerCase();
        } catch (e) {
        }
        return "anonymous";
    }

    function getCurrentUserIdentifierLower() {
        const id = getCurrentUserIdentifier();
        return id ? id.toLowerCase() : "";
    }

    function stockStorageKey() {
        const id = getCurrentUserIdentifierLower() || "anonymous";
        return `mrProductStock:${id}`;
    }

    function dcrStorageKey() {
        const id = getCurrentUserIdentifierLower() || "anonymous";
        return `submittedDCRs:${id}`;
    }

    async function apiJson(url, options) {
        const headers = {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
            ...(options && options.headers ? options.headers : {})
        };
        const res = await fetch(url, Object.assign({}, options || {}, { headers }));
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
        }
        if (res.status === 204) {
            return null;
        }
        return await res.json();
    }

    // Doctors will be loaded from API
    let assignedDoctors = [];

    function normalizeDoctorName(v) {
        return (v == null ? "" : String(v).trim());
    }

    function sortDoctorsByName(list) {
        if (!Array.isArray(list)) return list;
        return list.sort((a, b) => normalizeDoctorName(a?.name).localeCompare(normalizeDoctorName(b?.name), undefined, { sensitivity: "base" }));
    }

    function mergeDoctors(primary, fallback) {
        const map = new Map();
        (Array.isArray(primary) ? primary : []).forEach(d => {
            const key = String(d?.id ?? "").trim();
            if (!key) return;
            map.set(key, d);
        });
        (Array.isArray(fallback) ? fallback : []).forEach(d => {
            const key = String(d?.id ?? "").trim();
            if (!key) return;
            if (!map.has(key)) map.set(key, d);
        });
        return Array.from(map.values());
    }

    let mrStock = JSON.parse(localStorage.getItem(stockStorageKey())) || [];

    // --- STATE MANAGEMENT ---
    let tempSamples = [];
    let systemProducts = []; // Global system products
    let sampleEntryIdCounter = 1;
    let submittedDCRs = JSON.parse(localStorage.getItem(dcrStorageKey())) || [];
    let currentPage = 1;

    // Ensure we have at least 4 mock entries for initial display if storage is empty
    if (submittedDCRs.length === 0) {
        submittedDCRs = [];
    }


    // --- ELEMENTS ---
    const dcrModal = new bootstrap.Modal(document.getElementById('dcrModal'));
    const dcrModalElement = document.getElementById('dcrModal');
    const dcrForm = document.getElementById('dcrForm');
    const dcrModalLabel = document.getElementById('dcrModalLabel');
    const reportIdField = document.getElementById('reportIdField');
    const doctorSelect = document.getElementById('doctorSelect');
    const clinicNameInput = document.getElementById('clinicName');
    const sampleProductSelect = document.getElementById('sampleProductSelect');
    const sampleQuantityInput = document.getElementById('sampleQuantityInput');
    const addSampleBtn = document.getElementById('addSampleBtn');
    const samplesTableBody = document.getElementById('samplesTableBody');
    const submittedDCRTableBody = document.getElementById('submittedDCRTableBody');
    let dcrPaginationFooter = document.getElementById('dcrPaginationFooter');

    // Assuming you have a toast container structure ready in your HTML, let's target it
    // For this example, we'll assume the Toast structure is available and has the ID 'liveToast'
    const liveToastElement = document.getElementById('liveToast');
    let liveToast;
    if (liveToastElement) {
        liveToast = new bootstrap.Toast(liveToastElement);
    } else {
        console.warn("Bootstrap Toast element with ID 'liveToast' not found. Success message will be logged to console.");
    }


    // --- PERSISTENCE/STOCK FUNCTIONS ---

    function saveStock() {
        localStorage.setItem(stockStorageKey(), JSON.stringify(mrStock));
    }

    function saveDCRs() {
        localStorage.setItem(dcrStorageKey(), JSON.stringify(submittedDCRs));
    }

    async function refreshFromApiOrFallback() {
        const currentUserIdentifier = getCurrentUserIdentifier();
        console.log('[DCR] Refreshing data for user:', currentUserIdentifier);

        // 1. Fetch Stock
        try {
            if (currentUserIdentifier) {
                const stockItems = await apiJson(`${API.MR_STOCK}?userName=${encodeURIComponent(currentUserIdentifier)}`);
                if (Array.isArray(stockItems)) {
                    mrStock = stockItems.map(p => ({ id: p.id, name: p.name, stock: Number(p.stock) || 0 }));
                    saveStock();
                    console.log('[DCR] Loaded stock:', mrStock.length);
                }
            }
        } catch (e) {
            console.warn('[DCR] Failed to load stock from API.', e);
        }

        // 2. Fetch DCRs
        try {
            if (currentUserIdentifier) {
                const dcrs = await apiJson(`${API.DCRS}?mrName=${encodeURIComponent(currentUserIdentifier)}`);
                if (Array.isArray(dcrs)) {
                    submittedDCRs = dcrs;
                    saveDCRs();
                    console.log('[DCR] Loaded DCRs:', submittedDCRs.length);
                }
            }
        } catch (e) {
            console.warn('[DCR] Failed to load DCRs from API.', e);
        }

        // 3. Fetch Doctors
        let doctorsLoaded = false;
        try {
            const doctors = await apiJson(`${API_BASE}/api/doctors`);
            if (Array.isArray(doctors)) {
                assignedDoctors = doctors.map(d => ({
                    id: d.id || d.doctorId || d.id,
                    name: d.name || d.doctorName || 'Unknown Doctor',
                    clinic: d.clinicName || d.clinic || 'Default Clinic',
                    assignedMR: d.assignedMR || d.assignedMr || ''
                }));

                // The backend now filters doctors based on the logged-in MR role.
                sortDoctorsByName(assignedDoctors);
                console.log('[DCR] Loaded doctors:', assignedDoctors.length);

                // If API list looks incomplete, merge localStorage backup too (prevents dropdown showing only one doctor)
                const storedDoctorsRaw = localStorage.getItem("mrAssignedDoctors");
                if (storedDoctorsRaw) {
                    try {
                        const stored = JSON.parse(storedDoctorsRaw);
                        const backupList = Array.isArray(stored)
                            ? stored.map(d => ({
                                id: d.id || d.doctorId || d.id,
                                name: d.name || d.doctorName || 'Unknown Doctor',
                                clinic: d.clinicName || d.clinic || 'Default Clinic',
                                assignedMR: d.assignedMR || d.assignedMr || ''
                            }))
                            : [];
                        assignedDoctors = mergeDoctors(assignedDoctors, backupList);
                        sortDoctorsByName(assignedDoctors);
                    } catch (e) { }
                }

                populateDoctors();
                doctorsLoaded = true;
            }
        } catch (e) {
            console.warn('[DCR] Failed to load doctors from API.', e);
        }

        // Fallback for doctors if API failed (shared with doctors.js storage)
        if (!doctorsLoaded) {
            const storedDoctors = localStorage.getItem("mrAssignedDoctors");
            if (storedDoctors) {
                assignedDoctors = JSON.parse(storedDoctors);
                sortDoctorsByName(assignedDoctors);
                console.log('[DCR] Loaded doctors from localStorage backup:', assignedDoctors.length);
                populateDoctors();
            }
        }

        // 4. Fetch Global Products
        try {
            const products = await apiJson(`${API_BASE}/api/products`);
            if (Array.isArray(products)) {
                systemProducts = products.map(p => ({
                    id: String(p.id),
                    name: p.name,
                    category: p.category
                }));
                console.log('[DCR] Loaded system products:', systemProducts.length);
            }
        } catch (e) {
            console.warn('[DCR] Failed to load global products from API.', e);
        }

        apiMode = true; // Still set to true as at least we tried
        renderSubmittedDCRTable();
        populateProductSelect(sampleProductSelect);
    }

    function getProductStock(productId) {
        if (!productId) return 0;
        
        const product = mrStock.find(p => String(p.id) === String(productId));
        let effectiveStock = product ? product.stock : 0;

        const committedQuantity = tempSamples
            .filter(s => String(s.productId) === String(productId))
            .reduce((sum, s) => sum + s.quantity, 0);

        return effectiveStock - committedQuantity;
    }

    function updateStock(productId, quantityUsed) {
        const productIndex = mrStock.findIndex(p => String(p.id) === String(productId));
        if (productIndex !== -1) {
            mrStock[productIndex].stock -= quantityUsed;
        }
    }

    // --- INITIALIZATION FUNCTIONS ---

    function populateDoctors() {
        if (!doctorSelect) {
            console.error('[DCR] Doctor select element not found');
            return;
        }
        
        doctorSelect.innerHTML = '<option value="">Select Doctor</option>';
        
        if (!assignedDoctors || assignedDoctors.length === 0) {
            console.warn('[DCR] No doctors available to populate');
            
            // Add some mock doctors as fallback
            const mockDoctors = [
                { id: '1', name: 'Dr. Smith', clinic: 'City Clinic' },
                { id: '2', name: 'Dr. Johnson', clinic: 'Medical Center' },
                { id: '3', name: 'Dr. Williams', clinic: 'Health Hospital' }
            ];
            
            mockDoctors.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.id;
                option.textContent = doctor.name;
                option.dataset.clinic = doctor.clinic;
                doctorSelect.appendChild(option);
            });
            
            console.log('[DCR] Using mock doctors as fallback');
            return;
        }
        
        assignedDoctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor.id;
            option.textContent = doctor.name;
            option.dataset.clinic = doctor.clinic || '';
            doctorSelect.appendChild(option);
        });
        
        console.log('[DCR] Populated doctor dropdown with', assignedDoctors.length, 'doctors');
    }

    function populateProductSelect(selectElement) {
        if (!selectElement) {
            console.error('[DCR] Product select element not found');
            return;
        }
        
        selectElement.innerHTML = '<option value="">Select Product</option>';

        // Use mrStock primarily, fallback to systemProducts if mrStock is empty
        let displayList = mrStock;
        
        // If mrStock is empty, try to use systemProducts as fallback
        if (!displayList || displayList.length === 0) {
            displayList = systemProducts;
            console.warn('[DCR] mrStock is empty, using systemProducts as fallback for product selection');
        }

        // If still no products, show a message or add mock products as fallback
        if (!displayList || displayList.length === 0) {
            console.warn('[DCR] No products available for selection');
            
            // Add some mock products as fallback
            const mockProducts = [
                { id: '1', name: 'Paracetamol 500mg', stock: 50 },
                { id: '2', name: 'Amoxicillin 250mg', stock: 30 },
                { id: '3', name: 'Ibuprofen 400mg', stock: 25 }
            ];
            
            mockProducts.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (Stock: ${product.stock})`;
                selectElement.appendChild(option);
            });
            
            console.log('[DCR] Using mock products as fallback');
            return;
        }

        displayList.forEach(product => {
            const effectiveStock = getProductStock(product.id);
            
            // Show all products, but indicate stock status
            const option = document.createElement('option');
            option.value = product.id;
            
            if (effectiveStock > 0) {
                option.textContent = `${product.name} (Stock: ${effectiveStock})`;
            } else {
                option.textContent = `${product.name} (Out of Stock)`;
                option.disabled = true; // Disable out of stock products but still show them
                option.title = "This product is out of stock";
            }
            
            selectElement.appendChild(option);
        });

        // Log for debugging
        console.log('[DCR] Populated product select with', displayList.length, 'products');
    }

    // --- TEMPORARY SAMPLES TABLE MANAGEMENT (for the form) ---

    function renderSamplesTable() {
        samplesTableBody.innerHTML = '';

        if (tempSamples.length === 0) {
            samplesTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No samples added yet.</td></tr>';
        } else {
            tempSamples.forEach(sample => {
                const row = document.createElement('tr');
                row.dataset.id = sample.id;

                row.innerHTML = `
                    <td>${sample.productName}</td>
                    <td class="text-center">${sample.quantity}</td>
                    <td class="text-center">
                        <div class="btn-group btn-group-sm">
                            <button type="button" class="btn btn-outline-primary edit-sample-btn" data-id="${sample.id}" title="Edit Quantity">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button type="button" class="btn btn-outline-danger delete-sample-btn" data-id="${sample.id}" title="Remove Sample">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                samplesTableBody.appendChild(row);
            });
        }

        populateProductSelect(sampleProductSelect);
    }

    // --- PAGINATION & DCR TABLE MANAGEMENT ---

    function renderPaginationControls(totalRecords) {
        // Defensive: ensure footer exists
        if (!dcrPaginationFooter) {
            dcrPaginationFooter = document.getElementById('dcrPaginationFooter');
            if (!dcrPaginationFooter) {
                console.warn("Pagination footer element not found (#dcrPaginationFooter). Pagination won't render.");
                return;
            }
        }

        // Compute pages (ensure at least 1 page so UI renders consistently)
        const totalPages = Math.max(1, Math.ceil((totalRecords || 0) / PAGE_SIZE));

        // Debug: log values so you can inspect in browser console
        console.debug('[Pagination] totalRecords=', totalRecords, 'PAGE_SIZE=', PAGE_SIZE, 'totalPages=', totalPages, 'currentPage=', currentPage);

        // Clear the previous pagination control area
        dcrPaginationFooter.innerHTML = '';

        const nav = document.createElement('nav');
        nav.setAttribute('aria-label', 'Page navigation');

        const ul = document.createElement('ul');
        ul.className = 'pagination pagination-sm mb-0';
        ul.addEventListener('click', handlePaginationClick);

        // Previous Button
        ul.innerHTML += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${Math.max(1, currentPage - 1)}">Previous</a>
            </li>
        `;

        // Page Numbers (smart windowing: show up to 7 page numbers centered on current)
        const maxPageButtons = 7;
        let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
        let endPage = startPage + maxPageButtons - 1;
        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - maxPageButtons + 1);
        }

        if (startPage > 1) {
            ul.innerHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="1">1</a>
                </li>
                <li class="page-item disabled"><span class="page-link">&hellip;</span></li>
            `;
        }

        for (let i = startPage; i <= endPage; i++) {
            ul.innerHTML += `
                <li class="page-item ${currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        if (endPage < totalPages) {
            ul.innerHTML += `
                <li class="page-item disabled"><span class="page-link">&hellip;</span></li>
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
                </li>
            `;
        }

        // Next Button
        ul.innerHTML += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${Math.min(totalPages, currentPage + 1)}">Next</a>
            </li>
        `;

        nav.appendChild(ul);
        // Append the controls wrapped in the <nav> element
        dcrPaginationFooter.appendChild(nav);
    }

    function handlePaginationClick(event) {
        const target = event.target.closest('a.page-link');
        if (!target) return;
        event.preventDefault();

        const page = parseInt(target.dataset.page);
        const totalPages = Math.max(1, Math.ceil(submittedDCRs.length / PAGE_SIZE));

        if (page >= 1 && page <= totalPages && page !== currentPage) {
            currentPage = page;
            renderSubmittedDCRTable();
        }
    }


    function renderSubmittedDCRTable() {
        submittedDCRs.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

        // Pagination logic: Slice the array based on currentPage and PAGE_SIZE
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const recordsToDisplay = submittedDCRs.slice(startIndex, endIndex);

        submittedDCRTableBody.innerHTML = '';

        if (submittedDCRs.length === 0) {
            submittedDCRTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No DCRs have been submitted yet.</td></tr>';
            if (dcrPaginationFooter) dcrPaginationFooter.innerHTML = '';
            return;
        }

        if (recordsToDisplay.length === 0 && currentPage > 1) {
            // Handle case where last record of a page is deleted, move back one page
            currentPage--;
            renderSubmittedDCRTable();
            return;
        }

        recordsToDisplay.forEach(dcr => {
            const row = document.createElement('tr');
            row.dataset.id = dcr.reportId;

            // Product name rendering (no bolding)
            const samples = Array.isArray(dcr.samplesGiven) ? dcr.samplesGiven : [];
            const samplesSummary = samples.length > 0
                ? samples.map(s => {
                    const name = s && s.productName ? String(s.productName) : '';
                    const qty = s && s.quantity != null ? s.quantity : 0;
                    const base = name.includes('(') ? name.split('(')[0].trim() : name.trim();
                    return `${base} (${qty})`;
                }).join('<br>')
                : '\u2014';

            const formattedDate = new Date(dcr.dateTime).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            });

            const ratingText = `${dcr.rating} ⭐`;

            const remarks = dcr.remarks == null ? '' : String(dcr.remarks);

            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>
                    <div class="fw-bold">${dcr.doctorName}</div>
                    <div class="small text-muted">${dcr.clinicName || dcr.clinicLocation || ''}</div>
                </td>
                <td>${dcr.visitType}</td>
                <td class="text-center">${ratingText}</td>
                <td class="small">${samplesSummary}</td>
                <td class="small">${remarks.substring(0, 50)}${remarks.length > 50 ? '...' : ''}</td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button type="button" class="btn btn-outline-primary edit-dcr-btn" data-id="${dcr.reportId}" data-bs-toggle="modal" data-bs-target="#dcrModal">
                            <i class="bi bi-pencil-square"></i> Edit
                        </button>
                    </div>
                </td>
            `;

            submittedDCRTableBody.appendChild(row);
        });

        renderPaginationControls(submittedDCRs.length);
    }

    // Function to Reset the Form
    function resetFormState() {
        dcrForm.reset();
        dcrModalLabel.textContent = 'Add New Visit Report';
        reportIdField.value = '';
        tempSamples = [];
        renderSamplesTable();
        // Reset the 'Select Rating' to the default '3' for new entries
        document.getElementById('doctorRating').value = '3';

        // Show required asterisk for date in new DCR mode
        const visitDateRequired = document.getElementById('visitDateRequired');
        if (visitDateRequired) {
            visitDateRequired.style.display = 'inline';
        }

        // Clear validation errors
        const visitDateInput = document.getElementById('visitDate');
        const visitDateError = document.getElementById('visitDateError');
        if (visitDateInput) visitDateInput.classList.remove('is-invalid');
        if (visitDateError) visitDateError.classList.add('d-none');

        const visitTitleInput = document.getElementById('visitTitle');
        const visitTitleError = document.getElementById('visitTitleError');
        if (visitTitleInput) visitTitleInput.classList.remove('is-invalid');
        if (visitTitleError) visitTitleError.classList.add('d-none');
    }

    // Function to Load a DCR for Editing
    function loadDCRForEdit(reportId) {
        const dcr = submittedDCRs.find(d => d.reportId === reportId);
        if (!dcr) return;

        // 1. Set Modal Title and Hidden ID
        dcrModalLabel.textContent = `Edit Visit Report`;
        reportIdField.value = reportId;

        // 2. Populate Form Fields
        document.getElementById('visitTitle').value = dcr.visitTitle;
        document.getElementById('visitType').value = dcr.visitType;
        doctorSelect.value = dcr.doctorId;
        if (clinicNameInput) clinicNameInput.value = dcr.clinicName || dcr.clinicLocation || '';
        document.getElementById('visitDate').value = dcr.dateTime;
        document.getElementById('doctorRating').value = dcr.rating;
        document.getElementById('mrRemarks').value = dcr.remarks == null ? '' : dcr.remarks;

        // 3. Hide required asterisk for date in edit mode
        const visitDateRequired = document.getElementById('visitDateRequired');
        if (visitDateRequired) {
            visitDateRequired.style.display = 'none';
        }

        // 4. Populate Temporary Samples Array
        const samples = Array.isArray(dcr.samplesGiven) ? dcr.samplesGiven : [];
        tempSamples = samples.map(s => ({
            ...s,
            id: sampleEntryIdCounter++,
        }));

        // 5. Render Samples Table
        renderSamplesTable();

        // Clear validation errors
        const vDateInput = document.getElementById('visitDate');
        const vDateError = document.getElementById('visitDateError');
        if (vDateInput) vDateInput.classList.remove('is-invalid');
        if (vDateError) vDateError.classList.add('d-none');

        const vTitleInput = document.getElementById('visitTitle');
        const vTitleError = document.getElementById('visitTitleError');
        if (vTitleInput) vTitleInput.classList.remove('is-invalid');
        if (vTitleError) vTitleError.classList.add('d-none');
    }

    function updateVisitDateMax() {
        const visitDateInput = document.getElementById('visitDate');
        if (visitDateInput) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const minString = `${year}-${month}-${day}T00:00`;
            const maxString = `${year}-${month}-${day}T23:59`;
            visitDateInput.setAttribute('min', minString);
            visitDateInput.setAttribute('max', maxString);
        }
    }

    // Handle Modal Show Event (for Edit button)
    dcrModalElement.addEventListener('show.bs.modal', async (event) => {
        updateVisitDateMax();
        
        // Check if we have data, if not, try to load it
        if ((!assignedDoctors || assignedDoctors.length === 0) || (!mrStock || mrStock.length === 0)) {
            console.log('[DCR] No data available, attempting to refresh...');
            try {
                await refreshFromApiOrFallback();
            } catch (error) {
                console.error('[DCR] Failed to refresh data on modal open:', error);
            }
        }
        
        // Always repopulate dropdowns when modal opens to ensure fresh data
        populateDoctors();
        populateProductSelect(sampleProductSelect);
        
        const button = event.relatedTarget;
        if (button && button.classList.contains('edit-dcr-btn')) {
            const reportId = parseInt(button.dataset.id);
            loadDCRForEdit(reportId);
        } else {
            resetFormState();
        }
    });

    // Handle Modal Hide Event (cleanup)
    dcrModalElement.addEventListener('hidden.bs.modal', () => {
        // Clear temporary success message inside the modal
        const successMessage = document.getElementById('successMessage');
        if (successMessage) successMessage.classList.add('d-none');
    });


    // --- DCR ACTIONS (EDIT/DELETE) ---

    submittedDCRTableBody.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        const reportId = parseInt(target.dataset.id);

        // Delete action removed by requirement.
    });


    // --- SAMPLES ENTRY HANDLERS (inside modal) ---

    doctorSelect.addEventListener('change', () => {
        const selectedOption = doctorSelect.options[doctorSelect.selectedIndex];
        if (clinicNameInput) {
            const clinic = selectedOption.dataset.clinic || '';
            clinicNameInput.value = clinic;
        }
    });

    const visitTitleInput = document.getElementById('visitTitle');
    if (visitTitleInput) {
        visitTitleInput.addEventListener('input', () => {
            const regex = /^[A-Za-z\s]+$/;
            const visitTitleError = document.getElementById('visitTitleError');
            if (regex.test(visitTitleInput.value) || visitTitleInput.value === "") {
                if (visitTitleError) visitTitleError.classList.add('d-none');
                visitTitleInput.classList.remove('is-invalid');
            }
        });
    }

    const visitDateInput = document.getElementById('visitDate');
    if (visitDateInput) {
        visitDateInput.addEventListener('input', () => {
            const visitDate = new Date(visitDateInput.value);
            const now = new Date();
            const visitDateError = document.getElementById('visitDateError');

            if (visitDate <= now) {
                if (visitDateError) visitDateError.classList.add('d-none');
                visitDateInput.classList.remove('is-invalid');
            }
        });
    }

    sampleProductSelect.addEventListener('change', () => {
        const productId = sampleProductSelect.value;
        const maxStock = getProductStock(productId);

        sampleQuantityInput.value = '';
        if (productId) {
            sampleQuantityInput.setAttribute('max', 9999); // Set high limit instead of blocking
            sampleQuantityInput.placeholder = `Qty (Available: ${maxStock})`;
            sampleQuantityInput.disabled = false; // Never disable, allow entry
        } else {
            sampleQuantityInput.removeAttribute('max');
            sampleQuantityInput.placeholder = 'Quantity';
            sampleQuantityInput.disabled = false;
        }
    });

    addSampleBtn.addEventListener('click', () => {
        const productId = sampleProductSelect.value;
        const quantity = parseInt(sampleQuantityInput.value);
        const maxStock = getProductStock(productId);

        if (!productId) {
            alert("Please select a sample name (product).");
            return;
        }
        if (isNaN(quantity) || quantity <= 0) {
            alert("Please enter a positive quantity.");
            return;
        }

        if (quantity > maxStock) {
            alert(`Insufficient stock. Max available: ${maxStock}`);
            return;
        }

        const existingSample = tempSamples.find(s => String(s.productId) === String(productId));

        // Find product name robustly
        const productInfo = systemProducts.find(p => String(p.id) === String(productId))
            || mrStock.find(p => String(p.id) === String(productId));
        const productName = productInfo ? productInfo.name : `Product ${productId}`;

        if (existingSample) {
            existingSample.quantity += quantity;
        } else {
            tempSamples.push({
                id: sampleEntryIdCounter++,
                productId: productId,
                productName: productName,
                quantity: quantity
            });
        }

        renderSamplesTable();
        sampleProductSelect.value = '';
        sampleQuantityInput.value = '';
        sampleQuantityInput.removeAttribute('max');
        sampleQuantityInput.placeholder = 'Quantity';
        sampleQuantityInput.disabled = false;
    });

    samplesTableBody.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        const sampleId = parseInt(target.dataset.id);
        const sampleIndex = tempSamples.findIndex(s => s.id === sampleId);
        if (sampleIndex === -1) return;

        if (target.classList.contains('delete-sample-btn')) {
            tempSamples.splice(sampleIndex, 1);
            renderSamplesTable();
        } else if (target.classList.contains('edit-sample-btn')) {
            const sample = tempSamples[sampleIndex];
            const max = getProductStock(sample.productId) + sample.quantity;

            let newQuantity = prompt(`Enter new quantity for ${sample.productName} (Max: ${max}):`, sample.quantity);

            if (newQuantity !== null) {
                newQuantity = parseInt(newQuantity);
                if (isNaN(newQuantity) || newQuantity < 0) {
                    alert("Invalid quantity. Must be a non-negative number.");
                    return;
                }
                if (newQuantity > max) {
                    alert(`Quantity exceeds max available stock: ${max}`);
                    return;
                }

                sample.quantity = newQuantity;
                if (sample.quantity === 0) {
                    tempSamples.splice(sampleIndex, 1);
                }
                renderSamplesTable();
            }
        }
    });


    // --- FORM SUBMISSION (Add/Edit Logic) ---
    dcrForm.addEventListener('submit', (event) => {
        event.preventDefault();

        // 0. Validate Visit Title (Letters and spaces only)
        const visitTitleInput = document.getElementById('visitTitle');
        const visitTitleError = document.getElementById('visitTitleError');
        const visitTitleValue = visitTitleInput.value.trim();
        const letterRegex = /^[A-Za-z\s]+$/;

        if (!letterRegex.test(visitTitleValue)) {
            if (visitTitleError) visitTitleError.classList.remove('d-none');
            visitTitleInput.classList.add('is-invalid');
            visitTitleInput.focus();
            return;
        } else {
            if (visitTitleError) visitTitleError.classList.add('d-none');
            visitTitleInput.classList.remove('is-invalid');
        }

        // 1. Validate Visit Date (Must be today only for new DCRs, optional for edits)
        const visitDateInput = document.getElementById('visitDate');
        const visitDateError = document.getElementById('visitDateError');
        const visitDateVal = (visitDateInput && visitDateInput.value) ? String(visitDateInput.value) : "";
        
        // Skip date validation for edits (allow keeping original date)
        if (!isEditing) {
            const visitDateKey = visitDateVal ? visitDateVal.split('T')[0] : "";
            const now = new Date();
            const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            if (!visitDateVal || visitDateKey !== todayKey) {
                if (visitDateError) {
                    visitDateError.textContent = "Only current date is allowed for new DCRs.";
                    visitDateError.classList.remove('d-none');
                }
                if (visitDateInput) {
                    visitDateInput.classList.add('is-invalid');
                    visitDateInput.focus();
                }
                return;
            }
        }

        if (visitDateError) visitDateError.classList.add('d-none');
        if (visitDateInput) visitDateInput.classList.remove('is-invalid');

        // AUTO-ADD HELPER: If user filled in sample fields but forgot to click '+', add it now
        const pendingPid = sampleProductSelect.value;
        const pendingQty = parseInt(sampleQuantityInput.value);
        if (!pendingPid && !isNaN(pendingQty) && pendingQty > 0) {
            alert("Please select a sample name (product) for the entered quantity.");
            return;
        }
        if (pendingPid && !isNaN(pendingQty) && pendingQty > 0) {
            console.log("[DCR] Auto-adding pending sample before submission...");
            addSampleBtn.click();
        }

        const isEditing = reportIdField.value !== '';
        const reportId = isEditing ? parseInt(reportIdField.value) : Date.now();

        if (tempSamples.length === 0 && !confirm("No samples added. Submit report anyway?")) {
            return;
        }

        const newReportData = {
            reportId: reportId,
            visitTitle: document.getElementById('visitTitle').value.trim(),
            visitType: document.getElementById('visitType').value,
            doctorId: doctorSelect.value,
            doctorName: doctorSelect.options[doctorSelect.selectedIndex].text,
            clinicName: clinicNameInput.value.trim(),
            dateTime: document.getElementById('visitDate').value,
            rating: document.getElementById('doctorRating').value,
            remarks: document.getElementById('mrRemarks').value.trim(),
            samplesGiven: tempSamples.map(s => ({
                productId: s.productId,
                productName: s.productName,
                quantity: s.quantity
            })),
            submissionTime: new Date().toISOString()
        };

        (async function () {
            if (apiMode) {
                try {
                    const currentUserName = getCurrentUserIdentifier();
                    const payload = {
                        visitTitle: newReportData.visitTitle,
                        visitType: newReportData.visitType,
                        doctorId: newReportData.doctorId,
                        doctorName: newReportData.doctorName,
                        clinicLocation: newReportData.clinicName,
                        dateTime: newReportData.dateTime,
                        rating: newReportData.rating,
                        mrName: currentUserName,
                        remarks: newReportData.remarks,
                        samplesGiven: newReportData.samplesGiven
                    };

                    if (isEditing) {
                        await apiJson(`${API.DCRS}/${reportId}`, { method: 'PUT', body: JSON.stringify(payload) });
                    } else {
                        await apiJson(API.DCRS, { method: 'POST', body: JSON.stringify(payload) });
                        currentPage = 1; // Always go to the first page for new entry
                    }

                    await refreshFromApiOrFallback();
                    apiMode = false;
                } catch (e) {
                    console.warn('DCR submit API failed. Falling back to localStorage.', e);
                    apiMode = false;
                }
            }

            // Fallback mode: preserve existing local behavior with local stock updates
            if (isEditing) {
                // EDIT LOGIC
                const oldDCRIndex = submittedDCRs.findIndex(d => d.reportId === reportId);
                if (oldDCRIndex === -1) return;

                const oldDCR = submittedDCRs[oldDCRIndex];
                const oldSamples = Array.isArray(oldDCR.samplesGiven) ? oldDCR.samplesGiven : [];
                const newSamples = Array.isArray(newReportData.samplesGiven) ? newReportData.samplesGiven : [];

                // 1. Refund Old Stock
                oldSamples.forEach(item => {
                    const product = mrStock.find(p => p.id === item.productId);
                    if (product) {
                        product.stock += (Number(item.quantity) || 0);
                    }
                });

                // 2. Re-deduct New Stock
                newSamples.forEach(item => {
                    updateStock(item.productId, item.quantity);
                });

                // 3. Update the DCR in the array
                submittedDCRs[oldDCRIndex] = newReportData;

            } else {
                // ADD LOGIC
                // 1. Deduct Stock
                newReportData.samplesGiven.forEach(item => {
                    updateStock(item.productId, item.quantity);
                });
                // 2. Add to Submitted DCRs
                submittedDCRs.unshift(newReportData); // Add to the top
                currentPage = 1; // Always go to the first page for new entry
            }

            // --- FINAL COMMIT & UI UPDATE ---
            saveStock();
            saveDCRs();

            // Hide modal
            dcrModal.hide();

            // Show Toast Notification
            if (liveToast) {
                // Update toast body content
                const toastBody = document.getElementById('toastBody');
                const toastHeader = document.querySelector('#liveToast .toast-header strong');
                
                if (isEditing) {
                    toastHeader.textContent = 'DCR Updated';
                    toastBody.textContent = `Visit report updated successfully for ${newReportData.doctorName}.`;
                } else {
                    toastHeader.textContent = 'DCR Submitted';
                    toastBody.textContent = `Visit report submitted successfully for ${newReportData.doctorName}.`;
                }
                
                // Show toast with longer delay
                liveToast.show();
                
                // Auto-hide after 4 seconds
                setTimeout(() => {
                    liveToast.hide();
                }, 4000);
            } else {
                console.log(`✅ Success: Your DCR submitted successfully for ${newReportData.doctorName}.`);
            }

            // Refresh table with pagination
            renderSubmittedDCRTable();
        })();
    });


    // --- EXECUTE INITIALIZATION ---
    if (!localStorage.getItem('mrProductStock')) {
        saveStock();
    }
    (async function () {
        updateVisitDateMax();
        await refreshFromApiOrFallback();
    })();
});
