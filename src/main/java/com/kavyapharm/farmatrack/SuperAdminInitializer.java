package com.kavyapharm.farmatrack;

import com.kavyapharm.farmatrack.user.model.UserRole;
import com.kavyapharm.farmatrack.user.model.UserStatus;
import com.kavyapharm.farmatrack.user.repository.UserRepository;
import com.kavyapharm.farmatrack.product.repository.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("!test")
public class SuperAdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public SuperAdminInitializer(UserRepository userRepository, 
                                 ProductRepository productRepository,
                                 BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        initializeSuperAdmin();
        initializeProducts();
    }

    private void initializeSuperAdmin() {
        var existing = userRepository.findByEmailIgnoreCase("superadmin@kavyapharm.com");

        if (existing.isEmpty()) {
            var superadmin = new com.kavyapharm.farmatrack.user.model.User();
            superadmin.setName("SuperAdmin");
            superadmin.setEmail("superadmin@kavyapharm.com");
            superadmin.setPasswordHash(passwordEncoder.encode("Superadmin@123"));
            superadmin.setRole(UserRole.SUPERADMIN);
            superadmin.setStatus(UserStatus.ACTIVE);
            superadmin.setTerritory("Head Office");
            superadmin.setPhone("0000000000");
            userRepository.save(superadmin);
            return;
        }

        var superadmin = existing.get();
        superadmin.setPasswordHash(passwordEncoder.encode("Superadmin@123"));
        superadmin.setRole(UserRole.SUPERADMIN);
        superadmin.setStatus(UserStatus.ACTIVE);
        userRepository.save(superadmin);
    }

    private void initializeProducts() {
        if (productRepository.count() == 0) {
            saveProduct("PAN-D", "Capsule", "15.5", 500, "For acidity");
            saveProduct("AMLO-5", "Tablet", "5.0", 1000, "For blood pressure");
            saveProduct("CAL-600", "Tablet", "12.0", 300, "Calcium supplement");
            System.out.println("DEBUG: Product data initialized.");
        }
    }

    private void saveProduct(String name, String category, String price, Integer stock, String desc) {
        var p = new com.kavyapharm.farmatrack.product.model.Product();
        p.setName(name);
        p.setCategory(category);
        p.setPrice(price);
        p.setStock(stock);
        p.setDescription(desc);
        productRepository.save(p);
    }
}