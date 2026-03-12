package com.kavyapharm.farmatrack;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;

import java.util.List;
import java.util.Map;

@Component
@Order(10)
public class InspectTableRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public InspectTableRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=== ALL TABLES ===");
        try {
            List<String> tables = jdbcTemplate.queryForList("SHOW TABLES", String.class);
            for (String table : tables) {
                describeTable(table);
            }
        } catch (Exception e) {
            System.err.println("Failed to show tables: " + e.getMessage());
        }
    }

    private void describeTable(String tableName) {
        System.out.println("=== TABLE STRUCTURE: " + tableName + " ===");
        try {
            List<Map<String, Object>> columns = jdbcTemplate.queryForList("DESCRIBE " + tableName);
            for (Map<String, Object> col : columns) {
                System.out.println("Field: [" + col.get("Field") + "] | Type: [" + col.get("Type") + "] | Null: [" + col.get("Null") + "] | Key: [" + col.get("Key") + "] | Default: [" + col.get("Default") + "]");
            }
        } catch (Exception e) {
            System.err.println("Failed to describe table " + tableName + ": " + e.getMessage());
        }
        System.out.println("================================");
    }
}
