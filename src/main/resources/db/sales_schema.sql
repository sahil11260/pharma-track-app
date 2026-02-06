-- Sales Target & Achievement Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS sales_achievements;
DROP TABLE IF EXISTS sales_targets;

-- Create sales_targets table
CREATE TABLE sales_targets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    mr_id BIGINT NOT NULL,
    mr_name VARCHAR(255) NOT NULL,
    product_id BIGINT,
    product_name VARCHAR(255) NOT NULL,
    target_type VARCHAR(50) NOT NULL DEFAULT 'MONTHLY',
    target_units INT NOT NULL,
    assigned_date DATE NOT NULL,
    period_month INT NOT NULL,
    period_year INT NOT NULL,
    assigned_by VARCHAR(255),
    CONSTRAINT chk_month CHECK (period_month BETWEEN 1 AND 12),
    CONSTRAINT chk_year CHECK (period_year >= 2020),
    INDEX idx_mr_period (mr_id, period_month, period_year),
    INDEX idx_period (period_month, period_year)
);

-- Create sales_achievements table
CREATE TABLE sales_achievements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    mr_id BIGINT NOT NULL,
    mr_name VARCHAR(255) NOT NULL,
    product_id BIGINT,
    product_name VARCHAR(255) NOT NULL,
    achieved_units INT NOT NULL DEFAULT 0,
    achievement_date DATE NOT NULL,
    period_month INT NOT NULL,
    period_year INT NOT NULL,
    remarks VARCHAR(500),
    CONSTRAINT chk_ach_month CHECK (period_month BETWEEN 1 AND 12),
    CONSTRAINT chk_ach_year CHECK (period_year >= 2020),
    CONSTRAINT chk_achieved_units CHECK (achieved_units >= 0),
    INDEX idx_ach_mr_period (mr_id, period_month, period_year),
    INDEX idx_ach_period (period_month, period_year)
);

-- Sample data for testing (February 2026)
INSERT INTO sales_targets (mr_id, mr_name, product_id, product_name, target_type, target_units, assigned_date, period_month, period_year, assigned_by)
VALUES
(1, 'Nikita Garule', 101, 'Cetrizin - 10mg', 'MONTHLY', 1000, '2026-01-07', 2, 2026, 'Regional Manager'),
(2, 'Rahul Sharma', 102, 'Amlo-5', 'MONTHLY', 2000, '2026-01-07', 2, 2026, 'Regional Manager'),
(3, 'Rajesh Kumar', 103, 'Diabetex 500mg', 'MONTHLY', 500, '2026-01-22', 2, 2026, 'Regional Manager'),
(4, 'Priya Sharma', 104, 'CardioCare 10mg', 'MONTHLY', 600, '2026-01-22', 2, 2026, 'Regional Manager');

-- Sample achievements
INSERT INTO sales_achievements (mr_id, mr_name, product_id, product_name, achieved_units, achievement_date, period_month, period_year, remarks)
VALUES
(1, 'Nikita Garule', 101, 'Cetrizin - 10mg', 750, '2026-02-01', 2, 2026, 'Sales from hospital visits'),
(2, 'Rahul Sharma', 102, 'Amlo-5', 1800, '2026-02-01', 2, 2026, 'Excellent performance'),
(3, 'Rajesh Kumar', 103, 'Diabetex 500mg', 450, '2026-02-01', 2, 2026, 'Good progress'),
(4, 'Priya Sharma', 104, 'CardioCare 10mg', 300, '2026-02-01', 2, 2026, 'Needs improvement');

-- Verify data
SELECT 'Sales Targets' as TableName, COUNT(*) as RecordCount FROM sales_targets
UNION ALL
SELECT 'Sales Achievements', COUNT(*) FROM sales_achievements;

-- Show summary
SELECT 
    st.mr_name,
    st.product_name,
    st.target_units,
    COALESCE(sa.achieved_units, 0) as achieved_units,
    ROUND((COALESCE(sa.achieved_units, 0) * 100.0 / st.target_units), 2) as achievement_percentage,
    CASE 
        WHEN (COALESCE(sa.achieved_units, 0) * 100.0 / st.target_units) >= 90 THEN 'Excellent'
        WHEN (COALESCE(sa.achieved_units, 0) * 100.0 / st.target_units) >= 75 THEN 'Good'
        WHEN (COALESCE(sa.achieved_units, 0) * 100.0 / st.target_units) >= 50 THEN 'Average'
        ELSE 'Poor'
    END as status
FROM sales_targets st
LEFT JOIN sales_achievements sa ON 
    st.mr_id = sa.mr_id AND 
    st.product_id = sa.product_id AND 
    st.period_month = sa.period_month AND 
    st.period_year = sa.period_year
WHERE st.period_month = 2 AND st.period_year = 2026
ORDER BY achievement_percentage DESC;
