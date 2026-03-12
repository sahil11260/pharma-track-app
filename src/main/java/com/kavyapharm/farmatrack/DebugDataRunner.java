package com.kavyapharm.farmatrack;

import com.kavyapharm.farmatrack.dcr.repository.DcrRepository;
import com.kavyapharm.farmatrack.mrstock.repository.MrStockRepository;
import com.kavyapharm.farmatrack.user.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DebugDataRunner implements CommandLineRunner {
    private final DcrRepository dcrRepository;
    private final MrStockRepository mrStockRepository;
    private final UserRepository userRepository;

    public DebugDataRunner(DcrRepository dcrRepository, MrStockRepository mrStockRepository,
            UserRepository userRepository) {
        this.dcrRepository = dcrRepository;
        this.mrStockRepository = mrStockRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("--- DEBUG USER DATA ---");
        userRepository.findAll().forEach(u -> {
            System.out.println("User: [" + u.getName() + "], Email: [" + u.getEmail() + "], Role: " + u.getRole());
        });

        System.out.println("--- DEBUG DCR DATA ---");
        dcrRepository.findAll().forEach(d -> {
            StringBuilder sb = new StringBuilder();
            if (d.getSamplesGiven() != null) {
                d.getSamplesGiven().forEach(s -> sb.append(s.getProductName()).append("(").append(s.getProductId())
                        .append(":").append(s.getQuantity()).append("), "));
            }
            System.out.println(
                    "DCR ID: " + d.getReportId() + ", MR: [" + d.getMrName() + "], Samples: [" + sb.toString() + "]");
        });

        System.out.println("--- DEBUG MR STOCK DATA ---");
        mrStockRepository.findAll().forEach(s -> {
            System.out.println("Stock Item ID: [" + s.getProductId() + "], Name: " + s.getName() + ", MR: [" + s.getUserName()
                    + "], Qty: " + s.getStock());
        });
        System.out.println("--- END DEBUG DATA ---");
    }
}
