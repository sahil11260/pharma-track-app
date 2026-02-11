# Testing Guide: Sales & Target Filtering

## Overview
This guide will help you test that the Manager Dashboard only shows targets for MRs assigned to that specific manager.

## Test Data Setup

### Step 1: Verify Database Relationships

Run these SQL queries to check your current data:

```sql
-- Check all users and their assigned managers
SELECT id, name, email, role, assigned_manager 
FROM app_user 
ORDER BY role, assigned_manager;

-- Check all targets and which MR they belong to
SELECT id, mr_name, sales_target, sales_achievement, start_date, end_date
FROM app_target
ORDER BY mr_name;

-- Check Manager-MR relationships
SELECT 
    m.name AS manager_name,
    m.email AS manager_email,
    COUNT(mr.id) AS num_mrs,
    GROUP_CONCAT(mr.name) AS assigned_mrs
FROM app_user m
LEFT JOIN app_user mr ON mr.assigned_manager = m.name OR mr.assigned_manager = m.email
WHERE m.role = 'MANAGER'
GROUP BY m.id, m.name, m.email;
```

### Step 2: Create Test Data (if needed)

If you don't have test managers and MRs, create them:

```sql
-- Create a test manager
INSERT INTO app_user (name, email, password_hash, role, status, phone, territory)
VALUES ('Test Manager', 'manager@test.com', '$2a$10$...', 'MANAGER', 'ACTIVE', '1234567890', 'North Region');

-- Create MRs assigned to this manager
INSERT INTO app_user (name, email, password_hash, role, status, phone, territory, assigned_manager)
VALUES 
('MR One', 'mr1@test.com', '$2a$10$...', 'MR', 'ACTIVE', '1111111111', 'Zone A', 'Test Manager'),
('MR Two', 'mr2@test.com', '$2a$10$...', 'MR', 'ACTIVE', '2222222222', 'Zone B', 'Test Manager');

-- Create targets for these MRs
INSERT INTO app_target (mr_name, period, sales_target, sales_achievement, visits_target, visits_achievement, start_date, end_date, status, last_updated)
VALUES 
('MR One', 'Monthly', 50000, 35000, 100, 75, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 'good', NOW()),
('MR Two', 'Monthly', 60000, 45000, 120, 90, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 'good', NOW());
```

## Testing Steps

### Test 1: Manager Login and View

1. **Login as Manager**
   - URL: `http://localhost:8080`
   - Email: Your manager's email
   - Password: Your manager's password

2. **Navigate to Sales & Target Tracking**
   - Click on "Sales & Target Tracking" in the sidebar

3. **Open Browser Console** (F12)
   - Look for these log messages:
   ```
   [TARGET] Fetching MRs for manager: {ManagerName}
   [TARGETS] Fetching targets for manager: {ManagerName}
   [TARGETS] Manager's MRs: ["mr1", "mr2", ...]
   [TARGETS] Total targets from API: X
   [TARGETS] Filtered targets for manager's MRs: Y
   ```

4. **Verify the Table**
   - ✅ Should ONLY show MRs assigned to this manager
   - ✅ Should ONLY show targets for those MRs
   - ❌ Should NOT show other managers' MRs
   - ❌ Should NOT show targets for MRs not assigned to this manager

5. **Check the Dropdown**
   - Click on "All MRs" dropdown
   - ✅ Should ONLY list MRs assigned to this manager

### Test 2: Different Manager Login

1. **Logout** and login as a different manager
2. **Navigate to Sales & Target Tracking**
3. **Verify**:
   - Different set of MRs should be shown
   - Different targets should be displayed
   - No overlap with previous manager's data

### Test 3: MR Dashboard

1. **Login as an MR**
2. **Check Dashboard Cards**:
   - ✅ Total Sales should show MR's sales
   - ✅ Target Achieved should show MR's percentage
   - ✅ Visits Done should show MR's visits
   - ✅ Expenses should show MR's expenses

3. **Navigate to Sales & Target page**
   - ✅ Should ONLY show that MR's targets
   - ❌ Should NOT show other MRs' targets

## Expected Console Output

### Manager Dashboard Console:
```
[TARGET] Fetching MRs for manager: John Manager
[TARGET] Loaded 3 MRs from API
[TARGETS] Fetching targets for manager: John Manager
[TARGETS] Manager's MRs: ["rajesh kumar", "priya sharma", "amit singh"]
[TARGETS] Total targets from API: 10
[TARGETS] Filtered targets for manager's MRs: 3
[TARGETS] Loaded 3 targets for manager's MRs
```

### MR Dashboard Console:
```
[MR-DASH] Fetching dashboard for email: mr1@test.com
[MR-DASH] User: ID=5, Name='MR One'
[MR-DASH] Results -> Visits: 10, Pending: 5000, Approved: 3000, Sales: 35000, Target%: 70
```

## Troubleshooting

### Issue: Manager sees ALL MRs

**Possible Causes:**
1. MRs not properly assigned to manager in database
2. Manager name/email mismatch
3. Authentication not working

**Solution:**
```sql
-- Check if MRs have assigned_manager set
SELECT name, email, assigned_manager FROM app_user WHERE role = 'MR';

-- Update MRs to assign them to a manager
UPDATE app_user 
SET assigned_manager = 'Manager Name' 
WHERE role = 'MR' AND name IN ('MR One', 'MR Two');
```

### Issue: No targets showing

**Possible Causes:**
1. No targets exist for the manager's MRs
2. Target mr_name doesn't match user name

**Solution:**
```sql
-- Check target names vs user names
SELECT DISTINCT t.mr_name, u.name
FROM app_target t
LEFT JOIN app_user u ON LOWER(TRIM(t.mr_name)) = LOWER(TRIM(u.name))
WHERE u.role = 'MR';

-- Update target mr_name to match user name if needed
UPDATE app_target 
SET mr_name = 'Exact User Name' 
WHERE mr_name = 'old name';
```

### Issue: Console shows filtering but table shows all

**Cause:** Frontend filtering is working but table render has cached data

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear localStorage
3. Check if `refreshAllDisplays()` is being called after filtering

## API Endpoints Reference

| Endpoint | Parameters | Returns |
|----------|-----------|---------|
| `GET /api/users?manager={name}&role=MR` | manager, role | MRs assigned to manager |
| `GET /api/targets?manager={name}` | manager | Targets for manager's MRs |
| `GET /api/targets?mrName={name}` | mrName | Targets for specific MR |
| `GET /api/mr-dashboard` | (auth token) | MR's dashboard data |

## Success Criteria

✅ **Manager Dashboard:**
- Shows only assigned MRs in dropdown
- Shows only targets for assigned MRs in table
- Summary cards calculate based on filtered data
- Different managers see different data

✅ **MR Dashboard:**
- Shows only that MR's sales and targets
- Dashboard cards display correct values
- Sales & Target page shows only MR's data

✅ **Data Isolation:**
- No cross-contamination between managers
- No MR can see other MRs' data
- Backend enforces filtering
- Frontend provides additional safety layer

## Notes

- The application uses **dual-layer filtering** (backend + frontend)
- Manager identification uses both name and email
- Case-insensitive matching is used throughout
- Console logging helps debug filtering issues
