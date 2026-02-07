# MR Assignment Scripts - Usage Guide

I've created TWO automated scripts to assign MRs to Managers:

## Script 1: quick_assign_mrs.bat (RECOMMENDED - Easiest!)

**What it does:**
- Automatically finds the first Manager in your database
- Assigns ALL MRs to that Manager
- Shows verification and DCR reports

**How to use:**
1. Make sure MySQL is running
2. Double-click `quick_assign_mrs.bat`
3. Wait for it to complete
4. Refresh the Reports & Feedbacks page

**When to use:**
- You have only one Manager
- You want to assign all MRs quickly
- You don't want to type anything

---

## Script 2: assign_mrs.bat (Interactive)

**What it does:**
- Shows all Managers in your database
- Asks you to choose which Manager
- Assigns all MRs to the selected Manager
- Shows verification and DCR reports

**How to use:**
1. Make sure MySQL is running
2. Double-click `assign_mrs.bat`
3. Look at the list of Managers
4. Copy and paste the exact Manager name
5. Confirm with 'Y'
6. Wait for it to complete
7. Refresh the Reports & Feedbacks page

**When to use:**
- You have multiple Managers
- You want to choose which Manager gets the MRs
- You want more control

---

## Prerequisites

Both scripts require:
- ✅ MySQL installed and running
- ✅ Database: `farmatrack`
- ✅ Username: `root`
- ✅ Password: `root`

If your MySQL credentials are different, edit the scripts and change these lines:
```batch
set DB_USER=root
set DB_PASS=root
```

---

## Troubleshooting

### Error: "mysql is not recognized"

**Problem:** MySQL command-line tools not in PATH

**Solution:**
1. Find your MySQL installation (usually `C:\Program Files\MySQL\MySQL Server 8.0\bin`)
2. Add it to your PATH, OR
3. Run the script from that directory, OR
4. Use MySQL Workbench instead (see manual method below)

### Error: "Access denied"

**Problem:** Wrong MySQL credentials

**Solution:**
Edit the script and update:
```batch
set DB_USER=your_username
set DB_PASS=your_password
```

### Error: "Can't connect to MySQL server"

**Problem:** MySQL is not running

**Solution:**
1. Open Services (Win + R, type `services.msc`)
2. Find "MySQL" service
3. Start it

---

## Manual Method (If Scripts Don't Work)

If the scripts don't work, you can do it manually:

1. **Open MySQL Workbench**
2. **Connect to localhost**
3. **Select `farmatrack` database**
4. **Run this SQL:**
   ```sql
   -- Find manager name
   SELECT name FROM app_user WHERE role = 'Manager';
   
   -- Assign MRs (replace 'ManagerName' with actual name)
   UPDATE app_user 
   SET assigned_manager = 'ManagerName'
   WHERE role = 'MR';
   
   -- Verify
   SELECT name, assigned_manager FROM app_user WHERE role = 'MR';
   ```

---

## After Running the Script

1. **Refresh the Manager's Reports & Feedbacks page**
2. **Press Ctrl + Shift + R** (hard refresh)
3. **You should see:**
   - No more "You have no MRs assigned" alert
   - DCR reports in the table (if MRs have submitted any)
   - Or "No reports found" if MRs haven't submitted DCRs yet

---

## What's Next?

If you still see "No reports found" after assignment:
- It means the MRs haven't submitted any DCR reports yet
- Login as an MR and submit a test DCR
- Then check the Manager's Reports & Feedbacks page again

---

## Summary

**Easiest way:** Just double-click `quick_assign_mrs.bat` and you're done! 🚀
