package com.kavyapharm.farmatrack;

import com.kavyapharm.farmatrack.product.model.Product;
import com.kavyapharm.farmatrack.product.repository.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class InspectProductsRunner implements CommandLineRunner {

    private final ProductRepository repository;

    public InspectProductsRunner(ProductRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=== CORE PRODUCTS INSPECTION ===");
        List<Product> all = repository.findAll();
        for (Product p : all) {
            System.out.println("ID: [" + p.getId() + "] | Name: [" + p.getName() + "]");
        }
        System.out.println("================================");
    }
}
