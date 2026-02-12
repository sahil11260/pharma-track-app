-- Quick Setup: Copy and paste these into MySQL Workbench or phpMyAdmin

USE kavyapharm_db;

-- Create sales_targets table
CREATE TABLE IF NOT EXISTS sales_targets (
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
    INDEX idx_mr_period (mr_id, period_month, period_year),
    INDEX idx_period (period_month, period_year)
);

-- Create sales_achievements table
CREATE TABLE IF NOT EXISTS sales_achievements (
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
    INDEX idx_ach_mr_period (mr_id, period_month, period_year),
    INDEX idx_ach_period (period_month, period_year)
);

-- Insert sample data (February 2026)
INSERT INTO sales_targets (mr_id, mr_name, product_id, product_name, target_type, target_units, assigned_date, period_month, period_year, assigned_by)
VALUES
(1, 'Nikita Garule', 101, 'Cetrizin - 10mg', 'MONTHLY', 1000, '2026-01-07', 2, 2026, 'Regional Manager'),
(2, 'Rahul Sharma', 102, 'Amlo-5', 'MONTHLY', 2000, '2026-01-07', 2, 2026, 'Regional Manager'),
(3, 'Rajesh Kumar', 103, 'Diabetex 500mg', 'MONTHLY', 500, '2026-01-22', 2, 2026, 'Regional Manager'),
(4, 'Priya Sharma', 104, 'CardioCare 10mg', 'MONTHLY', 600, '2026-01-22', 2, 2026, 'Regional Manager');

-- Insert sample achievements
INSERT INTO sales_achievements (mr_id, mr_name, product_id, product_name, achieved_units, achievement_date, period_month, period_year, remarks)
VALUES
(1, 'Nikita Garule', 101, 'Cetrizin - 10mg', 750, '2026-02-01', 2, 2026, 'Sales from hospital visits'),
(2, 'Rahul Sharma', 102, 'Amlo-5', 1800, '2026-02-01', 2, 2026, 'Excellent performance'),
(3, 'Rajesh Kumar', 103, 'Diabetex 500mg', 450, '2026-02-01', 2, 2026, 'Good progress'),
(4, 'Priya Sharma', 104, 'CardioCare 10mg', 300, '2026-02-01', 2, 2026, 'Needs improvement');

-- Verify
SELECT COUNT(*) as targets_count FROM sales_targets;
SELECT COUNT(*) as achievements_count FROM sales_achievements;

SELECT 'Tables created successfully!' as status;
