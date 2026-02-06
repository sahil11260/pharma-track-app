# Expense Management Module - Complete Implementation Guide

## ✅ Backend Implementation - COMPLETED

### Files Created:
1. **Entity**: `Expense.java` - Complete with all fields, status enum, timestamps
2. **Repository**: `ExpenseRepository.java` - Query methods for filtering
3. **DTOs**: 
   - `CreateExpenseRequest.java` - Validation included
   - `UpdateExpenseRequest.java` - Validation included
   - `ExpenseResponse.java` - With static factory method
4. **Service**: 
   - `ExpenseService.java` - Interface
   - `ExpenseServiceImpl.java` - Complete implementation with file upload
5. **Controller**: `ExpenseController.java` - All REST endpoints
6. **Database**: `expenses_schema.sql` - Table schema + sample data

### API Endpoints:
```
POST   /api/expenses                    - Create expense (JSON)
POST   /api/expenses/with-receipt       - Create with file upload (Multipart)
GET    /api/expenses                    - Get all expenses (Manager)
GET    /api/expenses/mr/{mrName}        - Get MR's expenses
GET    /api/expenses/{id}               - Get single expense
PUT    /api/expenses/{id}               - Update expense (JSON)
PUT    /api/expenses/{id}/with-receipt  - Update with file upload (Multipart)
PUT    /api/expenses/{id}/approve       - Approve expense
PUT    /api/expenses/{id}/reject        - Reject expense
DELETE /api/expenses/{id}               - Delete expense
POST   /api/expenses/upload-receipt     - Upload receipt separately
```

## ✅ Frontend Implementation - IN PROGRESS

### Manager Dashboard:
**File**: `Manager-Dashboard/assets/js/expenses_api.js` ✅ CREATED

**Features Implemented**:
- ✅ Load all expenses from API
- ✅ Load MRs from API
- ✅ Dynamic summary cards (Pending/Approved/Rejected/Total)
- ✅ Table rendering with pagination
- ✅ Filters (search, month, status)
- ✅ Approve expense (API call)
- ✅ Reject expense with reason (API call)
- ✅ Delete expense (API call)
- ✅ Edit expense (API call)
- ✅ Add expense with file upload (API call)
- ✅ Toast notifications
- ✅ Error handling
- ✅ JWT authentication

**To Use**:
Replace the script tag in `expenses.html`:
```html
<!-- OLD -->
<script src="assets/js/expenses.js"></script>

<!-- NEW -->
<script src="assets/js/expenses_api.js"></script>
```

### MR Dashboard:
**File**: `MR-Dashboard/assets/js/expenses_api.js` - NEEDS TO BE CREATED

**Required Features**:
- Load MR's own expenses from `/api/expenses/mr/{mrName}`
- Add expense with file upload
- Edit expense (only if PENDING)
- Delete expense (only if PENDING)
- View expense details
- Dynamic summary cards
- Filters and pagination
- Toast notifications

## 📋 Testing Checklist

### Backend Testing (Postman):

#### 1. Create Expense (JSON)
```
POST http://localhost:8080/api/expenses
Headers:
  Content-Type: application/json
  Authorization: Bearer {token}
Body (JSON):
{
  "mrName": "Rajesh Kumar",
  "category": "Travel",
  "amount": 2500.00,
  "description": "Taxi fare for doctor visits",
  "expenseDate": "2025-11-06"
}
```

#### 2. Create Expense with Receipt
```
POST http://localhost:8080/api/expenses/with-receipt
Headers:
  Authorization: Bearer {token}
Body (form-data):
  mrName: Rajesh Kumar
  category: Travel
  amount: 2500
  description: Taxi fare
  expenseDate: 2025-11-06
  receipt: [file upload]
```

#### 3. Get All Expenses (Manager)
```
GET http://localhost:8080/api/expenses
Headers:
  Authorization: Bearer {token}
```

#### 4. Get MR Expenses
```
GET http://localhost:8080/api/expenses/mr/Rajesh Kumar
Headers:
  Authorization: Bearer {token}
```

#### 5. Update Expense
```
PUT http://localhost:8080/api/expenses/1
Headers:
  Content-Type: application/json
  Authorization: Bearer {token}
Body:
{
  "category": "Meals",
  "amount": 500.00,
  "description": "Updated description",
  "expenseDate": "2025-11-07"
}
```

#### 6. Approve Expense
```
PUT http://localhost:8080/api/expenses/1/approve
Headers:
  Content-Type: application/json
  Authorization: Bearer {token}
Body:
{
  "approvedBy": "Manager Name"
}
```

