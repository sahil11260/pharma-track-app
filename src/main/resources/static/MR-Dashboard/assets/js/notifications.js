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

    if (isDropdown || notificationList.id === 'notificationsContent') {
        notificationList.style.maxHeight = '300px';
        notificationList.style.overflowY = 'auto';
        notificationList.style.overflowX = 'hidden';
    }

    const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('kavya_auth_token');

        const response = await fetch(`${API_BASE}/api/notifications`, {
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
            
            // Always show count number instead of dot
            if (unreadCount > 99) {
                notificationBadge.innerText = '99+';
                notificationBadge.style.fontSize = '0.6rem';
                notificationBadge.style.padding = '0.2rem 0.4rem';
            } else if (unreadCount > 9) {
                notificationBadge.innerText = unreadCount.toString();
                notificationBadge.style.fontSize = '0.7rem';
                notificationBadge.style.padding = '0.2rem 0.3rem';
            } else {
                notificationBadge.innerText = unreadCount.toString();
                notificationBadge.style.fontSize = '0.75rem';
                notificationBadge.style.padding = '0.2rem 0.3rem';
            }
            
            // Ensure badge has proper styling for count display
            notificationBadge.style.minWidth = '1.5rem';
            notificationBadge.style.height = '1.5rem';
            notificationBadge.style.borderRadius = '50%';
            notificationBadge.style.display = 'flex';
            notificationBadge.style.alignItems = 'center';
            notificationBadge.style.justifyContent = 'center';
            notificationBadge.style.color = 'white';
            notificationBadge.style.fontWeight = 'bold';
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
            // Show only the latest 30 notifications in dropdown, or more in modal
            const maxItems = isDropdown ? 30 : 50;
            const recentNotifications = notifications.slice(0, maxItems);

            notificationList.innerHTML = recentNotifications.map((notification, index) => {
                const icon = getNotificationIcon(notification.type);
                const iconColor = getNotificationColor(notification.type);
                const isUnread = notification.status === 'Unread';

                const itemContent = `
                    <div class="dropdown-item p-3 border-bottom ${isUnread ? 'bg-light' : ''}" 
                         style="white-space: normal; cursor: pointer;" 
                         data-notification-id="${notification.id || index}"
                         onclick="markNotificationAsRead('${notification.id || index}', this)">
                        <div class="d-flex align-items-start">
                            <div class="flex-shrink-0 mt-1">
                                <i class="bi bi-${icon} ${iconColor} fs-5"></i>
                            </div>
                            <div class="flex-grow-1 ms-3">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <span class="fw-bold small">${notification.type || 'Notification'}</span>
                                    <span class="text-muted" style="font-size: 0.7rem;">${formatNotificationDate(notification.date)}</span>
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
function formatNotificationDate(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays > 1 && diffInDays < 7) return `${diffInDays} days ago`;

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

// Function to mark notification as read
window.markNotificationAsRead = async function(notificationId, element) {
    try {
        const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");
        const token = localStorage.getItem('token') || localStorage.getItem('kavya_auth_token');

        // Call API to mark as read
        await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            }
        });

        // Update UI immediately
        element.classList.remove('bg-light');
        const badge = element.querySelector('.badge');
        if (badge) {
            badge.remove();
        }

        // Reload notifications to update badge count
        setTimeout(() => {
            loadNotifications();
        }, 500);

    } catch (error) {
        console.error('Error marking notification as read:', error);
        // Still update UI even if API fails
        element.classList.remove('bg-light');
        const badge = element.querySelector('.badge');
        if (badge) {
            badge.remove();
        }
    }
};
