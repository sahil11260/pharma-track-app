-- Final Setup for farmatrack database
USE farmatrack;

-- Clear existing data to avoid conflicts
DELETE FROM sales_achievements;
DELETE FROM sales_targets;

-- Insert sample targets for real MRs found in database (IDs: 5, 7, 8)
INSERT INTO sales_targets (mr_id, mr_name, product_id, product_name, target_type, target_units, assigned_date, period_month, period_year, assigned_by, category)
VALUES
(5, 'Mangal Pandey', 101, 'Cetrizin - 10mg', 'MONTHLY', 1000, '2026-02-07', 2, 2026, 'Regional Manager', 'Medicine'),
(7, 'fddsf', 102, 'Amlo-5', 'MONTHLY', 2000, '2026-02-07', 2, 2026, 'Regional Manager', 'Cardio'),
(8, 'fddsf', 103, 'Diabetex 500mg', 'MONTHLY', 500, '2026-02-07', 2, 2026, 'Regional Manager', 'Diabetes');

-- Insert sample achievements
INSERT INTO sales_achievements (mr_id, mr_name, product_id, product_name, achieved_units, achievement_date, period_month, period_year, remarks)
VALUES
(5, 'Mangal Pandey', 101, 'Cetrizin - 10mg', 750, '2026-02-07', 2, 2026, 'Sales from hospital visits'),
(7, 'fddsf', 102, 'Amlo-5', 1800, '2026-02-07', 2, 2026, 'Excellent performance'),
(8, 'fddsf', 103, 'Diabetex 500mg', 450, '2026-02-07', 2, 2026, 'Good progress');

-- Verify
SELECT 'Targets' as Type, COUNT(*) as Count FROM sales_targets
UNION ALL
SELECT 'Achievements' as Type, COUNT(*) as Count FROM sales_achievements;
