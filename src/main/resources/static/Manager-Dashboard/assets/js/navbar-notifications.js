// Notification Loader for MR Dashboard
// Fetches role-based notifications from the API

document.addEventListener('DOMContentLoaded', () => {
    loadNotifications();

    // Refresh notifications every 2 minutes
    setInterval(loadNotifications, 120000);
});

async function loadNotifications() {
    // Support various container IDs used across different dashboards and pages
    const notificationList = document.getElementById('notificationList') ||
        document.getElementById('notificationsContent') ||
        document.getElementById('notificationsList');
    const notificationBadge = document.getElementById('notificationBadge') ||
        document.getElementById('notifyBadge'); // Added alternate badge ID

    if (!notificationList) return;

    // Detect if we are in a dropdown (needs <li>) or a modal/div container
    const isDropdown = notificationList.tagName === 'UL' || notificationList.id === 'notificationList';

    try {
        const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");
        const token = localStorage.getItem('token') || localStorage.getItem('kavya_auth_token');

        const response = await fetch(${API_BASE}/api/notifications', {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch notifications');
        }

        const notifications = await response.json();

        // Filter unread notifications for badge
        const unreadCount = notifications.filter(n => n.status === 'Unread').length;

        // Show/hide badge
        if (unreadCount > 0 && notificationBadge) {
            notificationBadge.style.display = 'block';
            if (notificationBadge.classList.contains('badge')) {
                notificationBadge.innerText = unreadCount > 9 ? '9+' : unreadCount;
            }
        } else if (notificationBadge) {
            notificationBadge.style.display = 'none';
        }

        // Render notifications
        if (notifications.length === 0) {
            const emptyContent = `
                <div class="p-3 text-center text-muted small">
                    <i class="bi bi-inbox me-2"></i>No notifications
                </div>
            `;
            notificationList.innerHTML = isDropdown ? `<li>${emptyContent}</li>` : emptyContent;
        } else {
            // Show only the latest 5 notifications in dropdown, or more in modal
            const maxItems = isDropdown ? 5 : 10;
            const recentNotifications = notifications.slice(0, maxItems);

            notificationList.innerHTML = recentNotifications.map(notification => {
                const icon = getNotificationIcon(notification.type);
                const iconColor = getNotificationColor(notification.type);
                const isUnread = notification.status === 'Unread';

                const itemContent = `
                    <div class="dropdown-item p-3 border-bottom ${isUnread ? 'bg-light' : ''}" style="white-space: normal; cursor: pointer;">
                        <div class="d-flex align-items-start">
                            <div class="flex-shrink-0 mt-1">
                                <i class="bi bi-${icon} ${iconColor} fs-5"></i>
                            </div>
                            <div class="flex-grow-1 ms-3">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <span class="fw-bold small">${notification.type || 'Notification'}</span>
                                    <span class="text-muted" style="font-size: 0.7rem;">${formatDate(notification.date)}</span>
                                </div>
                                <div class="small text-dark">${notification.message}</div>
                                ${isUnread ? '<span class="badge bg-primary mt-1" style="font-size:0.6rem;">New</span>' : ''}
                            </div>
                        </div>
                    </div>
                `;

                return isDropdown ? `<li>${itemContent}</li>` : itemContent;
            }).join('');
        }

    } catch (error) {
        console.error('Error loading notifications:', error);
        const errorContent = `
            <div class="p-3 text-center text-danger small">
                <i class="bi bi-exclamation-triangle me-2"></i>Failed to load notifications
            </div>
        `;
        notificationList.innerHTML = isDropdown ? `<li>${errorContent}</li>` : errorContent;
    }
}

// Helper to format date
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");
        const date = new Date(dateStr);
        const now = new Date();
        const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;

        return date.toLocaleDateString();
    } catch (e) {
        return dateStr;
    }
}

function getNotificationIcon(type) {
    const iconMap = {
        'Info': 'info-circle',
        'Success': 'check-circle',
        'Warning': 'exclamation-triangle',
        'Error': 'x-circle',
        'Task': 'clipboard-check',
        'Doctor': 'person-check',
        'Expense': 'cash-stack',
        'Visit': 'geo-alt',
        'Target': 'bullseye'
    };
    return iconMap[type] || 'bell';
}

function getNotificationColor(type) {
    const colorMap = {
        'Info': 'text-primary',
        'Success': 'text-success',
        'Warning': 'text-warning',
        'Error': 'text-danger',
        'Task': 'text-info',
        'Doctor': 'text-success',
        'Expense': 'text-warning',
        'Visit': 'text-primary',
        'Target': 'text-info'
    };
    return colorMap[type] || 'text-secondary';
}

