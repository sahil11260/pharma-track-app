-- Expense Management Module - Database Schema

-- Create expenses table
CREATE TABLE expenses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    mr_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DOUBLE NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    receipt_path VARCHAR(500),
    receipt_filename VARCHAR(255),
    submitted_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_date TIMESTAMP NULL,
    approved_by VARCHAR(255),
    rejection_reason TEXT,
    INDEX idx_mr_name (mr_name),
    INDEX idx_status (status),
    INDEX idx_expense_date (expense_date),
    INDEX idx_submitted_date (submitted_date)
);

-- Sample data for testing
INSERT INTO expenses (mr_name, category, amount, description, expense_date, status, submitted_date) VALUES
('Rajesh Kumar', 'Travel', 2500.00, 'Taxi fare for doctor visits', '2025-11-06', 'PENDING', '2025-11-06 10:30:00'),
('Priya Sharma', 'Meals', 450.00, 'Lunch with Dr. Verma to discuss product launch', '2025-11-08', 'APPROVED', '2025-11-08 14:15:00'),
('Amit Singh', 'Accommodation', 3200.00, 'Hotel stay for regional conference', '2025-11-10', 'PENDING', '2025-11-10 09:00:00'),
('Sneha Patel', 'Travel', 1800.00, 'Fuel expenses for field visits', '2025-11-12', 'REJECTED', '2025-11-12 16:45:00'),
('Rajesh Kumar', 'Marketing', 5000.00, 'Promotional materials for doctor clinics', '2025-11-15', 'APPROVED', '2025-11-15 11:20:00');

-- Update approved expenses with approval details
UPDATE expenses 
SET approved_by = 'Manager', approved_date = '2025-11-09 10:00:00' 
WHERE status = 'APPROVED';

UPDATE expenses 
SET approved_by = 'Manager', approved_date = '2025-11-13 09:30:00', rejection_reason = 'Exceeds monthly fuel budget limit' 
WHERE status = 'REJECTED';
