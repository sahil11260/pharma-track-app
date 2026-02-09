// Notification Loader for MR Dashboard
// Fetches role-based notifications from the API

document.addEventListener('DOMContentLoaded', () => {
    loadNotifications();

    // Refresh notifications every 2 minutes
    setInterval(loadNotifications, 120000);
});

async function loadNotifications() {
    // Support both container IDs used across different pages
    const notificationList = document.getElementById('notificationList') || document.getElementById('notificationsContent');
    const notificationBadge = document.getElementById('notificationBadge');

    if (!notificationList) return;

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('kavya_auth_token');

        const response = await fetch('/api/notifications', {
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
        } else if (notificationBadge) {
            notificationBadge.style.display = 'none';
        }

        // Render notifications
        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="dropdown-item small text-center text-muted">
                    <i class="bi bi-inbox me-2"></i>No notifications
                </div>
            `;
        } else {
            // Show only the latest 5 notifications
            const recentNotifications = notifications.slice(0, 5);

            notificationList.innerHTML = recentNotifications.map(notification => {
                const icon = getNotificationIcon(notification.type);
                const iconColor = getNotificationColor(notification.type);

                return `
                    <li>
                        <div class="dropdown-item small ${notification.status === 'Unread' ? 'fw-bold' : ''}">
                            <i class="bi bi-${icon} ${iconColor} me-2"></i>
                            ${notification.message}
                            ${notification.status === 'Unread' ? '<span class="badge bg-primary ms-1" style="font-size:0.6rem;">New</span>' : ''}
                        </div>
                    </li>
                `;
            }).join('');
        }

    } catch (error) {
        console.error('Error loading notifications:', error);
        notificationList.innerHTML = `
            <div class="dropdown-item small text-center text-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>Failed to load
            </div>
        `;
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
