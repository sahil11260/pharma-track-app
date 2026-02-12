-- Check the actual data in the expenses table
SELECT id, category, amount, status, mr_name, date 
FROM app_mr_expense 
LIMIT 10;

-- Check the data type of the amount column
DESCRIBE app_mr_expense;

-- If amounts are stored as strings with currency symbols, we need to clean them
-- This query will show if there are any non-numeric characters
SELECT id, amount, 
       CAST(REPLACE(REPLACE(amount, '₹', ''), ',', '') AS DECIMAL(10,2)) as cleaned_amount
FROM app_mr_expense
WHERE amount IS NOT NULL;
