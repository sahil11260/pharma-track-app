# 🚀 SALES & TARGET TRACKING - TESTING & DEPLOYMENT GUIDE

## ✅ FILES CREATED - COMPLETE IMPLEMENTATION

### Backend (Spring Boot)
1. ✅ **Entities** (2 files)
   - `SalesTarget.java`
   - `SalesAchievement.java`

2. ✅ **Repositories** (2 files)
   - `SalesTargetRepository.java`
   - `SalesAchievementRepository.java`

3. ✅ **DTOs** (4 files)
   - `CreateTargetRequest.java`
   - `RecordAchievementRequest.java`
   - `TargetWithAchievementResponse.java`
   - `ManagerDashboardSummary.java`

4. ✅ **Service** (2 files)
   - `SalesService.java` (interface)
   - `SalesServiceImpl.java` (implementation)

5. ✅ **Controller**
   - `SalesController.java`

6. ✅ **Database**
   - `sales_schema.sql`

### Frontend (JavaScript)
7. ✅ **Manager Dashboard**
   - `Manager-Dashboard/assets/js/targets_api.js`

8. ✅ **MR Dashboard**
   - `MR-Dashboard/assets/js/sales_api.js`

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Update HTML Files

#### Manager Dashboard - `targets.html`
```html
<!-- OLD: -->
<script src="assets/js/targets.js"></script>

<!-- NEW: -->
<script src="assets/js/targets_api.js"></script>
```

#### MR Dashboard - `sales.html`
```html
<!-- OLD: -->
<script src="assets/js/sales.js"></script>

<!-- NEW: -->
<script src="assets/js/sales_api.js"></script>
```

### 2. Run Database Schema
Execute the SQL file to create tables and sample data:
```bash
mysql -u root -p kavyapharm_db < src/main/resources/db/sales_schema.sql
```

Or manually run in MySQL Workbench/phpMyAdmin.

### 3. Rebuild Application
```bash
cd c:\Users\Administrator\Downloads\Final_KavyaPharmaa
mvn clean package
```

### 4. Start Application
```bash
mvn spring-boot:run
```

---

## 🧪 API TESTING WITH POSTMAN

### Test 1: Assign Target (Manager)
```http
POST http://localhost:8080/api/manager/sales-targets
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "mrId": 1,
  "mrName": "Nikita Garule",
  "productId": 101,
  "productName": "Cetrizin - 10mg",
  "targetUnits": 1000,
  "periodMonth": 2,
  "periodYear": 2026,
  "assignedBy": "Regional Manager"
}
```

**Expected Response (201):**
```json
{
  "id": 1,
  "mrId": 1,
  "mrName": "Nikita Garule",
  "productName": "Cetrizin - 10mg",
  "targetUnits": 1000,
  ...
}
```

---

### Test 2: Get Manager Dashboard
```http
GET http://localhost:8080/api/manager/sales-targets/summary?month=2&year=2026
Authorization: Bearer YOUR_TOKEN
```

**Expected Response (200):**
```json
{
  "totalTarget": 4100,
  "totalAchievement": 3300,
  "avgAchievementPercentage": 80.49,
  "topPerformer": "Rahul Sharma",
  "targets": [
    {
      "id": 1,
      "mrName": "Nikita Garule",
      "productName": "Cetrizin - 10mg",
      "targetUnits": 1000,
      "achievedUnits": 750,
      "achievementPercentage": 75.0,
      "progressStatus": "Good",
      ...
    }
  ],
  "topPerformers": [
    {
      "rank": 1,
      "mrName": "Rahul Sharma",
      "target": 2000,
      "achievement": 1800,
      "achievementPercentage": 90.0,
      "status": "Excellent"
    }
  ]
}
```

---

### Test 3: Get MR Targets
```http
GET http://localhost:8080/api/mr/1/sales-targets?month=2&year=2026
Authorization: Bearer YOUR_TOKEN
```

**Expected Response (200):**
```json
[
  {
    "id": 1,
    "mrName": "Nikita Garule",
    "productName": "Cetrizin - 10mg",
    "targetType": "MONTHLY",
    "targetUnits": 1000,
    "achievedUnits": 750,
    "achievementPercentage": 75.0,
    "progressStatus": "Good",
    "assignedDate": "2026-01-07",
    "periodMonth": 2,
    "periodYear": 2026
  }
]
```

---

### Test 4: Record Achievement (MR)
```http
POST http://localhost:8080/api/mr/sales-achievements
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "mrId": 1,
  "productId": 101,
  "achievedUnits": 100,
  "periodMonth": 2,
  "periodYear": 2026,
  "remarks": "Additional sales from clinic visits"
}
```

