document.addEventListener("DOMContentLoaded", function () {
  // const API_BASE = window.location.port === "5500" ? "http://localhost:8080" : "";
  const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? (window.location.port === "8080" ? "" : "http://localhost:8080")
    : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");

  const DOCTORS_API = `${API_BASE}/api/doctors`;
  const USERS_API = `${API_BASE}/api/users`;

  const tableBody = document.getElementById("doctorsTableBody");
  const paginationEl = document.getElementById("pagination");
  const searchInput = document.getElementById("searchInput");
  const doctorForm = document.getElementById("doctorForm");
  const modalTitle = document.querySelector("#doctorModal .modal-title");
  const submitBtn = doctorForm.querySelector('button[type="submit"]');
  const assignMR = document.getElementById("assignMR");
  const doctorModal = new bootstrap.Modal(document.getElementById("doctorModal"));

  let doctors = [];
  let mrs = [];
  let filteredDoctors = [];
  let editMode = false;
  let currentEditId = null;
  let currentPage = 1;
  const rowsPerPage = 5;

  // --- Helpers ---
  function getAuthHeader() {
    const token = localStorage.getItem("kavya_auth_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
  }

  async function apiRequest(url, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Error ${response.status}: ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.message || errorMsg;
        } catch (e) {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }
      if (response.status === 204) return null;
      return await response.json();
    } catch (error) {
      console.error("API Request Failed:", error);
      throw error;
    }
  }

  // --- Initializers ---
  async function fetchMrs() {
    try {
      const data = await apiRequest(USERS_API);
      mrs = data.filter(u => u.role === "MR");
      assignMR.innerHTML = '<option value="">-- Unassigned --</option>' +
        mrs.map(m => `<option value="${m.name}">${m.name}</option>`).join("");
    } catch (e) {
      console.error("Failed to fetch MRs:", e);
    }
  }

  async function fetchDoctors() {
    try {
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner-border text-primary" role="status"></div></td></tr>';
      const data = await apiRequest(DOCTORS_API);
      doctors = data.map(d => ({
        id: d.id,
        name: d.name,
        specialty: d.specialty || "\u2014",
        city: d.city || "\u2014",
        assignedMR: d.assignedMR || "",
        phone: d.phone || "",
        email: d.email || "",
        contact: d.email || d.phone || "\u2014"
      }));
      applyFilter();
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load doctors: ${error.message}</td></tr>`;
    }
  }

  function applyFilter() {
    const term = searchInput.value.toLowerCase();
    filteredDoctors = doctors.filter(d =>
      d.name.toLowerCase().includes(term) ||
      d.specialty.toLowerCase().includes(term) ||
      d.city.toLowerCase().includes(term) ||
      d.assignedMR.toLowerCase().includes(term)
    );
    currentPage = 1;
    renderTable();
  }

  function renderTable() {
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredDoctors.slice(start, end);

    if (pageData.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No doctors found.</td></tr>';
      renderPagination();
      return;
    }

    pageData.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.name}</td>
        <td>${d.specialty}</td>
        <td>${d.city}</td>
        <td>${d.assignedMR || '<span class="text-muted">Unassigned</span>'}</td>
        <td>${d.contact}</td>
        <td>
          <div class="d-flex justify-content-center gap-2">
            <button class="btn btn-outline-primary edit-btn" data-id="${d.id}"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger delete-btn" data-id="${d.id}"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    tableBody.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => openEditModal(btn.dataset.id));
    });
    tableBody.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => deleteDoctor(btn.dataset.id));
    });

    renderPagination();
  }

  function renderPagination() {
    paginationEl.innerHTML = "";
    const totalPages = Math.ceil(filteredDoctors.length / rowsPerPage);

    if (totalPages === 0) {
      paginationEl.innerHTML = '<li class="page-item disabled"><span class="page-link">No pages</span></li>';
      return;
    }

    let html = `
      <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
        <a class="page-link" href="#" data-page="prev">Previous</a>
      </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
      html += `
        <li class="page-item ${i === currentPage ? "active" : ""}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>`;
    }

    html += `
      <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
        <a class="page-link" href="#" data-page="next">Next</a>
      </li>
    `;

    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll(".page-link").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const value = btn.dataset.page;
        if (value === "prev" && currentPage > 1) {
          currentPage--;
        } else if (value === "next" && currentPage < totalPages) {
          currentPage++;
        } else if (!isNaN(value)) {
          currentPage = parseInt(value);
        }
        renderTable();
      })
    );
  }

  // --- Actions ---
  window.openAddModal = function () {
    editMode = false;
    currentEditId = null;
    modalTitle.textContent = "Add Doctor";
    doctorForm.reset();
    document.getElementById("doctorPhone").value = "";
    doctorModal.show();
  };

  async function openEditModal(id) {
    const doc = doctors.find(d => String(d.id) === String(id));
    if (!doc) return;
    editMode = true;
    currentEditId = id;
    modalTitle.textContent = "Edit Doctor";
    document.getElementById("doctorName").value = doc.name;
    const specialtySelect = document.getElementById("doctorSpecialty");
    let specialtyVal = doc.specialty === "\u2014" ? "" : doc.specialty;

    // Check if the specialty value from the database exists in our new dropdown options
    let optionExists = false;
    for (let opt of specialtySelect.options) {
      if (opt.value === specialtyVal) {
        optionExists = true;
        break;
      }
    }

    if (specialtyVal && !optionExists) {
      specialtySelect.value = "Other"; // Fallback for old custom entries
    } else {
      specialtySelect.value = specialtyVal;
    }
    document.getElementById("doctorCity").value = doc.city === "\u2014" ? "" : doc.city;
    document.getElementById("doctorPhone").value = doc.phone || "";
    document.getElementById("doctorContact").value = doc.contact === "\u2014" ? "" : doc.contact;
    assignMR.value = doc.assignedMR;
    doctorModal.show();
  }

  async function deleteDoctor(id) {
    if (!confirm("Delete this doctor?")) return;
    try {
      await apiRequest(`${DOCTORS_API}/${id}`, { method: "DELETE" });
      fetchDoctors();
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  }

  doctorForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = document.getElementById("doctorName").value;
    const phone = document.getElementById("doctorPhone").value;
    const specialty = document.getElementById("doctorSpecialty").value;

    if (!name || !name.trim()) {
      alert("Doctor Name is required.");
      return;
    }

    if (!specialty) {
      alert("Specialty is required.");
      return;
    }

    // Phone validation: Must be exactly 10 digits
    if (phone && phone.length !== 10) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }

    const email = document.getElementById("doctorContact").value.trim();
    // Check for capital letters
    if (/[A-Z]/.test(email)) {
      alert("Email should not contain capital letters.");
      return;
    }

    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.(com|in|org|net|edu|gov|co|io)$/;
    if (!emailRegex.test(email)) {
      alert("Invalid email format. Please use a standard email (e.g., user@example.com) with common extensions (.com, .in, .org, etc.) and no capital letters.");
      return;
    }

    const payload = {
      name: name,
      specialty: document.getElementById("doctorSpecialty").value,
      city: document.getElementById("doctorCity").value,
      phone: phone,
      email: email,
      assignedMR: assignMR.value,
      type: "Doctor",
      clinicName: "Default Clinic",
      status: "ACTIVE"
    };

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Saving...';
      if (editMode) {
        await apiRequest(`${DOCTORS_API}/${currentEditId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiRequest(DOCTORS_API, { method: "POST", body: JSON.stringify(payload) });
      }
      doctorModal.hide();
      fetchDoctors();
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save";
    }
  });

  searchInput.addEventListener("input", applyFilter);

  // Initial load
  fetchMrs();
  fetchDoctors();

  // Fix for Phone Number: only accept digits and max 10
  const phoneInput = document.getElementById("doctorPhone");
  if (phoneInput) {
    phoneInput.addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "").slice(0, 10);
    });
  }

  // Fix for Doctor Name: only accept letters and spaces
  const nameInput = document.getElementById("doctorName");
  if (nameInput) {
    nameInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^A-Za-z\s.]/g, "");
    });
  }
});

