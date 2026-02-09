-- Migration Script for Role-Based Notification Filtering
-- This script adds the targetRole column to existing notifications table
-- and updates existing notifications with appropriate roles

-- Step 1: Add targetRole column (if not exists)
-- Note: This may already be added by JPA/Hibernate auto-update
ALTER TABLE app_notification 
ADD COLUMN IF NOT EXISTS target_role VARCHAR(50);

-- Step 2: Update existing notifications based on their type
-- Assign MR role to MR-relevant notifications
UPDATE app_notification 
SET target_role = 'MR' 
WHERE type IN ('Task', 'Doctor', 'Expense', 'Visit', 'Target')
  AND target_role IS NULL;

-- Assign MANAGER role to manager-relevant notifications
UPDATE app_notification 
SET target_role = 'MANAGER' 
WHERE type IN ('Report', 'Performance', 'Team')
  AND target_role IS NULL;

-- Assign ADMIN role to admin-only notifications
UPDATE app_notification 
SET target_role = 'ADMIN' 
WHERE type IN ('Info', 'System', 'Success', 'Warning', 'Error')
  AND target_role IS NULL
  AND message LIKE '%Super Admin%';

-- Step 3: Verify the changes
SELECT 
    target_role,
    type,
    COUNT(*) as notification_count
FROM app_notification
GROUP BY target_role, type
ORDER BY target_role, type;

-- Step 4: Check notifications without target_role (will be shown to admins only)
SELECT 
    id,
    title,
    message,
    type,
    target_role,
    recipient_id
FROM app_notification
WHERE target_role IS NULL
ORDER BY date DESC
LIMIT 10;
