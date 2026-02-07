-- Fix MR Assignment Issue
-- This script will help you assign MRs to the current Manager

-- Step 1: Check current Manager's name
-- Replace 'manager@email.com' with your actual manager email
SELECT id, name, email, role 
FROM app_user 
WHERE email = 'manager@email.com';  -- UPDATE THIS EMAIL!

-- Step 2: Check all MR users and their current assignments
SELECT id, name, email, role, assigned_manager 
FROM app_user 
WHERE role = 'MR';

-- Step 3: Assign MRs to the Manager
-- Replace 'ManagerName' with the exact name from Step 1
-- Replace the WHERE clause to select which MRs to assign

-- Option A: Assign ALL MRs to this manager
UPDATE app_user 
SET assigned_manager = 'ManagerName'  -- UPDATE THIS NAME!
WHERE role = 'MR';

-- Option B: Assign specific MRs by their IDs
-- UPDATE app_user 
-- SET assigned_manager = 'ManagerName'  -- UPDATE THIS NAME!
-- WHERE id IN (1, 2, 3);  -- UPDATE THESE IDs!

-- Option C: Assign specific MRs by their names
-- UPDATE app_user 
-- SET assigned_manager = 'ManagerName'  -- UPDATE THIS NAME!
-- WHERE name IN ('MR Name 1', 'MR Name 2');  -- UPDATE THESE NAMES!

-- Step 4: Verify the assignments
SELECT id, name, email, role, assigned_manager 
FROM app_user 
WHERE role = 'MR';

-- Step 5: Check if DCRs exist for these MRs
SELECT d.report_id, d.visit_title, d.mr_name, d.date_time
FROM app_dcr d
WHERE d.mr_name IN (
    SELECT name FROM app_user WHERE role = 'MR' AND assigned_manager = 'ManagerName'  -- UPDATE THIS NAME!
)
ORDER BY d.report_id DESC
LIMIT 10;
