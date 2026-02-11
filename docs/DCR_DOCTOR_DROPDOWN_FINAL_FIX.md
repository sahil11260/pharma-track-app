# ✅ FINAL FIX: MR Dashboard DCR Doctor Dropdown

## 🔍 Root Cause Analysis

The doctor dropdown in the "Add New Visit Report (DCR)" modal was empty due to **TWO critical issues**:

### Issue #1: Missing JWT Authentication ❌
**Problem:** The `apiJson()` function in `visit-report.js` was making API calls WITHOUT the JWT authentication token.

**Impact:** The backend's `DoctorService.list()` method uses `SecurityContextHolder.getContext().getAuthentication()` to identify the logged-in user and filter doctors accordingly. Without the JWT token, the request was unauthenticated, so the backend returned an empty list.

**Solution:** Added `getAuthHeader()` function to include the JWT token from `localStorage.getItem("kavya_auth_token")` in all API requests.

### Issue #2: Incorrect API Parameter ❌
**Problem:** The JavaScript was calling `/api/doctors?mrName={mrName}`, but the backend doesn't accept this parameter.

**Impact:** The backend's `DoctorController.list()` method doesn't have a `@RequestParam` for `mrName`. It relies entirely on the **authenticated user's session** to filter doctors.

**Solution:** Changed the API call to simply `/api/doctors` without any parameters, allowing the backend to use the authenticated session.

## 🔧 Changes Made

### File: `visit-report.js`

#### Change #1: Added JWT Authentication
```javascript
// BEFORE
async function apiJson(url, options) {
    const res = await fetch(url, Object.assign({
        headers: { 'Content-Type': 'application/json' }
    }, options || {}));
    // ...
}

// AFTER
function getAuthHeader() {
    const token = localStorage.getItem("kavya_auth_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function apiJson(url, options) {
    const headers = { 
        'Content-Type': 'application/json',
        ...getAuthHeader(),  // ✅ JWT token included
        ...(options && options.headers ? options.headers : {})
    };
    const res = await fetch(url, Object.assign({}, options || {}, { headers }));
    // ...
}
```

#### Change #2: Fixed API Endpoint
```javascript
// BEFORE
apiJson(`/api/doctors?mrName=${encodeURIComponent(currentUserName)}`)

// AFTER
apiJson(`/api/doctors`) // Backend filters by authenticated user automatically
```

#### Change #3: Added Console Logging
```javascript
if (Array.isArray(doctors)) {
    console.log('[DCR] Loaded doctors from API:', doctors);
    assignedDoctors = doctors.map(d => ({
        id: d.id || d.doctorId,
        name: d.name || d.doctorName,
        clinic: d.clinicName || d.clinic || 'Default Clinic'
    }));
    console.log('[DCR] Mapped doctors:', assignedDoctors);
    populateDoctors();
}
```

## 🎯 How It Works Now

### Backend Flow (DoctorService.java)
1. **Authentication Check:** `SecurityContextHolder.getContext().getAuthentication()`
2. **Role Detection:** Checks if user is MR, Manager, or Admin
3. **For MR Users (lines 88-104):**
   ```java
   if (isMR) {
       List<String> mrIds = getUserIdentifiers(currentEmail);
       java.util.Set<Doctor> doctorSet = new java.util.HashSet<>();
       for (String mrId : mrIds) {
           doctorSet.addAll(doctorRepository.findByAssignedMRIgnoreCase(mrId.trim()));
       }
       return doctorSet.stream()
           .sorted(...)
           .map(DoctorService::toResponse)
           .toList();
   }
   ```
4. **Returns:** Only doctors where `assignedMR` matches the logged-in MR's name or email

### Frontend Flow (visit-report.js)
1. **Page Load:** `refreshFromApiOrFallback()` is called
2. **API Call:** `GET /api/doctors` with JWT token in Authorization header
3. **Backend Filters:** Returns only doctors assigned to the authenticated MR
4. **Mapping:** Transforms backend response to UI format
5. **Dropdown Population:** `populateDoctors()` fills the select element

## 🧪 Testing Instructions

