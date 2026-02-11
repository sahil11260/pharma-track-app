document.addEventListener("DOMContentLoaded", () => {
  // const API_BASE = window.location.port === "5500" ? "http://localhost:8080" : "";
  const API_BASE = window.API_BASE || "/api";

  const NOTIFICATIONS_API_BASE = `${API_BASE}/api/notifications`;

  const tableBody = document.getElementById("notificationTableBody");
  const form = document.getElementById("notificationForm");
  const searchInput = document.getElementById("searchNotification");
  const pagination = document.getElementById("pagination");
  const recipientTypeSelect = document.getElementById("recipientType");
  const specificRecipientContainer = document.getElementById("specificRecipientContainer");
  const specificRecipientSelect = document.getElementById("specificRecipient");
  const specificRecipientLabel = document.getElementById("specificRecipientLabel");

  let allNotifications = [];
  let allUsers = [];
  const perPage = 10;
  let currentPage = 1;

  // Clear old problematic local storage data once
  if (localStorage.getItem("admin_notifications_cleaned_v2") !== "true") {
    localStorage.removeItem("notifications");
    localStorage.setItem("admin_notifications_cleaned_v2", "true");
  }

  function getAuthHeader() {
    const token = localStorage.getItem("kavya_auth_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  async function apiRequest(url, options = {}) {
    const res = await fetch(url, Object.assign({
      headers: Object.assign({ "Content-Type": "application/json" }, getAuthHeader())
    }, options));

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    return await res.json();
  }

  async function fetchData() {
    try {
      const [notifsData, usersData] = await Promise.all([
        apiRequest(NOTIFICATIONS_API_BASE),
        apiRequest(`${API_BASE}/api/users`).catch(() => [])
      ]);
      allNotifications = Array.isArray(notifsData) ? notifsData : [];
      allUsers = Array.isArray(usersData) ? usersData : [];
      renderTable();
    } catch (e) {
      console.error("Failed to fetch data:", e);
      renderTable();
    }
  }

  function renderTable() {
    if (!tableBody) return;

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const filtered = allNotifications.filter(n =>
      (n.message || "").toLowerCase().includes(searchTerm) ||
      (n.type || "").toLowerCase().includes(searchTerm)
    );

    const totalPages = Math.ceil(filtered.length / perPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * perPage;
    const paginated = filtered.slice(start, start + perPage);

    tableBody.innerHTML = paginated.length ? paginated.map(n => {
      let recipientDisplay = n.type || "All";
      if (n.recipientId) {
        const user = allUsers.find(u => String(u.id) === String(n.recipientId));
        if (user) recipientDisplay += ` (${user.name})`;
      }
      return `
                <tr>
                    <td><span class="badge bg-info text-dark">${recipientDisplay}</span></td>
                    <td>${n.message || "No message"}</td>
                    <td>${n.date || "N/A"}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteNotification('${n.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
    }).join("") : '<tr><td colspan="4" class="text-center text-muted">No notifications found</td></tr>';

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (!pagination) return;
    let html = `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>
            </li>`;

    for (let i = 1; i <= totalPages; i++) {
      html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>`;
    }

    html += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
            </li>`;

    pagination.innerHTML = html;
  }

  window.changePage = (page) => {
    currentPage = page;
    renderTable();
  };

  window.deleteNotification = async (id) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;
    try {
      await apiRequest(`${NOTIFICATIONS_API_BASE}/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e) {
      alert("Failed to delete: " + e.message);
    }
  };

  if (recipientTypeSelect) {
    recipientTypeSelect.addEventListener("change", () => {
      const type = recipientTypeSelect.value;
      if (type === "Managers" || type === "MRs") {
        specificRecipientContainer.style.display = "block";
        specificRecipientLabel.textContent = `Select ${type === "Managers" ? "Manager" : "MR"}`;
        populateSpecificRecipients(type === "Managers" ? "MANAGER" : "MR");
      } else {
        specificRecipientContainer.style.display = "none";
        specificRecipientSelect.innerHTML = '<option value="">Select...</option>';
      }
    });
  }

  function populateSpecificRecipients(role) {
    if (!specificRecipientSelect) return;
    const filteredUsers = allUsers.filter(u => u.role === role);
    specificRecipientSelect.innerHTML = '<option value="">All ' + (role === "MANAGER" ? "Managers" : "MRs") + '</option>' +
      filteredUsers.map(u => `<option value="${u.id}">${u.name} (${u.email})</option>`).join("");
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const recipient = form.recipientType.value;
      const message = form.notificationMessage.value.trim();
      const recipientId = specificRecipientSelect.value || null;

      try {
        await apiRequest(NOTIFICATIONS_API_BASE, {
          method: "POST",
          body: JSON.stringify({
            title: `Announcement to ${recipient}`,
            message: message,
            type: recipient,
            targetRole: recipient === "All" ? "ALL" : (recipient === "Managers" ? "MANAGER" : (recipient === "MRs" ? "MR" : null)),
            date: new Date().toISOString().split("T")[0],
            status: "Unread",
            priority: "Normal",
            recipientId: recipientId ? parseInt(recipientId) : null
          })
        });
        form.reset();
        specificRecipientContainer.style.display = "none";
        bootstrap.Modal.getInstance(document.getElementById("notificationModal")).hide();
        fetchData();
      } catch (e) {
        alert("Failed to send: " + e.message);
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentPage = 1;
      renderTable();
    });
  }

  fetchData();
});

