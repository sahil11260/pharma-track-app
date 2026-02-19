# 🎯 QUICK GUIDE: How to Update Achievement from 0% to Actual Value

## ⚡ Fastest Method: Edit Target Directly (Manager Dashboard)

Since the MR "Sales & Target" page is **read-only** (only displays targets, no "Add Sale" button), the quickest way to update achievement is through the **Manager Dashboard**.

---

## 📝 Step-by-Step Instructions

### Step 1: Login as Manager
1. Open your application
2. Click "Login"
3. Enter **Manager credentials**:
   - Email: (Manager's email, e.g., Nikita Garule's email)
   - Password: (Manager's password)
4. Click "Login"

---

### Step 2: Navigate to Sales & Target Tracking
1. Look at the **left sidebar**
2. Click on: **"Sales & Target"** or **"Sales & Target Tracking"**
3. You should see a table with all targets

---

### Step 3: Find the Target Row
Look for the row with:
- **Product Name**: "Cetrizin"
- **Target (Units)**: 100
- **Achieved (Units)**: 0 ← This is what we want to change
- **Achievement %**: 0.0%

---

### Step 4: Click Edit Button
1. On the right side of that row, you'll see action buttons
2. Click the **pencil icon** (✏️) or **"Edit"** button
3. A modal/form will open

---

### Step 5: Update Achievement
In the edit form, you'll see fields like:
- **MR Name**: (Already filled)
- **Product**: (Already filled)
- **Sales Target**: 100 (Already filled)
- **Sales Achievement**: **0** ← Change this!
- **Start Date**: (Already filled)
- **End Date**: (Already filled)

**Change "Sales Achievement" to the actual units sold**

Examples:
- If MR sold 25 units → Enter **25**
- If MR sold 50 units → Enter **50**
- If MR sold 75 units → Enter **75**

---

### Step 6: Save Changes
1. Click **"Save"** or **"Update"** button
2. The modal will close
3. The table will refresh

---

### Step 7: Verify
Check the updated row:
- **Achieved (Units)**: Should now show your entered value (e.g., 25)
- **Achievement %**: Will auto-calculate (e.g., 25/100 = 25%)
- **Status**: Will update based on percentage:
  - 0-49%: "Poor" (Red badge)
  - 50-74%: "Average" (Yellow badge)
  - 75-89%: "Good" (Blue badge)
  - 90-100%: "Excellent" (Green badge)

---

## 🎯 Example Walkthrough

### Scenario:
- **Target**: 100 units of Cetrizin
- **Currently showing**: 0 units achieved (0%)
- **Actual sales**: MR sold 35 units

### Steps:
1. ✅ Login as Manager
2. ✅ Go to "Sales & Target Tracking"
3. ✅ Find "Cetrizin" row (100 units target)
4. ✅ Click Edit (✏️) button
5. ✅ Change "Sales Achievement" from **0** to **35**
6. ✅ Click "Save"
7. ✅ Verify:
   - Achieved (Units) = **35**
   - Achievement % = **35%**
   - Status = **"Poor"** (because < 50%)

---

## 🔄 Alternative Method: Through Backend API (Advanced)

If you want to automate this or integrate with a mobile app:

### API Endpoint:
```
PUT /api/targets/{targetId}
```

### Request Body:
```json
{
  "mrName": "Nikita Garule",
  "salesTarget": 100,
  "salesAchievement": 35,
  "startDate": "2026-02-17",
  "endDate": "2026-03-17",
  "status": "Pending"
}
```

### Response:
```json
{
  "id": 2,
  "mrName": "Nikita Garule",
  "period": "Cetrizin",
  "salesTarget": 100,
  "salesAchievement": 35,
  "achievementPercentage": 35,
  "status": "Pending"
}
```

---

## 📱 Future Enhancement: Add Sales Entry Module

Currently, MRs can only **view** their targets, not record sales. To allow MRs to record sales themselves:

### Option 1: Add "Record Sale" Feature to MR Dashboard
Create a new page: `MR Dashboard → Record Sales`

Features:
- Form to enter:
  - Product (dropdown)
  - Quantity sold
  - Sale date
  - Doctor/Hospital (optional)
- Saves to database
- Automatically updates achievement

### Option 2: Enable Edit on MR's "Sales & Target" Page
Add an "Update Achievement" button that allows MRs to update their own achievement values.

---

## ✅ Summary

**To update achievement from 0 to actual value RIGHT NOW:**

1. **Login as Manager** (not MR, not Admin)
2. **Go to**: Sales & Target Tracking
3. **Find**: Cetrizin row (100 units, 0 achieved)
4. **Click**: Edit button (✏️)
5. **Change**: "Sales Achievement" from 0 to actual value (e.g., 35)
6. **Save**: Click Save button
7. **Done**: Achievement updates instantly! ✅

**Time required**: Less than 1 minute

---

## 🐛 Troubleshooting

### Issue: "I don't see an Edit button"
**Solution**: 
- Make sure you're logged in as **Manager**, not MR or Admin
- Check if the button is on the far right of the table row
- Try scrolling the table horizontally if on mobile

### Issue: "Edit button is disabled/grayed out"
**Solution**:
- Check user permissions
- Ensure you're the manager assigned to that MR
- Try refreshing the page (F5)

### Issue: "Changes don't save"
**Solution**:
- Check browser console for errors (F12 → Console tab)
- Verify API is running (check for "API unreachable" banners)
- Try logging out and logging back in

### Issue: "Achievement % doesn't calculate"
**Solution**:
- Refresh the page (F5)
- The calculation is automatic: (achievement / target) × 100
- If still 0%, check if you saved the changes

---

**Created**: 2026-02-17 15:02 IST
**For**: Updating Cetrizin target achievement from 0% to actual value