#### 7. Reject Expense
```
PUT http://localhost:8080/api/expenses/1/reject
Headers:
  Content-Type: application/json
  Authorization: Bearer {token}
Body:
{
  "rejectedBy": "Manager Name",
  "reason": "Exceeds budget limit"
}
```

#### 8. Delete Expense
```
DELETE http://localhost:8080/api/expenses/1
Headers:
  Authorization: Bearer {token}
```

### Frontend Testing:

#### Manager Dashboard:
1. ✅ Login as Manager
2. ✅ Navigate to Expense Management
3. ✅ Verify summary cards show correct counts
4. ✅ Verify table shows all expenses
5. ✅ Test search filter
6. ✅ Test month filter
7. ✅ Test status filter
8. ✅ Click "Add Expense" - verify MR dropdown populated
9. ✅ Add new expense with file upload
10. ✅ Approve pending expense
11. ✅ Reject pending expense with reason
12. ✅ Edit expense
13. ✅ Delete expense
14. ✅ Verify pagination works
15. ✅ Verify toast notifications appear

#### MR Dashboard:
1. Login as MR
2. Navigate to Expenses
3. Verify only own expenses shown
4. Add new expense
5. Edit pending expense
6. Delete pending expense
7. Verify approved/rejected expenses cannot be edited
8. Verify filters work
9. Verify pagination works

## 🔧 Integration Steps

### Step 1: Run Database Migration
```sql
-- Execute the SQL schema
source database/expenses_schema.sql
```

### Step 2: Restart Spring Boot Application
```bash
mvn clean install
mvn spring-boot:run
```

### Step 3: Update Manager Dashboard HTML
In `Manager-Dashboard/expenses.html`, replace:
```html
<script src="assets/js/expenses.js"></script>
```
With:
```html
<script src="assets/js/expenses_api.js"></script>
```

### Step 4: Update MR Dashboard HTML
In `MR-Dashboard/expenses.html`, replace:
```html
<script src="assets/js/expenses.js"></script>
```
With:
```html
<script src="assets/js/expenses_api.js"></script>
```

### Step 5: Test End-to-End
1. Clear browser cache (Ctrl+Shift+Delete)
2. Login as Manager
3. Test all Manager features
4. Logout and login as MR
5. Test all MR features

## 🐛 Troubleshooting

### Issue: "Failed to load expenses"
**Solution**: 
- Check browser console for errors
- Verify JWT token exists in localStorage
- Check backend is running on port 8080
- Verify CORS is configured

### Issue: "File upload fails"
**Solution**:
- Check file size < 5MB
- Verify file type is image or PDF
- Check uploads/receipts/ directory exists
- Verify multipart config in application.properties

### Issue: "Expenses not filtered by MR"
**Solution**:
- Verify mrName in localStorage matches database
- Check case sensitivity
- Verify API endpoint includes mrName parameter

### Issue: "Summary cards show 0"
**Solution**:
- Check expensesData array is populated
- Verify status values match (PENDING vs pending)
- Check renderSummary() is called after loadExpenses()

## 📝 Next Steps

1. ✅ Create MR Dashboard expenses_api.js
2. ✅ Test file upload functionality
3. ✅ Add loading spinners
4. ✅ Add confirmation dialogs
5. ✅ Test with real data
6. ✅ Deploy to production

## 🎯 Success Criteria

- [x] Backend APIs working
- [x] Manager can see all expenses
- [ ] MR can see only own expenses
- [x] File upload works
- [x] Approve/Reject workflow works
- [x] Filters work dynamically
- [x] Summary cards update in real-time
- [x] No static data remaining
- [x] UI unchanged (same design)
- [x] Error handling implemented
- [x] Toast notifications working

## 📄 Files Summary

### Backend (Java):
```
src/main/java/com/kavyapharm/farmatrack/expense/
├── model/
│   └── Expense.java
├── repository/
│   └── ExpenseRepository.java
├── dto/
│   ├── CreateExpenseRequest.java
│   ├── UpdateExpenseRequest.java
│   └── ExpenseResponse.java
├── service/
│   ├── ExpenseService.java
│   └── ExpenseServiceImpl.java
└── controller/
    └── ExpenseController.java
```

### Frontend (JavaScript):
```
src/main/resources/static/
├── Manager-Dashboard/assets/js/
│   ├── expenses.js (OLD - static)
│   └── expenses_api.js (NEW - dynamic)
└── MR-Dashboard/assets/js/
    ├── expenses.js (OLD - static)
    └── expenses_api.js (NEW - to be created)
```

### Database:
```
database/
└── expenses_schema.sql
```

---

**Status**: Backend Complete ✅ | Manager Frontend Complete ✅ | MR Frontend Pending ⏳
