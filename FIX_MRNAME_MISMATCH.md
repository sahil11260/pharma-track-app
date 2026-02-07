# Quick Database Diagnostic Script

## Run these SQL queries in MySQL to check your data:

```sql
-- 1. Check what user you're logged in as
SELECT id, name, email, role FROM app_user WHERE role = 'MR';

-- 2. Check DCR records and their mr_name values
SELECT report_id, visit_title, doctor_name, mr_name, date_time 
FROM app_dcr 
ORDER BY report_id DESC 
LIMIT 10;

-- 3. Check expense records and their mr_name values
SELECT id, category, amount, status, mr_name, date 
FROM app_mr_expense 
ORDER BY id DESC 
LIMIT 10;

-- 4. Check if mr_name matches between user and expenses
SELECT 
    u.name as user_name,
    u.email,
    COUNT(DISTINCT e.id) as expense_count,
    SUM(CASE WHEN e.status = 'Pending' THEN e.amount ELSE 0 END) as pending_total,
    SUM(CASE WHEN e.status = 'Approved' THEN e.amount ELSE 0 END) as approved_total
FROM app_user u
LEFT JOIN app_mr_expense e ON LOWER(TRIM(u.name)) = LOWER(TRIM(e.mr_name))
WHERE u.role = 'MR'
GROUP BY u.id, u.name, u.email;

-- 5. Check if mr_name matches between user and DCR
SELECT 
    u.name as user_name,
    u.email,
    COUNT(d.report_id) as dcr_count
FROM app_user u
LEFT JOIN app_dcr d ON LOWER(TRIM(u.name)) = LOWER(TRIM(d.mr_name))
WHERE u.role = 'MR'
GROUP BY u.id, u.name, u.email;
```

## Expected Results:

If everything is correct, you should see:
- Query 1: Your MR user with name and email
- Query 2: Your DCR records with mr_name matching your user name
- Query 3: Your expense records with mr_name matching your user name
- Query 4: Should show expense_count = 2, pending_total = 20, approved_total = 100
- Query 5: Should show dcr_count = 2

## Common Issues:

### Issue 1: mr_name is NULL
If mr_name is NULL in expenses or DCR, update it:
```sql
-- Update expenses (replace 'YourName' with your actual user name)
UPDATE app_mr_expense SET mr_name = 'YourName' WHERE mr_name IS NULL;

-- Update DCR (replace 'YourName' with your actual user name)
UPDATE app_dcr SET mr_name = 'YourName' WHERE mr_name IS NULL;
```

### Issue 2: mr_name doesn't match user name
If mr_name is different from your user name, update it:
```sql
-- First, find your exact user name
SELECT name FROM app_user WHERE email = 'your@email.com';

-- Then update expenses to match
UPDATE app_mr_expense SET mr_name = (SELECT name FROM app_user WHERE email = 'your@email.com' LIMIT 1);

-- And update DCR to match
UPDATE app_dcr SET mr_name = (SELECT name FROM app_user WHERE email = 'your@email.com' LIMIT 1);
```

### Issue 3: Extra spaces in mr_name
```sql
-- Clean up any extra spaces
UPDATE app_mr_expense SET mr_name = TRIM(mr_name);
UPDATE app_dcr SET mr_name = TRIM(mr_name);
```

## After Running Fixes:

1. Refresh the MR Dashboard page (Ctrl + Shift + R)
2. Check the browser console (F12) for [MR-DASH] logs
3. Check the backend terminal for [MR-DASHBOARD] logs
4. The expense cards should now show the correct amounts!
