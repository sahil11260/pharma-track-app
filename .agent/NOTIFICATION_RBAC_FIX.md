# Role-Based Notification Filtering - Implementation Summary

## Bug Fixed
**Bug Name:** MR can see irrelevant notifications meant for Super Admin / Admin

**Module:** Notifications → MR Portal (Header / Profile Settings page)

**Severity:** Medium | **Priority:** High

## Problem Description
Medical Representatives (MRs) were able to see system-level notifications meant for Admin/Super Admin roles, such as "New doctor added by Super Admin". This violated role-based access control (RBAC) principles and caused user confusion.

## Solution Implemented

### 1. Backend Changes

#### A. Database Schema Update
**File:** `Notification.java` (Model)
- Added `targetRole` field (nullable String)
- Purpose: Specify which role(s) should see the notification (ADMIN, MANAGER, MR)

#### B. DTO Updates
**Files Modified:**
- `NotificationResponse.java` - Added `targetRole` field
- `CreateNotificationRequest.java` - Added `targetRole` field
- `UpdateNotificationRequest.java` - Added `targetRole` field

#### C. Service Layer - Role-Based Filtering
**File:** `NotificationService.java`

**Key Changes:**
1. **Injected UserRepository** to fetch user details
2. **Added `list()` method filtering logic:**
   - Extracts current user's role from SecurityContext
   - Filters notifications based on three criteria:
     - **Specific Recipient:** If `recipientId` is set, show only to that user
     - **Role-Based:** If `targetRole` is set, show only to users with that role
     - **Default:** If neither is set, show only to ADMIN/SUPERADMIN

3. **Helper Methods:**
   - `isNotificationVisibleToUser()` - Determines if notification should be shown
   - `getUserIdFromUsername()` - Fetches user ID from email/username

**Filtering Logic:**
```java
private boolean isNotificationVisibleToUser(Notification notification, String userRole, Long userId) {
    // 1. Check specific recipient
    if (notification.getRecipientId() != null) {
        return notification.getRecipientId().equals(userId);
    }
    
    // 2. Check role-based targeting
    if (notification.getTargetRole() != null && !notification.getTargetRole().isBlank()) {
        return notification.getTargetRole().equalsIgnoreCase(userRole);
    }
    
    // 3. Default: Show to admins only
    return "ADMIN".equalsIgnoreCase(userRole) || "SUPERADMIN".equalsIgnoreCase(userRole);
}
```

### 2. Frontend Changes

#### A. MR Dashboard - Profile.html
**Changes:**
- Removed hardcoded notification items
- Added dynamic notification container with ID `notificationList`
- Added notification badge with ID `notificationBadge` (hidden by default)
- Badge shows only when there are unread notifications

**Before:**
```html
<li>
  <div class="dropdown-item small">
    <i class="bi bi-info-circle text-primary me-2"></i>
    New doctor added by Super Admin
  </div>
</li>
```

**After:**
```html
<li id="notificationList">
  <div class="dropdown-item small text-center text-muted">
    <i class="bi bi-hourglass-split me-2"></i>Loading...
  </div>
</li>
```

#### B. JavaScript - notifications.js
**File Created:** `MR-Dashboard/assets/js/notifications.js`

**Features:**
1. **Dynamic Loading:**
   - Fetches notifications from `/api/notifications`
   - Uses JWT token from localStorage for authentication
   - Backend automatically filters by user role

2. **Auto-Refresh:**
   - Refreshes every 2 minutes (120000ms)
   - Keeps notifications up-to-date

3. **Visual Indicators:**
   - Shows red badge when unread notifications exist
   - Displays "New" badge on unread items
   - Bold text for unread notifications

4. **Icon Mapping:**
   - Different icons for different notification types
   - Color-coded by type (Info=blue, Success=green, Warning=yellow, etc.)

5. **Error Handling:**
   - Shows "Failed to load" message on API errors
   - Shows "No notifications" when list is empty

**Notification Types Supported:**
- Info (blue) - General information
- Success (green) - Successful operations
- Warning (yellow) - Warnings
- Error (red) - Errors
- Task (info) - Task assignments
- Doctor (success) - Doctor-related
- Expense (warning) - Expense updates
- Visit (primary) - Visit reports
- Target (info) - Sales targets

## How It Works

