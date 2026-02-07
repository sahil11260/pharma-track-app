# Expense Card Debugging Guide

## What I've Added

### Backend Logging (MrDashboardService.java)
The backend will now log:
- Total number of expenses found
- Each expense's ID, amount, and status
- Final pending and approved totals

### Frontend Logging (index.js v5)
The frontend will now log:
- The complete API response data
- Whether the expense elements are found in the DOM
- The exact values being set for pending and approved expenses

## How to Debug

### Step 1: Restart the Application
Since we modified Java code, you need to restart:
1. Stop the current Spring Boot process (Ctrl+C in terminal)
2. Run: `mvn spring-boot:run`
3. Wait for "Started FarmaTrackBackendApplication"

### Step 2: Hard Refresh the Browser
1. Open: http://localhost:8080/MR-Dashboard/index.html
2. Press `Ctrl + Shift + R` (hard refresh to clear cache)
3. Make sure you see `index.js?v=5` in the Network tab

### Step 3: Check Backend Terminal
Look for lines like:
```
[MR-DASHBOARD] Current MR Name: <your name>
[MR-DASHBOARD] Visits count for <your name>: 1
[MR-DASHBOARD] Total expenses found: X
[MR-DASHBOARD]   Expense ID: 123, Amount: 500.0, Status: 'Pending'
[MR-DASHBOARD] Expenses - Pending: 500.0, Approved: 0.0
[MR-DASHBOARD] Returning response: MrDashboardResponse[...]
```

### Step 4: Check Browser Console (F12)
Look for lines like:
```
[MR-DASH] renderSummary called with data: {sales: 0, targetPercent: 0, visits: 1, expensesPending: 500, expensesApproved: 0}
[MR-DASH] Element check:
  - elVisits: found
  - elExpPending: found
  - elExpApproved: found
[MR-DASH] Set visits to: 1
[MR-DASH] Set expensesPending to: ₹500 (raw: 500)
[MR-DASH] Set expensesApproved to: ₹0 (raw: 0)
```

## Common Issues

### Issue 1: Backend shows "Total expenses found: 0"
**Problem**: No expenses in database OR mrName doesn't match
**Solution**: 
- Check SQL: `SELECT * FROM app_mr_expense WHERE mr_name = '<your name>';`
- Verify the mrName field is set correctly when creating expenses

### Issue 2: Backend shows expenses but frontend shows "NOT FOUND"
**Problem**: HTML element IDs are wrong
**Solution**: 
- Check if IDs in index.html match:
  - `id="dashExpensesPending"`
  - `id="dashExpensesApproved"`

### Issue 3: Elements found but values still show ₹0
**Problem**: API response has wrong field names
**Solution**: 
- Check the console log shows the correct field names
- Verify backend returns `expensesPending` not `pending`

### Issue 4: Status field has extra spaces/characters
**Problem**: Database has ' Pending ' instead of 'Pending'
**Solution**:
- Backend logs will show: `Status: ' Pending '` (note the quotes)
- Update database: `UPDATE app_mr_expense SET status = TRIM(status);`

## What to Share

After following the steps above, please share:
1. **Backend logs** - the [MR-DASHBOARD] lines
2. **Browser console logs** - the [MR-DASH] lines
3. **Network tab** - the JSON response from /api/mr-dashboard
4. **Screenshot** - of the expense card

This will help me identify the exact issue!
