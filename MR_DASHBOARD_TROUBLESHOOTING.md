# MR Dashboard Troubleshooting Guide

## Problem
The MR Dashboard cards are showing 0 values even though there are DCR entries in the database.

## What We Fixed
1. ✅ Removed the `update()` method call from MrDashboardController (it didn't exist in the service)
2. ✅ Removed the `saveDashboard()` function from index.js (no longer needed)
3. ✅ Removed the `window._mrUpdate()` helper (dashboard is now read-only)
4. ✅ Removed the undefined `loadTasks()` call
5. ✅ Added debug logging to MrDashboardService to track API calls

## How to Test and Debug

### Step 1: Clear Browser Cache
1. Open the MR Dashboard in your browser: http://localhost:8080/MR-Dashboard/index.html
2. Press `Ctrl + Shift + Delete` to open Clear Browsing Data
3. Select "Cached images and files" and clear it
4. Refresh the page with `Ctrl + F5` (hard refresh)

### Step 2: Check Browser Console
1. Press `F12` to open Developer Tools
2. Go to the "Console" tab
3. Look for:
   - `[MR-DASH] Initializing MR Dashboard script`
   - `[MR-DASH] MR Dashboard ready.`
   - Any errors (shown in red)

### Step 3: Check Network Tab
1. In Developer Tools, go to the "Network" tab
2. Refresh the page
3. Look for a request to `/api/mr-dashboard`
4. Click on it and check:
   - **Status**: Should be 200 (not 401, 403, or 500)
   - **Response**: Should show JSON like:
     ```json
     {
       "sales": 0.0,
       "targetPercent": 0,
       "visits": 1,
       "expensesPending": 0.0,
       "expensesApproved": 0.0
     }
     ```

### Step 4: Check Backend Logs
In the terminal where Spring Boot is running, look for lines like:
```
[MR-DASHBOARD] Current MR Name: <name>
[MR-DASHBOARD] Visits count for <name>: <number>
[MR-DASHBOARD] Expenses - Pending: <amount>, Approved: <amount>
[MR-DASHBOARD] Returning response: MrDashboardResponse[...]
```

## Common Issues and Solutions

### Issue 1: API Returns 401/403 (Unauthorized)
**Cause**: User is not logged in or JWT token is invalid
**Solution**: 
- Log out and log back in
- Check localStorage for `kavya_auth_token`

### Issue 2: API Returns 200 but visits = 0
**Cause**: MR name mismatch between user and DCR records
**Solution**:
1. Check the backend logs for: `[MR-DASHBOARD] Current MR Name: <name>`
2. Run this SQL query to see what MR names exist in DCR:
   ```sql
   SELECT DISTINCT mr_name FROM app_dcr;
   ```
3. The names must match exactly (case-insensitive)

### Issue 3: Cards Still Show 0 After API Returns Data
**Cause**: JavaScript not updating the DOM
**Solution**:
1. Check browser console for JavaScript errors
2. Verify the element IDs exist:
   - `dashVisits`
   - `dashExpensesPending`
   - `dashExpensesApproved`
3. Check if `index.js?v=3` is loaded (cache busting)

### Issue 4: No Data in Database
**Cause**: No DCR entries have been submitted
**Solution**:
1. Go to "Submit Visit Report (DCR)" in the MR Dashboard
2. Add a new DCR entry
3. Refresh the dashboard

## Manual Database Check

Run these SQL queries in MySQL:

```sql
-- Check total DCRs
SELECT COUNT(*) as total_dcrs FROM app_dcr;

-- Check DCRs by MR name
SELECT mr_name, COUNT(*) as count FROM app_dcr GROUP BY mr_name;

-- Check user names
SELECT id, name, email, role FROM app_user WHERE role = 'MR';

-- Check if mr_name in DCR matches user name
SELECT 
    u.name as user_name,
    u.email,
    COUNT(d.report_id) as dcr_count
FROM app_user u
LEFT JOIN app_dcr d ON LOWER(u.name) = LOWER(d.mr_name)
WHERE u.role = 'MR'
GROUP BY u.id, u.name, u.email;
```

## Expected Behavior

When everything is working:
1. User logs in as MR
2. Dashboard loads and calls `/api/mr-dashboard`
3. Backend:
   - Gets the logged-in user's name from JWT token
   - Queries DCR table for records where `mr_name` matches
   - Queries expenses table for records where `mr_name` matches
   - Returns the counts and totals
4. Frontend:
   - Receives the JSON response
   - Updates the card values using `renderSummary()`
5. Cards display the actual numbers

## Next Steps

1. **Test in Browser**: Follow Steps 1-4 above
2. **Check Logs**: Look at both browser console and backend terminal
3. **Verify Data**: Run the SQL queries to confirm data exists
4. **Report Back**: Share what you find:
   - API response from Network tab
   - Backend log output
   - Any console errors
   - SQL query results

This will help us identify the exact issue!
