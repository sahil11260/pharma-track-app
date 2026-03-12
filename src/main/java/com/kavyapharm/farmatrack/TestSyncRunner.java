package com.kavyapharm.farmatrack;

import com.kavyapharm.farmatrack.stockreceived.dto.CreateStockReceivedEntryRequest;
import com.kavyapharm.farmatrack.stockreceived.service.StockReceivedService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;

@Component
@Order(100)
public class TestSyncRunner implements CommandLineRunner {

    private final StockReceivedService service;

    public TestSyncRunner(StockReceivedService service) {
        this.service = service;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=== TESTING MANUAL SYNC ===");
        try {
            service.create(new CreateStockReceivedEntryRequest(
                "4", 
                5, 
                "2026-03-12", 
                "mohit patil", 
                "Manual test sync"
            ));
            System.out.println("Manual sync successful for product 4");
        } catch (Exception e) {
            System.err.println("Manual sync FAILED for product 4: " + e.getMessage());
            e.printStackTrace();
        }
        System.out.println("===========================");
    }
}
