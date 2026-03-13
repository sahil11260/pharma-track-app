package com.kavyapharm.farmatrack;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;

import java.util.List;
import java.util.Map;

@Component
@Order(1)
@Profile("!prod")
public class DatabaseCleanupRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseCleanupRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=== STARTING AGGRESSIVE DATABASE CLEANUP ===");

        // List of tables to clean
        String[] tables = { "app_mr_stock_items", "app_stock_received", "app_distribution" };

        for (String table : tables) {
            cleanTable(table);
        }

        System.out.println("=== AGGRESSIVE DATABASE CLEANUP FINISHED ===");
    }

    private void cleanTable(String tableName) {
        System.out.println("Processing table: " + tableName);
        try {
            List<Map<String, Object>> columns = jdbcTemplate.queryForList("DESCRIBE " + tableName);

            boolean hasInternalId = columns.stream()
                    .anyMatch(col -> "internal_id".equalsIgnoreCase(String.valueOf(col.get("Field"))));
            boolean hasId = columns.stream().anyMatch(col -> "id".equalsIgnoreCase(String.valueOf(col.get("Field"))));
            boolean hasProductId = columns.stream()
                    .anyMatch(col -> "product_id".equalsIgnoreCase(String.valueOf(col.get("Field"))));

            // 1. Ensure internal_id exists as PK
            if (!hasInternalId && hasId) {
                // Check if 'id' is currently the PK (it usually is)
                System.out.println("Renaming 'id' to 'internal_id' in " + tableName);
                jdbcTemplate
                        .execute("ALTER TABLE " + tableName + " CHANGE COLUMN id internal_id BIGINT AUTO_INCREMENT");
                hasInternalId = true;
                hasId = false;
            }

            // 2. Ensure 'id' exists as the string product code
            if (!hasId) {
                if (hasProductId) {
                    System.out.println("Renaming 'product_id' to 'id' in " + tableName);
                    jdbcTemplate.execute("ALTER TABLE " + tableName + " CHANGE COLUMN product_id id VARCHAR(20)");
                } else {
                    System.out.println("Adding 'id' column to " + tableName);
                    jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN id VARCHAR(20) AFTER internal_id");
                }
            } else {
                // Both 'id' and 'product_id' exist? Drop 'product_id'
                if (hasProductId) {
                    System.out.println("Dropping redundant 'product_id' from " + tableName);
                    jdbcTemplate.execute("ALTER TABLE " + tableName + " DROP COLUMN product_id");
                }
            }

        } catch (Exception e) {
            System.err.println("Error cleaning table " + tableName + ": " + e.getMessage());
        }
    }
}
