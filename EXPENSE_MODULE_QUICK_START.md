# 🚀 EXPENSE MODULE - QUICK START GUIDE

## ⚡ 3-Step Integration

### Step 1: Run Database Migration
```bash
mysql -u root -p your_database < database/expenses_schema.sql
```

### Step 2: Update HTML Files

**Manager Dashboard** (`Manager-Dashboard/expenses.html`):
```html
<!-- Change line ~450 -->
<script src="assets/js/expenses_api.js"></script>
```

**MR Dashboard** (`MR-Dashboard/expenses.html`):
```html
<!-- Change line ~200 -->
<script src="assets/js/expenses_api.js"></script>
```

### Step 3: Restart & Test
```bash
mvn spring-boot:run
```
Then visit: `http://localhost:8080`

---

## 📋 Quick Test Checklist

### Manager Dashboard
1. ✅ Login as Manager
2. ✅ Go to Expense Management
3. ✅ See all expenses in table
4. ✅ Click "Add Expense" → Select MR → Fill form → Upload receipt → Save
5. ✅ Click ✅ on pending expense → Approve
6. ✅ Click ✖ on pending expense → Enter reason → Reject
7. ✅ Click ✏️ → Edit → Save
8. ✅ Click 🗑️ → Confirm → Delete

### MR Dashboard
1. ✅ Login as MR
2. ✅ Go to Expenses
3. ✅ See only own expenses
4. ✅ Click "Add Expense" → Fill form → Upload receipt → Save
5. ✅ Click ✏️ on pending → Edit → Save
6. ✅ Click 🗑️ on pending → Delete
7. ✅ Verify approved/rejected cannot be edited

---

## 🔌 API Quick Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| Get All | GET | `/api/expenses` |
| Get MR's | GET | `/api/expenses/mr/{name}` |
| Create | POST | `/api/expenses/with-receipt` |
| Update | PUT | `/api/expenses/{id}` |
| Approve | PUT | `/api/expenses/{id}/approve` |
| Reject | PUT | `/api/expenses/{id}/reject` |
| Delete | DELETE | `/api/expenses/{id}` |

---

## 🐛 Common Issues

### "Failed to load expenses"
→ Check JWT token in localStorage: `kavya_auth_token`

### "MR dropdown empty"
→ Verify manager name in localStorage: `signup_name`

### "File upload fails"
→ Check file size < 5MB and type is image/PDF

### "Cannot approve/reject"
→ Verify expense status is PENDING

---

## 📦 What Was Delivered

✅ **Backend**: 7 Java files (Entity, Repository, DTOs, Service, Controller)  
✅ **Frontend**: 2 JavaScript files (Manager + MR dashboards)  
✅ **Database**: 1 SQL schema file  
✅ **Testing**: 1 Postman collection  
✅ **Docs**: 3 comprehensive guides  

**Total**: 13 files

---

## ✅ Success Indicators

When working correctly, you should see:

1. **Manager Dashboard**:
   - Summary cards with real counts (not 0)
   - Table with all MR expenses
   - Filters working
   - Add/Edit/Delete/Approve/Reject all functional

2. **MR Dashboard**:
   - Only own expenses visible
   - Can add new expenses
   - Can edit/delete PENDING only
   - Cannot edit APPROVED/REJECTED

3. **Browser Console**:
   - `[Manager Expenses] Loaded X expenses`
   - `[MR Expenses] Loaded X expenses`
   - No red errors

4. **Network Tab**:
   - `/api/expenses` returns 200 OK
   - Response has array of expenses
   - Authorization header present

---

## 🎯 If Something Doesn't Work

1. **Check Backend**: `mvn spring-boot:run` should show no errors
2. **Check Database**: `SELECT * FROM expenses;` should return data
3. **Check Browser**: F12 → Console → Look for errors
4. **Check Network**: F12 → Network → Look for failed requests
5. **Check Token**: F12 → Application → Local Storage → `kavya_auth_token`

---

## 📞 Need Help?

Refer to these detailed guides:
- `EXPENSE_MODULE_COMPLETE_SUMMARY.md` - Full documentation
- `EXPENSE_MODULE_IMPLEMENTATION_GUIDE.md` - Step-by-step guide
- `postman/Expense_Management_API.postman_collection.json` - API testing

---

**Status**: ✅ READY TO DEPLOY  
**Last Updated**: February 7, 2026