**Expected Response (201):**
```json
{
  "id": 5,
  "mrId": 1,
  "productName": "Cetrizin - 10mg",
  "achievedUnits": 850,
  ...
}
```

---

### Test 5: Delete Target (Manager)
```http
DELETE http://localhost:8080/api/manager/sales-targets/1
Authorization: Bearer YOUR_TOKEN
```

**Expected Response (204 No Content)**

---

## 🌐 FRONTEND TESTING

### Manager Dashboard (`localhost:8080/Manager-Dashboard/targets.html`)

**Test Scenarios:**
1. ✅ Load page → Should see summary cards populated from API
2. ✅ Total Target, Achievement, Avg%, Top Performer should match DB
3. ✅ Table should show all targets with achievements
4. ✅ Click "Set Targets" → Modal should open with MR dropdown
5. ✅ Assign new target → Should appear in table immediately
6. ✅ Click Delete → Should remove target after confirmation
7. ✅ Change month/year filter → Should reload with new data
8. ✅ Top Performers section should show ranked list

**Expected Behavior:**
- No static/mock data
- All values from database
- Real-time updates after actions

---

### MR Dashboard (`localhost:8080/MR-Dashboard/sales.html`)

**Test Scenarios:**
1. ✅ Load page as MR with targets → Should see assigned targets
2. ✅ Achievement % and progress bars should be accurate
3. ✅ Status badges (Excellent/Good/Average/Poor) should match %
4. ✅ Change month/year → Should update table
5. ✅ Load as MR without targets → Should show "No sales targets found"

**Expected Behavior:**
- MR sees ONLY their own targets
- Cannot see other MRs' data
- Progress indicators work correctly

---

## 🔧 INTEGRATION WITH EXISTING MODULES

### Link Sales Submission to Achievement
When MR submits sale via Product Samples:
```javascript
// In product-sample.js or sales.js submission handler
await window.SalesAPI.recordAchievement(productId, quantity, 'Auto-recorded from sale');
```

---

## 🚀 DEPLOYMENT TO RENDER

### 1. Commit All Files
```bash
git add .
git commit -m "feat: Dynamic Sales & Target Tracking implementation"
git push origin main
```

### 2. Deploy Backend
Render will auto-deploy on push. Verify:
- Database migrations run
- Endpoints accessible at `https://pharma-track-app.onrender.com/api`

### 3. Update Frontend API Base
Both JS files already use:
```javascript
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080/api'
    : 'https://pharma-track-app.onrender.com/api';
```

### 4. Test Production
- Visit Manager Dashboard on Render
- Verify API calls work
- Check console for errors

---

## ⚠️ TROUBLESHOOTING

### Issue: "No sales targets found" for MR
**Solution:** Ensure targets assigned with correct mrId

### Issue: 401 Unauthorized
**Solution:** Check JWT token in localStorage

### Issue: CORS errors
**Solution:** Verify `@CrossOrigin` in controller

### Issue: Empty summary cards
**Solution:** Check database has data for selected month/year

---

## 📊 DATA VERIFICATION QUERIES

```sql
-- Check targets
SELECT * FROM sales_targets WHERE period_month = 2 AND period_year = 2026;

-- Check achievements
SELECT * FROM sales_achievements WHERE period_month = 2 AND period_year = 2026;

-- Verify summary calculations
SELECT 
    SUM(st.target_units) as total_target,
    SUM(sa.achieved_units) as total_achievement,
    ROUND(SUM(sa.achieved_units) * 100.0 / SUM(st.target_units), 2) as avg_percentage
FROM sales_targets st
LEFT JOIN sales_achievements sa ON 
    st.mr_id = sa.mr_id AND 
    st.product_id = sa.product_id AND 
    st.period_month = sa.period_month AND 
    st.period_year = sa.period_year
WHERE st.period_month = 2 AND st.period_year = 2026;
```

---

## ✅ FINAL CHECKLIST

- [ ] All backend files created and compiled
- [ ] Database schema executed
- [ ] Sample data inserted
- [ ] All 5 API endpoints tested in Postman
- [ ] Manager Dashboard loads summary correctly
- [ ] MR Dashboard shows targets correctly
- [ ] Set Targets button works
- [ ] Delete target works
- [ ] Month/Year filters work
- [ ] No console errors
- [ ] Deployed to Render
- [ ] Production testing complete

---

**🎉 IMPLEMENTATION COMPLETE!**

The Sales & Target Tracking feature is now fully dynamic and database-driven!
