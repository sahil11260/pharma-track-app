-- Drop existing table if it exists with wrong schema
DROP TABLE IF EXISTS app_mr_location;

-- Recreate table with correct schema
CREATE TABLE app_mr_location (
    mr_id BIGINT PRIMARY KEY,
    mr_name VARCHAR(255) NOT NULL,
    territory VARCHAR(255),
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    accuracy DOUBLE,
    updated_at TIMESTAMP NOT NULL
);
