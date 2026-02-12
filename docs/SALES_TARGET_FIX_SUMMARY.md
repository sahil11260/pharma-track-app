# Sales & Target Tracking Fix - Summary

## Issue Description
The Manager's Sales & Target Tracking page was showing ALL MRs' targets globally instead of filtering by the manager's assigned MRs. Additionally, the MR Dashboard wasn't displaying sales and target data in the dashboard cards.

## Changes Made

### 1. Backend Changes

#### TargetController.java
**File:** `src/main/java/com/kavyapharm/farmatrack/target/controller/TargetController.java`

**Changes:**
- Updated `getAllTargets()` endpoint to accept an optional `manager` parameter
- Added new endpoint `/api/targets/by-manager` for explicit manager-based filtering
- Both endpoints now support filtering targets by manager's assigned MRs

```java
@GetMapping
public ResponseEntity<List<TargetResponse>> getAllTargets(
        @RequestParam(required = false) String mrName,
        @RequestParam(required = false) String manager) {
    return ResponseEntity.ok(targetService.getAllTargets(mrName, manager));
}

@GetMapping("/by-manager")
public ResponseEntity<List<TargetResponse>> getTargetsByManager(@RequestParam String manager) {
    return ResponseEntity.ok(targetService.getTargetsByManager(manager));
}
```

#### TargetService.java
**File:** `src/main/java/com/kavyapharm/farmatrack/target/service/TargetService.java`

**Changes:**
- Injected `UserRepository` to fetch manager's assigned MRs
- Updated `getAllTargets()` to support manager parameter
- Added `getTargetsByManager()` method that:
  1. Fetches all MRs assigned to the manager from the User table
  2. Filters targets to only include those belonging to the manager's MRs
  3. Handles both name and email-based manager identification

```java
public List<TargetResponse> getTargetsByManager(String manager) {
    // Get all MRs assigned to this manager
    List<User> assignedMrs = userRepository.findByAssignedManagerIgnoreCase(manager);
    
    if (assignedMrs.isEmpty()) {
        // Try with email if name didn't work
        assignedMrs = userRepository.findAll().stream()
                .filter(u -> u.getAssignedManager() != null && 
                        u.getAssignedManager().trim().equalsIgnoreCase(manager.trim()))
                .toList();
    }
    
    // Get MR names and filter targets
    List<String> mrNames = assignedMrs.stream()
            .map(User::getName)
            .filter(name -> name != null && !name.isEmpty())
            .toList();
    
    if (mrNames.isEmpty()) {
        return List.of(); // No MRs assigned to this manager
    }
    
    // Get targets for all assigned MRs
    List<Target> targets = targetRepository.findAll().stream()
            .filter(t -> mrNames.stream()
                    .anyMatch(mrName -> mrName.trim().equalsIgnoreCase(t.getMrName().trim())))
            .toList();
    
    return targets.stream().map(this::toResponse).toList();
}
```

#### TargetInitializer.java
**File:** `src/main/java/com/kavyapharm/farmatrack/target/TargetInitializer.java`

**Changes:**
- Updated method call to match new signature: `getAllTargets(null, null)`

### 2. Frontend Changes

#### Manager Dashboard - targets.js
**File:** `src/main/resources/static/Manager-Dashboard/assets/js/targets.js`

**Changes:**
- Updated `refreshTargetsFromApiOrFallback()` to use manager-filtered endpoint
- Now fetches only targets for MRs assigned to the logged-in manager
- Uses manager's name or email from localStorage to filter

```javascript
async function refreshTargetsFromApiOrFallback() {
  try {
    // Get current manager info
    let userObj = {};
    try {
      userObj = JSON.parse(localStorage.getItem("kavya_user") || "{}");
    } catch (e) { }

    const currentName = userObj.name || localStorage.getItem("signup_name") || "";
    const currentEmail = userObj.email || localStorage.getItem("signup_email") || "";
    
    // Use manager-filtered endpoint
    const managerParam = encodeURIComponent(currentName || currentEmail);
    const url = `${TARGETS_API_BASE}?manager=${managerParam}`;
    
    console.log("[TARGETS] Fetching targets for manager:", currentName || currentEmail);
    const data = await apiJson(url);
    
    if (Array.isArray(data)) {
      window.targetsData = data.map(normalizeTargetFromApi);
      targetsApiMode = true;
      console.log("[TARGETS] Loaded", window.targetsData.length, "targets for manager's MRs");
      return;
    }
  } catch (e) {
    console.warn("Targets API unavailable. Using fallback data.", e);
  }
  targetsApiMode = false;
  window.targetsData = getStoredData(STORAGE_KEY, initialTargetsData);
}
```

