# 📊 How to Record Sales Achievement - Complete Guide

## 🎯 Understanding the Problem

**What you see**: Achievement shows 0%
**Why**: No sales have been recorded yet for that product
**Solution**: MR needs to record sales entries

---

## 📝 Step-by-Step: How to Record Achievement

### Method 1: Through MR Dashboard (Recommended)

#### Step 1: Login as MR
1. Go to login page
2. Enter MR credentials (the person assigned the target)
3. Click "Login"

#### Step 2: Navigate to Sales Module
1. Look at the left sidebar
2. Click on **"Sales & Target"** or **"Sales"** menu item
3. You should see a page with sales entries

#### Step 3: Add New Sale
1. Click **"Add Sale"** or **"Record Sale"** button
2. Fill in the form:
   - **Product Name**: Select "Cetrizin" (must match target product exactly)
   - **Quantity Sold**: Enter units sold (e.g., 10, 20, 50)
   - **Sale Amount**: Enter total value in ₹
   - **Sale Date**: Select the date
   - **Doctor/Hospital**: (Optional) Select if applicable
   - **Region**: (Optional) Your region
3. Click **"Save"** or **"Submit"**

#### Step 4: Verify
1. Go back to Sales list
2. You should see your entry
3. **Wait a few seconds** for the system to calculate
4. Go to "Sales & Target" page
5. **Achievement should now show the quantity you entered!**

---

### Method 2: Through Manager Dashboard (Alternative)

If the MR dashboard doesn't have a sales entry module, the Manager can update achievement manually:

#### Step 1: Login as Manager
1. Go to login page
2. Enter Manager credentials
3. Click "Login"

#### Step 2: Navigate to Sales & Target
1. Click **"Sales & Target Tracking"** in sidebar
2. Find the target row (Cetrizin - 100 units)

#### Step 3: Edit Target
1. Click the **Edit** button (pencil icon) on that row
2. Find the field **"Sales Achievement"** or **"Achieved (Units)"**
3. Enter the actual sales achieved (e.g., 25 units)
4. Click **"Save"**

#### Step 4: Verify
1. The "Achieved (Units)" column should update
2. Achievement % will auto-calculate (e.g., 25/100 = 25%)
3. Status badge will update based on percentage

---

## 🔍 Example Scenario

### Target Created:
- **Product**: Cetrizin
- **Target**: 100 units
- **Assigned to**: MR "Nikita Garule"
- **Current Achievement**: 0 units (0%)

### Recording Sales:

**Day 1**: MR sells 15 units
- Login as MR
- Sales → Add Sale
- Product: Cetrizin, Quantity: 15
- Save
- **Result**: Achievement = 15 units (15%)

**Day 2**: MR sells 20 more units
- Login as MR
- Sales → Add Sale
- Product: Cetrizin, Quantity: 20
- Save
- **Result**: Achievement = 35 units (35%)

**Day 3**: MR sells 30 more units
- Login as MR
- Sales → Add Sale
- Product: Cetrizin, Quantity: 30
- Save
- **Result**: Achievement = 65 units (65%)

**System automatically**:
- Adds up all sales: 15 + 20 + 30 = 65
- Calculates %: 65/100 = 65%
- Updates status: "Good" (because > 50%)

---

## 🚨 Common Issues & Solutions

### Issue 1: "I don't see a Sales module in MR Dashboard"
**Solution**: 
- Check if the module is named differently (e.g., "Sales Entry", "Daily Sales", "Sales Report")
- If it doesn't exist, use Method 2 (Manager edits achievement manually)

### Issue 2: "I added sales but achievement still shows 0"
**Possible Causes**:
1. **Product name mismatch**: 
   - Target product: "Cetrizin"
   - Sales entry: "Cetrizin - 10mg" ❌
   - **Fix**: Use exact same product name

2. **MR name mismatch**:
   - Target assigned to: "Nikita Garule"
   - Sales recorded by: "Nikita" ❌
   - **Fix**: Ensure MR name matches exactly

3. **Date range issue**:
   - Target period: Feb 1-28, 2026
   - Sales date: Jan 15, 2026 ❌
   - **Fix**: Sales date must be within target period

4. **System not aggregating**:
   - **Fix**: Refresh the page (F5)
   - **Fix**: Logout and login again
   - **Fix**: Check browser console for errors (F12)

### Issue 3: "Achievement updates but chart doesn't show data"
**Solution**:
- Clear browser cache (Ctrl + F5)
- Check if you're on localhost or hosted site
- Ensure API is running (check for "API unreachable" banners)

---

## 🔧 Quick Test

Want to test if it works? Follow these exact steps:

1. **Login as Manager** (e.g., Nikita Garule)
2. **Go to**: Sales & Target Tracking
3. **Find**: Row with "Cetrizin" (100 units target)
4. **Click**: Edit button (pencil icon)
5. **Change**: "Sales Achievement" from 0 to 25
6. **Click**: Save
7. **Verify**: 
   - Achieved (Units) = 25
   - Achievement % = 25%
   - Status = "Poor" (because < 50%)

If this works, then the system is functioning correctly, and you just need MRs to record actual sales!

---

## 📊 What Happens Behind the Scenes

```
MR Records Sale
    ↓
Sale Entry Saved to Database
    ↓
System Queries: "Get all sales for MR X + Product Y"
    ↓
System Aggregates: SUM(quantity)
    ↓
System Updates Target Record:
    - salesAchievement = total quantity
    - achievementPercentage = (achieved / target) * 100
    ↓
Dashboard Refreshes
    ↓
Charts Update
    ↓
Manager Sees Updated Achievement ✅
```

---

## 📱 Mobile/App Version

If you have a mobile app for MRs:
1. Open app
2. Login as MR
3. Tap "Sales" or "Daily Report"
4. Tap "Add Sale"
5. Fill in product and quantity
6. Submit
7. Achievement updates automatically

---

## ✅ Summary

**To update achievement from 0 to actual value:**

1. **Best Way**: MR logs in → Records sales daily → System auto-calculates
2. **Quick Way**: Manager logs in → Edits target → Manually enters achievement
3. **Verify**: Check that product names match exactly
4. **Refresh**: Clear cache if changes don't appear

**The key**: Sales entries drive achievement. No sales = 0 achievement!

---

**Created**: 2026-02-17 14:58 IST
**For**: Cetrizin target (100 units) showing 0% achievement
