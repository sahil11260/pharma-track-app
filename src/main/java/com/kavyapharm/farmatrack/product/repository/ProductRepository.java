package com.kavyapharm.farmatrack.product.repository;

import com.kavyapharm.farmatrack.product.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByName(String name);
}