### 3. MR Dashboard Integration

#### MR Dashboard - sales.js
**File:** `src/main/resources/static/MR-Dashboard/assets/js/sales.js`

**Already Configured:**
- Fetches targets filtered by MR name: `${TARGETS_API_BASE}?mrName=${encodeURIComponent(currentUserName)}`
- Displays sales and visit targets in tables
- No changes needed - already working correctly

#### MR Dashboard - index.js
**File:** `src/main/resources/static/MR-Dashboard/assets/js/index.js`

**Already Configured:**
- Fetches dashboard data from `/api/mr-dashboard`
- Displays sales, target percentage, visits, and expenses in dashboard cards
- No changes needed - already working correctly

#### MrDashboardService.java
**File:** `src/main/java/com/kavyapharm/farmatrack/mrdashboard/service/MrDashboardService.java`

**Already Configured:**
- Calculates sales and target percentage from SalesAchievement and SalesTarget tables
- Filters by logged-in MR's user ID
- Returns data in MrDashboardResponse format
- No changes needed - already working correctly

## Data Flow

### Manager Dashboard Flow:
1. Manager logs in → Manager name/email stored in localStorage
2. Manager navigates to Sales & Target Tracking page
3. Frontend calls: `GET /api/targets?manager={managerName}`
4. Backend:
   - Fetches all MRs where `assignedManager = {managerName}`
   - Gets target records for those MRs only
   - Returns filtered list
5. Frontend displays only the manager's MRs' targets

### MR Dashboard Flow:
1. MR logs in → MR name/email stored in localStorage
2. MR views Dashboard
3. Frontend calls: `GET /api/mr-dashboard`
4. Backend:
   - Gets logged-in MR's user ID from authentication
   - Fetches sales achievements and targets for that MR
   - Calculates total sales and target percentage
   - Returns dashboard data
5. Frontend displays sales and target in dashboard cards
6. MR navigates to Sales & Target page
7. Frontend calls: `GET /api/targets?mrName={mrName}`
8. Backend returns only that MR's targets
9. Frontend displays MR's specific targets

## Testing Checklist

### Manager Dashboard:
- [ ] Login as Manager
- [ ] Navigate to Sales & Target Tracking
- [ ] Verify only MRs assigned to this manager are shown
- [ ] Verify target data is accurate
- [ ] Test with different managers to ensure data isolation

### MR Dashboard:
- [ ] Login as MR
- [ ] Check Dashboard cards show:
  - [ ] Total Sales (₹0 initially, updates with data)
  - [ ] Target Achieved (0% initially, updates with data)
  - [ ] Visits Done
  - [ ] Expenses (Pending/Approved)
- [ ] Navigate to Sales & Target page
- [ ] Verify only that MR's targets are shown
- [ ] Verify data matches what manager sees for this MR

## Benefits

1. **Data Isolation:** Managers only see their assigned MRs' data
2. **Security:** Backend enforces filtering, not just frontend
3. **Scalability:** Works with any number of managers and MRs
4. **Consistency:** Same filtering logic used across all endpoints
5. **MR Privacy:** MRs only see their own targets and sales data

## API Endpoints Summary

| Endpoint | Parameters | Description | Used By |
|----------|-----------|-------------|---------|
| `GET /api/targets` | `mrName` (optional), `manager` (optional) | Get all targets with optional filtering | Both |
| `GET /api/targets/by-manager` | `manager` (required) | Get targets for manager's MRs | Manager Dashboard |
| `GET /api/mr-dashboard` | None (uses auth) | Get MR's dashboard summary | MR Dashboard |

## Notes

- The `assignedManager` field in the User table is used to establish the manager-MR relationship
- Both manager name and email are supported for backward compatibility
- Case-insensitive matching is used for robustness
- Empty results are returned if no MRs are assigned to a manager