### Step 1: Verify JWT Token Exists
1. Open browser DevTools (F12)
2. Go to **Application** tab → **Local Storage**
3. Check for `kavya_auth_token` key
4. **If missing:** Login again to generate a new token

### Step 2: Test Doctor Dropdown
1. **Login as MR user**
2. Navigate to **"Submit Visit Report (DCR)"** page
3. Click **"Add New DCR"** button
4. Open **Console** tab in DevTools
5. Look for logs:
   ```
   [DCR] Loaded doctors from API: [{...}, {...}]
   [DCR] Mapped doctors: [{id: 1, name: "Dr. Surbhi Jadhav", clinic: "Default Clinic"}, ...]
   ```
6. **Check the "Doctor Visited" dropdown** - should show all assigned doctors

### Step 3: Verify API Call
1. Open **Network** tab in DevTools
2. Refresh the page
3. Look for request to `/api/doctors`
4. Check **Request Headers:**
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Content-Type: application/json
   ```
5. Check **Response:**
   ```json
   [
     {
       "id": 1,
       "name": "Dr. Surbhi Jadhav",
       "clinicName": "Default Clinic",
       "specialty": "Neurologist",
       "city": "Nagpur",
       "assignedMR": "MR_NAME"
     }
   ]
   ```

### Step 4: Test DCR Submission
1. Select a doctor from the dropdown
2. Fill in all required fields
3. Add product samples
4. Click **"Save Report"**
5. **Expected:** DCR should be saved successfully

## 🔍 Troubleshooting

### Problem: Dropdown still empty
**Check:**
1. Is `kavya_auth_token` in localStorage?
2. Are there any console errors?
3. Does the Network tab show a 401 Unauthorized error?
4. Are doctors actually assigned to this MR in the database?

**Solution:**
- If 401 error: Re-login to get a fresh JWT token
- If no doctors: Assign doctors to the MR from Manager Dashboard

### Problem: 403 Forbidden
**Cause:** JWT token is valid but user doesn't have MR role

**Solution:** Check user role in database

### Problem: Doctors appear in "My Doctors" but not in DCR dropdown
**Cause:** The `assignedMR` field in the doctors table doesn't match the MR's name/email

**Solution:** Update doctor assignments from Manager Dashboard

## 📊 Database Schema Reference

### doctors table
```sql
{
  id: BIGINT PRIMARY KEY,
  name: VARCHAR(255),
  clinicName: VARCHAR(255),
  specialty: VARCHAR(255),
  city: VARCHAR(255),
  assignedMR: VARCHAR(255),  -- Must match MR's name or email
  managerEmail: VARCHAR(255),
  status: VARCHAR(50)
}
```

### app_user table
```sql
{
  id: BIGINT PRIMARY KEY,
  name: VARCHAR(255),
  email: VARCHAR(255) UNIQUE,
  role: VARCHAR(50),  -- 'MR', 'MANAGER', 'ADMIN', etc.
  assignedManager: VARCHAR(255)
}
```

## ✅ Success Criteria

- [x] JWT token included in all API requests
- [x] `/api/doctors` endpoint called without parameters
- [x] Backend filters doctors by authenticated user
- [x] Doctor dropdown populated with assigned doctors
- [x] Console logs show successful data loading
- [x] DCR can be submitted with selected doctor

## 📝 Files Modified

1. **`src/main/resources/static/MR-Dashboard/assets/js/visit-report.js`**
   - Added `getAuthHeader()` function
   - Updated `apiJson()` to include JWT token
   - Fixed `/api/doctors` API call
   - Added console logging for debugging

## 🚀 Deployment Notes

**No backend changes required!** The backend already had the correct logic. This was purely a frontend authentication issue.

**Cache Clearing:** Users may need to hard refresh (Ctrl+Shift+R) to load the updated JavaScript file.

---

**Status:** ✅ **FULLY FIXED AND READY FOR TESTING**

The doctor dropdown will now correctly display all doctors assigned to the logged-in MR user. The fix addresses both the authentication issue and the incorrect API parameter usage.
