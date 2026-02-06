document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "";
  const NOTIFICATIONS_API_BASE = `${API_BASE}/api/notifications`;
  let notificationsApiMode = true;

  const tableBody = document.getElementById("notificationTableBody");
  const form = document.getElementById("notificationForm");
  const searchInput = document.getElementById("searchNotification");
  const pagination = document.getElementById("pagination");

  function getAuthHeader() {
    const token = localStorage.getItem("kavya_auth_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  async function apiJson(url, options) {
    const res = await fetch(
      url,
      Object.assign(
        {
          headers: Object.assign(
            { "Content-Type": "application/json" },
            getAuthHeader()
          ),
        },
        options || {}
      )
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    return await res.json();
  }

  function isApiId(id) {
    // Backend generates IDs like N001
    return /^N\d{3}$/.test(String(id));
  }

  function normalizeFromApi(n) {
    return {
      id: String(n.id),
      recipient: n.type,
      message: n.message,
      date: n.date ? String(n.date) : "",
      recipientId: n.recipientId ?? null,
    };
  }

  async function refreshNotificationsFromApiOrFallback() {
    try {
      const data = await apiJson(NOTIFICATIONS_API_BASE);
      if (Array.isArray(data)) {
        const apiNotifs = data.map(normalizeFromApi);

        // Keep any local-only notifications (offline use)
        const localExisting = JSON.parse(localStorage.getItem("notifications")) || [];
        const localOnly = localExisting.filter((n) => !isApiId(n.id));

        notifications = apiNotifs.concat(localOnly);
        localStorage.setItem("notifications", JSON.stringify(notifications));
        notificationsApiMode = true;
        return;
      }
      notificationsApiMode = false;
    } catch (e) {
      console.warn("Notifications API unavailable, using localStorage.", e);
      notificationsApiMode = false;
    }
  }

  // Dummy Data
  let notifications = JSON.parse(localStorage.getItem("notifications")) || [
    {
      id: "L1",
      recipient: "Managers",
      message: "Monthly report due by Friday.",
      date: "2025-11-02",
    },
    {
      id: "L2",
      recipient: "MRs",
      message: "Doctor visit summary upload reminder.",
      date: "2025-11-03",
    },
    {
      id: "L3",
      recipient: "All",
      message: "Team meeting scheduled on Monday 10 AM.",
      date: "2025-11-04",
    },
    {
      id: "L4",
      recipient: "Managers",
      message: "Submit last month’s sales data.",
      date: "2025-11-05",
    },
    {
      id: "L5",
      recipient: "MRs",
      message: "Don’t forget doctor visit feedback form.",
      date: "2025-11-06",
    },
    {
      id: "L6",
      recipient: "All",
      message: "New products launch next week!",
      date: "2025-11-07",
    },
    {
      id: "L7",
      recipient: "Managers",
      message: "Expense report deadline tomorrow.",
      date: "2025-11-08",
    },
    {
      id: "L8",
      recipient: "MRs",
      message: "Doctor approval form updated.",
      date: "2025-11-09",
    },
    {
      id: "L9",
      recipient: "All",
      message: "Server maintenance tonight 11 PM.",
      date: "2025-11-10",
    },
    {
      id: "L10",
      recipient: "Managers",
      message: "Submit November plan ASAP.",
      date: "2025-11-11",
    },
  ];

  const perPage = 5;
  let currentPage = 1;

  // \u2705 Render Notifications Table
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
        (n, i) => `
        <tr>
          <td>${n.recipient}</td>
          <td>${n.message}</td>
          <td>${n.date}</td>
          <td>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteNotification('${String(
          n.id ?? i + start
        )}')">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`
      )
      .join("");

    // \u2705 Pagination Controls
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

    // \u2705 Page Number Click
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

  // \u2705 Add Notification
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const recipient = form.recipientType.value;
    const message = form.notificationMessage.value.trim();
    const date = new Date().toISOString().split("T")[0];

    const localNotif = {
      id: `L${Date.now()}`,
      recipient,
      message,
      date,
    };

    (async function () {
      if (notificationsApiMode) {
        try {
          await apiJson(NOTIFICATIONS_API_BASE, {
            method: "POST",
            body: JSON.stringify({
              title: recipient,
              message,
              type: recipient,
              date,
              status: "Unread",
              priority: "Normal",
              recipientId: null,
            }),
          });
          await refreshNotificationsFromApiOrFallback();
          renderTable();
          form.reset();
          bootstrap.Modal.getInstance(
            document.getElementById("notificationModal")
          ).hide();
          return;
        } catch (e) {
          console.warn(
            "Notification create API failed. Falling back to localStorage.",
            e
          );
          notificationsApiMode = false;
        }
      }

      notifications.unshift(localNotif);
      localStorage.setItem("notifications", JSON.stringify(notifications));
      renderTable();
      form.reset();
      bootstrap.Modal.getInstance(document.getElementById("notificationModal")).hide();
    })();
  });

  // \u2705 Search Filter
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderTable();
  });

  // \u2705 Delete Notification
  window.deleteNotification = (id) => {
    if (!confirm("Delete this notification?")) return;

    (async function () {
      if (notificationsApiMode && isApiId(id)) {
        try {
          await apiJson(`${NOTIFICATIONS_API_BASE}/${id}`, { method: "DELETE" });
          await refreshNotificationsFromApiOrFallback();
          renderTable();
          return;
        } catch (e) {
          console.warn(
            "Notification delete API failed. Falling back to localStorage.",
            e
          );
          notificationsApiMode = false;
        }
      }

      const idx = notifications.findIndex((n) => String(n.id) === String(id));
      if (idx !== -1) {
        notifications.splice(idx, 1);
        localStorage.setItem("notifications", JSON.stringify(notifications));
        renderTable();
      }
    })();
  };

  (async function () {
    await refreshNotificationsFromApiOrFallback();
    renderTable();
  })();
});

