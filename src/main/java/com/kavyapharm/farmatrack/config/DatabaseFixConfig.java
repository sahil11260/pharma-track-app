package com.kavyapharm.farmatrack.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@Order(2)
public class DatabaseFixConfig implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseFixConfig.class);
    private final JdbcTemplate jdbcTemplate;

    public DatabaseFixConfig(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        logger.info("Running Database Migration and Constraint Fixer...");
        String[] tables = {"app_distribution", "app_stock_received", "app_mr_stock_items", "app_task"};

        for (String table : tables) {
            // 0. Ensure product_id exists if ddl-auto failed (e.g. in tests)
            try {
                jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN product_id VARCHAR(255)");
            } catch (Exception e) {}

            // 1. Migrate id to product_id
            try {
                int rows = jdbcTemplate.update("UPDATE " + table + " SET product_id = id WHERE product_id IS NULL AND id IS NOT NULL");
                if (rows > 0) {
                    logger.info("Migrated {} rows in {}", rows, table);
                }
            } catch (Exception e) {
                // Column might not exist or already drop, ignore
            }

            // 2. Remove NOT NULL from id (PostgreSQL)
            try {
                jdbcTemplate.execute("ALTER TABLE " + table + " ALTER COLUMN id DROP NOT NULL");
            } catch (Exception e) {}

            // 3. Remove NOT NULL from id (MySQL)
            try {
                jdbcTemplate.execute("ALTER TABLE " + table + " MODIFY id VARCHAR(255) NULL");
            } catch (Exception e) {}

            // 4. Try syncing internal_id sequence (PostgreSQL) just in case! Highly common if data was restored.
            try {
                jdbcTemplate.execute(
                    "SELECT setval(pg_get_serial_sequence('" + table + "', 'internal_id'), " +
                    "coalesce(max(internal_id), 1), max(internal_id) IS NOT NULL) FROM " + table
                );
            } catch (Exception e) {}
        }
        logger.info("Database migration config finished.");
    }
}
