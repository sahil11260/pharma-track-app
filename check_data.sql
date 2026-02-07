-- Check if there's data in the DCR table
SELECT COUNT(*) as total_dcrs FROM app_dcr;

-- Check DCRs grouped by MR name
SELECT mr_name, COUNT(*) as dcr_count 
FROM app_dcr 
GROUP BY mr_name;

-- Show sample DCR data
SELECT report_id, visit_title, doctor_name, mr_name, date_time 
FROM app_dcr 
LIMIT 10;

-- Check expenses
SELECT COUNT(*) as total_expenses FROM mr_expenses;

-- Check expenses by MR name
SELECT mr_name, status, COUNT(*) as count, SUM(amount) as total_amount
FROM mr_expenses
GROUP BY mr_name, status;
