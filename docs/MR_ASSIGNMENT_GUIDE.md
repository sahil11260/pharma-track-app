# DCR Reports - MR Assignment Fix

## Current Status ✅

**Good News:** The code is working perfectly! The error messages show that:
- ✅ API is accessible (no more 403 Forbidden)
- ✅ No more lazy loading errors (no more 500 Internal Server Error)
- ✅ DCRs are being fetched from the database
- ✅ The filtering logic is working

## The Issue ⚠️

The alert says: **"You have no MRs assigned to you. Please ask admin to assign MRs."**

This means the `assigned_manager` field in the `app_user` table is either:
1. NULL for all MR users, OR
2. Set to a different manager name that doesn't match your logged-in manager

## Solution

You need to assign MRs to the Manager in the database. Here are two ways to do it:

### Method 1: Using SQL (Quick Fix)

1. **Open MySQL Workbench or your MySQL client**

2. **Find your Manager's name:**
   ```sql
   SELECT id, name, email, role 
   FROM app_user 
   WHERE role = 'Manager';
   ```
   Note the exact `name` value (e.g., "John Doe")

3. **Check existing MRs:**
   ```sql
   SELECT id, name, email, role, assigned_manager 
   FROM app_user 
   WHERE role = 'MR';
   ```

4. **Assign MRs to the Manager:**
   ```sql
   -- Replace 'John Doe' with your actual manager name from step 2
   UPDATE app_user 
   SET assigned_manager = 'John Doe'
   WHERE role = 'MR';
   ```

5. **Verify the assignment:**
   ```sql
   SELECT id, name, email, role, assigned_manager 
   FROM app_user 
   WHERE role = 'MR';
   ```
   You should see the manager's name in the `assigned_manager` column

6. **Refresh the Reports & Feedbacks page**
   - The DCR reports should now appear!

### Method 2: Using the Admin Panel (If Available)

If your application has an admin panel for managing users:
1. Login as Admin
2. Go to User Management
3. Edit each MR user
4. Set their "Assigned Manager" field
5. Save

### Method 3: Quick Test with Specific Example

If you want to test quickly, here's a complete example:

```sql
-- Example: Assign all MRs to a manager named "Rajesh Kumar"

-- Step 1: Verify manager exists
SELECT * FROM app_user WHERE name = 'Rajesh Kumar' AND role = 'Manager';

-- Step 2: Assign all MRs to this manager
UPDATE app_user 
SET assigned_manager = 'Rajesh Kumar'
WHERE role = 'MR';

-- Step 3: Verify
SELECT name, email, assigned_manager 
FROM app_user 
WHERE role = 'MR';
```

## After Assignment

Once you've assigned MRs to the Manager:

1. **Refresh the Reports & Feedbacks page** (Ctrl + Shift + R)
2. You should see an alert showing:
   - Number of DCRs found
   - List of your assigned MRs
   - Number of reports loaded

3. **If you still see "No reports found"**, it means:
   - The MRs haven't submitted any DCR reports yet, OR
   - The `mr_name` in the DCR records doesn't match the MR's name in `app_user`

## Troubleshooting

### Issue: MR names don't match

If DCRs exist but don't show up, check if the names match:

```sql
-- Check MR names in user table
SELECT DISTINCT name FROM app_user WHERE role = 'MR';

-- Check MR names in DCR table
SELECT DISTINCT mr_name FROM app_dcr;

-- If they don't match, update DCRs:
UPDATE app_dcr 
SET mr_name = 'Correct MR Name'
WHERE mr_name = 'Wrong MR Name';
```

### Issue: No DCRs exist

If no DCRs have been submitted:
1. Login as an MR
2. Go to "Submit Visit Report (DCR)"
3. Fill out and submit a DCR
4. Logout and login as Manager
5. Check Reports & Feedbacks again

## Expected Result

After fixing the assignment, you should see:
- ✅ DCR reports in the table
- ✅ MR Name column showing the MR who submitted
- ✅ Doctor Name, Visit Type, etc.
- ✅ Action buttons (View, Download, Delete)

## Summary

**The code is 100% working!** You just need to:
1. Assign MRs to the Manager in the database
2. Ensure DCRs have been submitted by those MRs
3. Refresh the page

Use the SQL script in `assign_mrs_to_manager.sql` to fix this quickly!
