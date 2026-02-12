# 🎯 SALES & TARGET TRACKING - DYNAMIC IMPLEMENTATION PLAN

## Overview
Making Sales & Target Tracking fully dynamic with database-driven data for both Manager and MR dashboards.

## Current Status: ✅ Backend Entities & DTOs Created

### ✅ Completed Files:
1. **Entities**:
   - `SalesTarget.java` - Stores assigned targets
   - `SalesAchievement.java` - Stores sales achievements

2. **Repositories**:
   - `SalesTargetRepository.java` - Custom queries for targets
   - `SalesAchievementRepository.java` - Aggregation queries

3. **DTOs**:
   - `CreateTargetRequest.java` - For assigning targets
   - `RecordAchievementRequest.java` - For recording achievements
   - `TargetWithAchievementResponse.java` - Combined view
   - `ManagerDashboardSummary.java` - Manager summary

4. **Service Interface**:
   - `SalesService.java` - Business logic contract

---

## 📋 Remaining Backend Tasks

### 1. Service Implementation (`SalesServiceImpl.java`)
```java
Key Methods:
- assignTarget() - Manager assigns target to MR
- getManagerDashboardSummary() - Calculate totals, avg, top performer
- getAllTargetsWithAchievements() - Join targets + achievements
- getMrTargets() - MR-specific targets
- recordAchievement() - Update/create achievement
```

### 2. Controller (`SalesController.java`)
```java
Endpoints needed:
POST   /api/manager/sales-targets           - Assign target
GET    /api/manager/sales-targets/summary   - Manager dashboard
GET    /api/mr/{mrId}/sales-targets          - MR targets
POST   /api/mr/sales-achievements            - Record achievement  
DELETE /api/manager/sales-targets/{id}       - Delete target
```

### 3. Database Schema (`sales_schema.sql`)
```sql
CREATE TABLE sales_targets (...)
CREATE TABLE sales_achievements (...)
INSERT sample data for testing
```

---

## 🎨 Frontend Tasks

### 1. Manager Dashboard (`Manager-Dashboard/assets/js/targets_api.js`)
Replaces: `targets.js` (static data)

**API Calls:**
```javascript
// On load
GET /api/manager/sales-targets/summary?month=2&year=2026

// Response populates:
- Total Target card (₹4,100)
- Total Achievement card (₹3,300)
- Avg Achievement % card (80%)
- Top Performer card (Rajesh)
- Table rows (all MRs with progress)
- Top Performers section
```

**Features:**
- Set Targets button → POST /api/manager/sales-targets
- Edit/Delete targets
- Filter by MR, Achievement Status
- Search functionality

### 2. MR Dashboard (`MR-Dashboard/assets/js/sales_api.js`)
Replaces: `sales.js` (static data)

**API Calls:**
```javascript
// On load
GET /api/mr/{mrId}/sales-targets?month=2&year=2026

// If empty → "No sales targets found"
// Else → render table with targets & achievements
```

**Features:**
- View assigned targets
- Record achievements (implicit via sales submission)
- Progress indicators
- Month/Year filters

---

## 🔄 Integration Flow

### Manager Assigns Target:
1. Manager clicks "Set Targets"
2. Fills form (MR, Product, Units, Month, Year)
3. POST `/api/manager/sales-targets`
4. Backend saves to `sales_targets` table
5. Success toast → reload dashboard

### MR Views Targets:
1. MR Dashboard loads
2. GET `/api/mr/{mrId}/sales-targets?month=2&year=2026`
3. Backend joins `sales_targets` + `sales_achievements`
4. Returns targets with achievement %
5. Renders table

### MR Submits Sales (Achievement):
1. MR submits sale via Product Samples or Sales module
2. POST `/api/mr/sales-achievements`
3. Backend creates/updates `sales_achievements`
4. Manager dashboard reflects updated totals

---

## 📊 Data Flow Diagram

```
┌─────────────────┐
│  Manager        │
│  Dashboard      │
└────────┬────────┘
         │ POST /api/manager/sales-targets
         ↓
┌─────────────────────┐
│  sales_targets      │ ← Stores assigned targets
│  (Database)         │
└─────────────────────┘
         │
         │ GET /api/mr/{mrId}/sales-targets
         ↓
┌─────────────────┐
│  MR Dashboard   │
└────────┬────────┘
         │ POST /api/mr/sales-achievements
         ↓
┌─────────────────────┐
│sales_achievements   │ ← Stores MR sales
│  (Database)         │
└─────────────────────┘
         │
         │ JOIN for summary
         ↓
┌─────────────────┐
│  Manager        │
│  Dashboard      │
│  (Updated)      │
└─────────────────┘
```

---

## 🚀 Next Steps (In Order)

1. ✅ Create `SalesServiceImpl.java`
2. ✅ Create `SalesController.java`
3. ✅ Create `sales_schema.sql`
4. ✅ Test APIs via Postman
5. ✅ Create `Manager-Dashboard/assets/js/targets_api.js`
6. ✅ Update `Manager-Dashboard/targets.html` to use new JS
7. ✅ Create `MR-Dashboard/assets/js/sales_api.js`
8. ✅ Update `MR-Dashboard/sales.html` to use new JS
9. ✅ Test end-to-end flow
10. ✅ Deploy to Render

---

## 💾 Key Database Schema

### sales_targets
- id (PK)
- mr_id (FK to users)
- mr_name
- product_id
- product_name
- target_type (MONTHLY)
- target_units
- assigned_date
- period_month (1-12)
- period_year (2026)
- assigned_by

### sales_achievements
- id (PK)
- mr_id (FK to users)
- mr_name
- product_id
- product_name
- achieved_units
- achievement_date
- period_month
- period_year
- remarks

---

## 🧪 Testing Checklist

- [ ] Manager can assign target to MR
- [ ] Target appears in Manager dashboard
- [ ] Target appears in MR dashboard (for that specific MR)
- [ ] MR can record achievement
- [ ] Achievement updates Manager dashboard totals
- [ ] Top performer calculation is correct
- [ ] Month/Year filters work
- [ ] Delete target works
- [ ] No static data remains

---

**Status:** Backend foundation complete. Ready for SERVICE + CONTROLLER + FRONTEND implementation.
