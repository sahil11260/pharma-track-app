-- SIMPLE FIX: Copy and paste these commands into MySQL Workbench

-- Step 1: See all managers
SELECT name, email FROM app_user WHERE role = 'Manager';

-- Step 2: See all MRs
SELECT name, email, assigned_manager FROM app_user WHERE role = 'MR';

-- Step 3: COPY THE MANAGER NAME FROM STEP 1, then run this:
-- (Replace 'MANAGER_NAME_HERE' with the actual manager name)
UPDATE app_user 
SET assigned_manager = 'MANAGER_NAME_HERE'
WHERE role = 'MR';

-- Step 4: Check if it worked
SELECT name, assigned_manager FROM app_user WHERE role = 'MR';
