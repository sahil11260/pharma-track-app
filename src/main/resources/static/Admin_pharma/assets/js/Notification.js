document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = window.location.port === "5500" ? "http://localhost:8080" : "";
  const NOTIFICATIONS_API_BASE = `${API_BASE}/api/notifications`;
  let notificationsApiMode = true;

  const tableBody = document.getElementById("notificationTableBody");
  const form = document.getElementById("notificationForm");
  const searchInput = document.getElementById("searchNotification");
  const pagination = document.getElementById("pagination");
  const recipientTypeSelect = document.getElementById("recipientType");
  const specificRecipientContainer = document.getElementById("specificRecipientContainer");
  const specificRecipientSelect = document.getElementById("specificRecipient");
  const specificRecipientLabel = document.getElementById("specificRecipientLabel");

  let allUsers = [];

  function getAuthHeader() {
    const token = localStorage.getItem("kavya_auth_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  async function apiJson(url, options) {
    const res = await fetch(url, Object.assign({
      headers: Object.assign({ "Content-Type": "application/json" }, getAuthHeader())
    }, options || {}));
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    return await res.json();
  }

  // Data initialized as empty
  let notifications = [];

  async function refreshNotificationsFromApiOrFallback() {
    try {
      const data = await apiJson(NOTIFICATIONS_API_BASE);
      if (Array.isArray(data)) {
        notifications = data.map((n) => ({
          id: String(n.id),
          recipient: n.type,
          message: n.message,
          date: n.date ? String(n.date) : "",
          recipientId: n.recipientId
        }));
        notificationsApiMode = true;
      } else {
        notifications = [];
      }
    } catch (e) {
      console.warn("Notifications API unavailable.", e);
      notificationsApiMode = false;
      // Keep notifications empty or handle UI error state
    }
  }

  async function fetchUsers() {
    try {
      allUsers = await apiJson(`${API_BASE}/api/users`);
    } catch (e) {
      console.warn("Failed to fetch users for recipient selection", e);
    }
  }

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

  function populateSpecificRecipients(role) {
    const filteredUsers = allUsers.filter(u => u.role === role);
    specificRecipientSelect.innerHTML = '<option value="">All ' + (role === "MANAGER" ? "Managers" : "MRs") + '</option>' +
      filteredUsers.map(u => `<option value="${u.id}">${u.name} (${u.email})</option>`).join("");
  }

  const perPage = 5;
  let currentPage = 1;

  // âœ… Render Notifications Table
  const renderTable = () => {
    const filtered = notifications.filter(n =>
      n.message.toLowerCase().includes(searchInput.value.toLowerCase())
    );

    const totalPages = Math.ceil(filtered.length / perPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    const start = (currentPage - 1) * perPage;
    const paginated = filtered.slice(start, start + perPage);

    tableBody.innerHTML = paginated
      .map(
        (n, i) => {
          let recipientDisplay = n.recipient;
          if (n.recipientId && allUsers.length > 0) {
            const user = allUsers.find(u => String(u.id) === String(n.recipientId));
            if (user) recipientDisplay += ` (${user.name})`;
          }
          return `
          <tr>
            <td>${recipientDisplay}</td>
            <td>${n.message}</td>
            <td>${n.date}</td>
            <td>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteNotification('${n.id}')">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>`;
        }
      )
      .join("") || `<tr><td colspan="4" class="text-center text-muted">No notifications found</td></tr>`;

    // âœ… Pagination Controls
    pagination.innerHTML = `
      <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
        <a class="page-link" href="#" id="prevPage">Previous</a>
      </li>
      ${Array.from({ length: totalPages }, (_, i) => `
        <li class="page-item ${i + 1 === currentPage ? "active" : ""}">
          <a class="page-link" href="#">${i + 1}</a>
        </li>`).join("")}
      <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
        <a class="page-link" href="#" id="nextPage">Next</a>
      </li>
    `;

    // âœ… Page Number Click
    document.querySelectorAll(".page-link").forEach((btn, index) => {
      if (btn.id === "prevPage") {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          if (currentPage > 1) currentPage--;
          renderTable();
        });
      } else if (btn.id === "nextPage") {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          if (currentPage < totalPages) currentPage++;
          renderTable();
        });
      } else {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          currentPage = parseInt(btn.textContent);
          renderTable();
        });
      }
    });
  };

  renderTable();

  // âœ… Add Notification
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const newNotif = {
      id: `L${Date.now()}`,
      recipient: form.recipientType.value,
      message: form.notificationMessage.value.trim(),
      date: new Date().toISOString().split("T")[0],
      recipientId: specificRecipientSelect.value || null
    };

    (async function () {
      if (notificationsApiMode) {
        try {
          await apiJson(NOTIFICATIONS_API_BASE, {
            method: "POST",
            body: JSON.stringify({
              title: newNotif.recipient,
              message: newNotif.message,
              type: newNotif.recipient,
              date: newNotif.date,
              status: "Unread",
              priority: "Normal",
              recipientId: newNotif.recipientId
            }),
          });
          await refreshNotificationsFromApiOrFallback();
          renderTable();
          form.reset();
          const modalEl = document.getElementById("notificationModal");
          const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
          modal.hide();
          return;
        } catch (e) {
          console.warn("Notification create API failed.", e);
          alert("Failed to create notification. Please check connectivity.");
          notificationsApiMode = false;
        }
      }

      notifications.unshift(newNotif);
      localStorage.setItem("notifications", JSON.stringify(notifications));
      renderTable();
      form.reset();
      const modalEl = document.getElementById("notificationModal");
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.hide();
    })();
  });

  // âœ… Search Filter
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderTable();
  });

  // âœ… Delete Notification
  window.deleteNotification = (id) => {
    if (!confirm("Delete this notification?")) return;

    (async function () {
      if (notificationsApiMode && id && !String(id).startsWith("L")) {
        try {
          await apiJson(`${NOTIFICATIONS_API_BASE}/${id}`, { method: "DELETE" });
          await refreshNotificationsFromApiOrFallback();
          renderTable();
          return;
        } catch (e) {
          console.warn("Notification delete API failed. Falling back to localStorage.", e);
          notificationsApiMode = false;
        }
      }

      const idx = notifications.findIndex((n) => String(n.id) === String(id));
      if (idx !== -1) {
        notifications.splice(idx, 1);
        localStorage.setItem("notifications", JSON.stringify(notifications));
      }
      renderTable();
    })();
  };

  (async function () {
    await fetchUsers();
    await refreshNotificationsFromApiOrFallback();
    renderTable();
  })();
});