### For MR Users:
1. MR logs in with role "MR"
2. Opens notification dropdown
3. JavaScript calls `/api/notifications`
4. Backend filters notifications:
   - Shows notifications with `targetRole = "MR"`
   - Shows notifications with `recipientId = {MR's userId}`
   - Hides admin-only notifications
5. Only relevant notifications are displayed

### For Admin Users:
1. Admin logs in with role "ADMIN" or "SUPERADMIN"
2. Opens notification dropdown
3. Backend shows:
   - All admin-targeted notifications
   - All notifications without specific role/recipient
   - Notifications specifically sent to them

### For Manager Users:
1. Manager logs in with role "MANAGER"
2. Backend shows:
   - Notifications with `targetRole = "MANAGER"`
   - Notifications with `recipientId = {Manager's userId}`

## Creating Role-Based Notifications

### Example 1: Notification for All MRs
```json
POST /api/notifications
{
  "title": "New Target Assigned",
  "message": "Your monthly sales target has been updated",
  "type": "Target",
  "targetRole": "MR",
  "status": "Unread",
  "priority": "High"
}
```

### Example 2: Notification for Specific User
```json
POST /api/notifications
{
  "title": "Expense Approved",
  "message": "Your expense claim #123 has been approved",
  "type": "Expense",
  "recipientId": 5,
  "status": "Unread",
  "priority": "Normal"
}
```

### Example 3: Admin-Only Notification
```json
POST /api/notifications
{
  "title": "New Doctor Added",
  "message": "Dr. Smith has been added to the system",
  "type": "Info",
  "targetRole": "ADMIN",
  "status": "Unread",
  "priority": "Normal"
}
```

## Files Modified

### Backend:
1. `Notification.java` - Added `targetRole` field
2. `NotificationResponse.java` - Updated DTO
3. `CreateNotificationRequest.java` - Updated DTO
4. `UpdateNotificationRequest.java` - Updated DTO
5. `NotificationService.java` - Added role-based filtering logic

### Frontend (MR Dashboard):
1. `Profile.html` - Updated notification dropdown
2. `notifications.js` - Created dynamic loader

## Testing Steps

### Test 1: MR Should NOT See Admin Notifications
1. Login as Admin
2. Create notification with `targetRole = "ADMIN"`
3. Logout and login as MR
4. Check notifications dropdown
5. **Expected:** Admin notification should NOT appear

### Test 2: MR Should See MR Notifications
1. Login as Admin
2. Create notification with `targetRole = "MR"`
3. Logout and login as MR
4. Check notifications dropdown
5. **Expected:** MR notification SHOULD appear

### Test 3: Specific User Notifications
1. Login as Admin
2. Create notification with `recipientId = {specific MR's ID}`
3. Logout and login as that specific MR
4. **Expected:** Notification SHOULD appear
5. Login as different MR
6. **Expected:** Notification should NOT appear

### Test 4: Badge Visibility
1. Create unread notification for MR
2. Login as MR
3. **Expected:** Red badge should appear on bell icon
4. Mark all as read
5. **Expected:** Badge should disappear

## Database Migration Note

If you have existing notifications in the database, they will:
- Show to ADMIN/SUPERADMIN only (since `targetRole` is null)
- To make them visible to MRs, update the database:

```sql
UPDATE app_notification 
SET target_role = 'MR' 
WHERE type IN ('Task', 'Doctor', 'Expense', 'Visit');
```

## Next Steps (Optional Enhancements)

1. **Apply to All MR Pages:**
   - Update `index.html`, `attendance.html`, `expenses.html`, etc.
   - Add `<script src="assets/js/notifications.js"></script>` to each page

2. **Mark as Read Functionality:**
   - Add click handler to mark notifications as read
   - Update badge count in real-time

3. **Manager Dashboard:**
   - Apply same changes to Manager Dashboard
   - Filter notifications for MANAGER role

4. **Notification Center Page:**
   - Create dedicated page to view all notifications
   - Add pagination and search

## Impact

✅ **Security:** Admin-level information no longer exposed to MRs  
✅ **UX:** MRs see only relevant notifications  
✅ **RBAC:** Proper role-based access control implemented  
✅ **Scalability:** Easy to add new notification types and roles  
✅ **Maintainability:** Centralized filtering logic in backend
