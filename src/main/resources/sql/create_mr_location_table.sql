-- Create table for MR locations
CREATE TABLE IF NOT EXISTS app_mr_location (
    mr_id BIGINT PRIMARY KEY,
    mr_name VARCHAR(255) NOT NULL,
    territory VARCHAR(255),
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    accuracy DOUBLE,
    updated_at TIMESTAMP NOT NULL
);
