package com.kavyapharm.farmatrack;

import com.kavyapharm.farmatrack.mrstock.model.MrStockItem;
import com.kavyapharm.farmatrack.mrstock.repository.MrStockRepository;
import com.kavyapharm.farmatrack.distribution.model.Distribution;
import com.kavyapharm.farmatrack.distribution.repository.DistributionRepository;
import com.kavyapharm.farmatrack.stockreceived.model.StockReceivedEntry;
import com.kavyapharm.farmatrack.stockreceived.repository.StockReceivedRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;

import java.util.List;

@Component
@Order(15)
public class InspectStockRunner implements CommandLineRunner {

    private final MrStockRepository mrStockRepo;
    private final DistributionRepository distRepo;
    private final StockReceivedRepository receivedRepo;

    public InspectStockRunner(MrStockRepository mrStockRepo, DistributionRepository distRepo, StockReceivedRepository receivedRepo) {
        this.mrStockRepo = mrStockRepo;
        this.distRepo = distRepo;
        this.receivedRepo = receivedRepo;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=== MR STOCK INSPECTION ===");
        List<MrStockItem> allStock = mrStockRepo.findAll();
        for (MrStockItem item : allStock) {
            System.out.println("MR_STOCK: User: [" + item.getUserName() + "] | ProductID: [" + item.getProductId() + "] | Name: [" + item.getName() + "] | Stock: [" + item.getStock() + "]");
        }
        
        System.out.println("\n=== DISTRIBUTIONS ===");
        List<Distribution> dists = distRepo.findAll();
        for (Distribution d : dists) {
            System.out.println("DIST: From: [" + d.getUserName() + "] | To MR: [" + d.getMr() + "] | ProductID: [" + d.getProductId() + "] | Product: [" + d.getProduct() + "] | Qty: [" + d.getQuantity() + "]");
        }

        System.out.println("\n=== STOCK RECEIVED ===");
        List<StockReceivedEntry> recs = receivedRepo.findAll();
        for (StockReceivedEntry r : recs) {
            System.out.println("RECEIVED: User: [" + r.getUserName() + "] | ProductID: [" + r.getProductId() + "] | Qty: [" + r.getQuantity() + "]");
        }
        System.out.println("===========================");
    }
}
