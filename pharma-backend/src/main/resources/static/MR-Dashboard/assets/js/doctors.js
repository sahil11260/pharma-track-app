// MR Dashboard - My Assigned Doctors
document.addEventListener("DOMContentLoaded", () => {
    console.log("[DOCTORS-MR] doctors.js loaded and DOM ready");

    // --- API Configuration ---
    const API_BASE = "https://pharma-track-app.onrender.com";
    const DOCTORS_API_BASE = `${API_BASE}/api/doctors`;
    let doctorsApiMode = true;

    function getAuthHeader() {
        const token = localStorage.getItem("kavya_auth_token");
        return token ? { "Authorization": `Bearer ${token}` } : {};
    }

    async function apiJson(url, options = {}) {
        const headers = { "Content-Type": "application/json", ...getAuthHeader(), ...(options.headers || {}) };
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP ${response.status}`);
        }
        return response.json();
    }

    // --- Data Mapping ---
    function mapBackendDoctorToUI(backendDoctor) {
        // Backend: { id, name, type, specialty, phone, email, clinicName, address, city, assignedMR, notes, status }
        // UI: { id, name, clinic, specialization, City }
        return {
            id: backendDoctor.id,
            name: backendDoctor.name,
            clinic: backendDoctor.clinicName || "N/A",
            specialization: backendDoctor.specialty || "N/A",
            City: backendDoctor.city || "N/A"
        };
    }

    // --- API Functions ---
    async function refreshDoctorsFromApi() {
        try {
            const currentMR = localStorage.getItem("signup_name") || "";
            console.log("[DOCTORS-MR] Fetching doctors for MR:", currentMR);

            const allDoctors = await apiJson(DOCTORS_API_BASE);
            console.log("[DOCTORS-MR] API response received:", allDoctors.length, "doctors");

            if (Array.isArray(allDoctors)) {
                // The backend now filters doctors based on the logged-in MR role.
                // We map the received doctors to the UI format.
                assignedDoctors = allDoctors.map(mapBackendDoctorToUI);

                saveDoctors();
                doctorsApiMode = true;
                hideApiRetryBanner();
                console.log("[DOCTORS-MR] Successfully loaded", assignedDoctors.length, "doctors from API after backend filtering");
                return;
            }
            console.warn("[DOCTORS-MR] API returned non-array response");
            doctorsApiMode = false;
        } catch (e) {
            console.error("[DOCTORS-MR] API call failed:", e);
            doctorsApiMode = false;
            showApiRetryBanner();
        }
    }

    // --- Banner Functions ---
    function showApiRetryBanner() {
        let banner = document.getElementById("doctorsApiRetryBanner");
        if (!banner) {
            banner = document.createElement("div");
            banner.id = "doctorsApiRetryBanner";
            banner.className = "alert alert-warning alert-dismissible fade show";
            banner.style.cssText = "position: fixed; top: 10px; right: 10px; z-index: 9999; max-width: 400px;";
            banner.innerHTML = `
                <strong>⚠️ Offline Mode</strong>
                <p class="mb-0">Doctors API unavailable. Using local data. <button class="btn btn-sm btn-warning" onclick="location.reload()">Retry</button></p>
            `;
            document.body.appendChild(banner);
        }
        banner.style.display = "block";
    }

    function hideApiRetryBanner() {
        const banner = document.getElementById("doctorsApiRetryBanner");
        if (banner) banner.style.display = "none";
    }

    // --- MOCK DATA (Fallback only) ---
    const mockAssignedDoctors = [
        { id: 1, name: "Dr. Anjali Sharma", clinic: "Care Clinic", specialization: "General Physician", City: "South Mumbai" },
        { id: 2, name: "Dr. Vikram Singh", clinic: "Global Hospital", specialization: "Cardiology", City: "Navi Mumbai" },
        { id: 3, name: "Dr. Rohit Patel", clinic: "City Medical Center", specialization: "Pediatrics", City: "Thane" },
        { id: 4, name: "Dr. Evelyn Reed", clinic: "Central Office Practice", specialization: "Gastroenterology", City: "Panvel" },
        { id: 5, name: "Dr. Ben Carter", clinic: "Westside Clinic", specialization: "Dermatology", City: "Kurla" }
    ];

    // Elements
    const doctorListBody = document.getElementById("doctorListBody");
    const totalDoctorsCountEl = document.getElementById("totalDoctorsCount");

    // Initialize Doctors List
    let assignedDoctors = [];

    function saveDoctors() {
        localStorage.setItem("mrAssignedDoctors", JSON.stringify(assignedDoctors));
    }

    function loadDoctorsFromStorage() {
        const storedDoctors = localStorage.getItem("mrAssignedDoctors");
        return storedDoctors ? JSON.parse(storedDoctors) : [];
    }

    // --- RENDERING FUNCTION ---
    function renderDoctorList() {
        doctorListBody.innerHTML = '';

        if (assignedDoctors.length === 0) {
            doctorListBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-4">No doctors are currently assigned to your territory.</td></tr>`;
            totalDoctorsCountEl.textContent = 0;
            return;
        }

        assignedDoctors.forEach((doctor, index) => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${index + 1}</td>
                <td><span class="fw-bold text-primary">${doctor.name}</span></td>
                <td>${doctor.clinic}</td>
                <td>${doctor.specialization}</td>
                <td>${doctor.City}</td>
            `;

            doctorListBody.appendChild(row);
        });

        totalDoctorsCountEl.textContent = assignedDoctors.length;
    }

    // --- INITIALIZATION ---
    (async function init() {
        console.log("[DOCTORS-MR] Initializing...");

        // Try to load from API first
        await refreshDoctorsFromApi();

        // If API failed, use localStorage or mock data
        if (!doctorsApiMode) {
            const storedDoctors = loadDoctorsFromStorage();
            if (storedDoctors.length > 0) {
                assignedDoctors = storedDoctors;
                console.log("[DOCTORS-MR] Loaded from localStorage:", assignedDoctors.length, "doctors");
            } else {
                assignedDoctors = mockAssignedDoctors;
                saveDoctors();
                console.log("[DOCTORS-MR] Using mock data");
            }
        }

        // Initial render
        renderDoctorList();
    })();
});
