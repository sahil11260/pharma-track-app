package com.kavyapharm.farmatrack;

import com.kavyapharm.farmatrack.mrstock.model.MrStockItem;
import com.kavyapharm.farmatrack.mrstock.repository.MrStockRepository;
import com.kavyapharm.farmatrack.product.repository.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@Order(5) // Run after DatabaseCleanupRunner (1) but before most others
public class DataRepairRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final ProductRepository productRepository;
    private final MrStockRepository mrStockRepository;

    public DataRepairRunner(JdbcTemplate jdbcTemplate, ProductRepository productRepository, MrStockRepository mrStockRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.productRepository = productRepository;
        this.mrStockRepository = mrStockRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=== STARTING DATA REPAIR (NULL PRODUCT IDS) ===");
        
        repairMrStockItems();
        repairStockReceived();
        repairDistributions();

        System.out.println("=== DATA REPAIR FINISHED ===");
    }

    private void repairMrStockItems() {
        System.out.println("Repairing app_mr_stock_items...");
        List<MrStockItem> items = mrStockRepository.findAll();
        for (MrStockItem item : items) {
            if (item.getProductId() == null || item.getProductId().isBlank() || "null".equals(item.getProductId())) {
                String name = item.getName();
                findProductIdByName(name).ifPresent(id -> {
                    System.out.println("Repairing MrStockItem [" + name + "]: setting ID to [" + id + "]");
                    item.setProductId(id);
                    mrStockRepository.save(item);
                });
            }
        }
    }

    private void repairStockReceived() {
        System.out.println("Repairing app_stock_received (null productIds)...");
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT internal_id, id, notes, quantity, user_name FROM app_stock_received WHERE id IS NULL OR id = '' OR id = 'null'");
            
            // Get all known products for name -> id lookup
            List<Map<String, Object>> products = jdbcTemplate.queryForList("SELECT id, name FROM app_product");
            // Get all distributions to cross-reference
            List<Map<String, Object>> distributions = jdbcTemplate.queryForList("SELECT id, mr, quantity FROM app_distribution WHERE id IS NOT NULL AND id != '' AND id != 'null'");
            
            for (Map<String, Object> row : rows) {
                Long internalId = ((Number) row.get("internal_id")).longValue();
                String notes = (String) row.get("notes");
                Object qtyObj = row.get("quantity");
                String userName = (String) row.get("user_name");
                int qty = qtyObj != null ? ((Number) qtyObj).intValue() : 0;
                boolean fixed = false;
                
                // Pass 1: Try to match any product name that appears in the notes text
                if (notes != null && !notes.isBlank()) {
                    for (Map<String, Object> product : products) {
                        String productName = (String) product.get("name");
                        Object productIdObj = product.get("id");
                        if (productName != null && productIdObj != null && notes.contains(productName)) {
                            String productId = String.valueOf(productIdObj);
                            System.out.println("Repairing StockReceived [" + internalId + "] via notes match -> productId=[" + productId + "]");
                            jdbcTemplate.update("UPDATE app_stock_received SET id = ? WHERE internal_id = ?", productId, internalId);
                            fixed = true;
                            break;
                        }
                    }
                }
                
                // Pass 2: Cross-reference with distributions (same mr/user + same quantity)
                if (!fixed && userName != null && qty > 0) {
                    for (Map<String, Object> dist : distributions) {
                        String mr = (String) dist.get("mr");
                        Object distQtyObj = dist.get("quantity");
                        String distProductId = (String) dist.get("id");
                        int distQty = distQtyObj != null ? ((Number) distQtyObj).intValue() : 0;
                        if (userName.equalsIgnoreCase(mr) && distQty == qty && distProductId != null) {
                            System.out.println("Repairing StockReceived [" + internalId + "] via distribution cross-ref (user=" + userName + ", qty=" + qty + ") -> productId=[" + distProductId + "]");
                            jdbcTemplate.update("UPDATE app_stock_received SET id = ? WHERE internal_id = ?", distProductId, internalId);
                            break;
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error repairing stock received: " + e.getMessage());
        }
    }

    private void repairDistributions() {
        System.out.println("Repairing app_distribution...");
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT internal_id, product FROM app_distribution WHERE id IS NULL OR id = '' OR id = 'null'");
            for (Map<String, Object> row : rows) {
                Long internalId = (Long) row.get("internal_id");
                String productName = (String) row.get("product");
                if (productName != null) {
                    findProductIdByName(productName).ifPresent(id -> {
                        System.out.println("Repairing Distribution [" + productName + "]: setting ID to [" + id + "]");
                        jdbcTemplate.update("UPDATE app_distribution SET id = ? WHERE internal_id = ?", id, internalId);
                    });
                }
            }
        } catch (Exception e) {
            System.err.println("Error repairing distributions: " + e.getMessage());
        }
    }

    private Optional<String> findProductIdByName(String name) {
        if (name == null) return Optional.empty();
        return productRepository.findByName(name)
                .map(p -> String.valueOf(p.getId()));
    }
}