//-----------------------------------------------------------------------//
document.getElementById("notifyBtn").addEventListener("click", function () {
  loadNotificationsIntoModal();
});

function loadNotificationsIntoModal() {
  const notificationsList = document.getElementById("notificationsList");
  if (!notificationsList) return;

  // --- Your notifications data ---
  const recentActivities = [
    {
      icon: "bi-person-plus",
      iconClass: "bg-primary",
      title: "New MR Assigned",
      description: "Sneha Patel assigned to Central Delhi region",
      time: "2 hours ago",
      type: "activity"
    },
    {
      icon: "bi-currency-rupee",
      iconClass: "bg-success",
      title: "Sales Target Achieved",
      description: "Rajesh Kumar achieved 112% of monthly target",
      time: "4 hours ago",
      type: "activity"
    },
    {
      icon: "bi-hospital",
      iconClass: "bg-info",
      title: "Doctor Visit Completed",
      description: "15 doctor visits completed today",
      time: "6 hours ago",
      type: "activity"
    },
    {
      icon: "bi-bell",
      iconClass: "bg-warning",
      title: "Meeting Reminder",
      description: "Team meeting scheduled for tomorrow 10 AM",
      time: "8 hours ago",
      type: "activity"
    },
    {
      icon: "bi-box-seam",
      iconClass: "bg-secondary",
      title: "Sample Stock Updated",
      description: "Diabetex 500mg stock replenished",
      time: "1 day ago",
      type: "activity"
    },
  ];

  const alertsData = [
    {
      icon: "bi-exclamation-triangle",
      iconClass: "bg-danger",
      title: "Low Stock Alert",
      description: "CardioCare 10mg running low in North Delhi",
      type: "urgent",
    },
    {
      icon: "bi-calendar-x",
      iconClass: "bg-warning",
      title: "Pending Approvals",
      description: "12 expense reports awaiting your approval",
      type: "warning",
    },
    {
      icon: "bi-graph-down",
      iconClass: "bg-info",
      title: "Performance Alert",
      description: "Manish Patel below 80% target achievement",
      type: "info",
    },
    {
      icon: "bi-check-circle",
      iconClass: "bg-success",
      title: "Task Completed",
      description: "Monthly report submitted successfully",
      type: "success",
    },
  ];

  // --- Merge ---
  const allNotifications = [...alertsData, ...recentActivities];

  // --- Priority ---
  const priorityOrder = {
    urgent: 5,
    warning: 4,
    info: 3,
    success: 2,
    activity: 1,
  };

  // --- Sort (top priority first) ---
  allNotifications.sort((a, b) => {
    return (priorityOrder[b.type] || 0) - (priorityOrder[a.type] || 0);
  });

  // --- Render inside modal ---
  notificationsList.innerHTML = allNotifications
    .slice(0, 10)
    .map(n => `
      <div class="notification-item p-3 border-bottom">
        <div class="d-flex align-items-start">
          <div class="notification-icon ${n.iconClass} text-white me-3 rounded-circle d-flex align-items-center justify-content-center"
               style="width:40px;height:40px;">
            <i class="bi ${n.icon}"></i>
          </div>
          <div>
            <h6 class="mb-1">${n.title}</h6>
            <p class="mb-1 text-muted small">${n.description}</p>
            <small class="text-muted">${n.time || ""}</small>
          </div>
        </div>
      </div>
    `)
    .join("");
}

