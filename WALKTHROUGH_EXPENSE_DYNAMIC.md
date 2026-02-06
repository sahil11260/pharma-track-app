# 🧪 TEST WALKTHROUGH: DYNAMIC EXPENSE MODULE

The Expense Module is now **LIVE** and connected to the backend API! Follow these steps to verify it:

## 1. Refresh & Login
- Open `http://localhost:8080` in your browser.
- Login as a **Manager** (e.g., Priya Sharma or your registered account).
- Login as an **MR** (e.g., Rajesh Kumar) in a separate incognito window.

## 2. Test MR Dashboard (Submission)
1. Navigate to **Expenses**.
2. Click **Add Expense**.
3. Fill in the details (Category: Travel, Amount: 1500, Date: Today).
4. **Choose a file** (Receipt PDF or Image).
5. Click **Save Expense**.
6. **Verify**: The new expense should appear in the table with status **Pending**.

## 3. Test Manager Dashboard (Approval)
1. Navigate to **Expense Management**.
2. **Verify**: You should see the expense submitted by the MR.
3. Observe the **Summary Cards**: The "Pending" count and "Total Amount" should have increased.
4. Click the **✅ (Approve)** button on the MR's expense.
5. **Verify**: The status changes to **Approved** and summary cards update.

## 4. Test Edit/Delete (Boundaries)
1. In the **MR Dashboard**, try to **Edit** the approved expense.
   - **Expected**: The Edit button is disabled because the expense is already approved.
2. Submit a *new* expense as an MR.
3. While it's **Pending**, click the **✏️ (Edit)** button.
4. Change the amount and click **Update**.
5. **Verify**: The amount updates dynamically in the table.

---

## 🛠️ TROUBLESHOOTING

- **No data appearing?** Open browser console (F12) and look for `[Manager Expenses] Loaded X expenses`. If you see a `401 Unauthorized` error, try logging out and logging back in to refresh your JWT token.
- **File upload error?** Ensure the file size is under 5MB and is an image or PDF.
- **Port 8080 issues?** If the app stops, run `netstat -ano | findstr :8080` to find the and kill the PID again.

---

## ✅ WHAT WE JUST ACCOMPLISHED

1. **Started the Backend**: Terminated existing processes and cleared Port 8080.
2. **Setup Database**: Verified the `expenses` table matches the entity model.
3. **Wired Frontend**: Replaced static `expenses.js` with dynamic `expenses_api.js` in all dashboards.
4. **Synced IDs**: Updated the JavaScript to match your existing HTML button IDs (`saveExpenseBtn`, `updateExpenseBtn`) to perfectly preserve your UI.
5. **Integrated Auth**: All API calls now automatically include your `kavya_auth_token` for secure requests.

**Enjoy your now-dynamic Pharma Track app!** 🚀
