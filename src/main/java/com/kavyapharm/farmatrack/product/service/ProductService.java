package com.kavyapharm.farmatrack.product.service;

import com.kavyapharm.farmatrack.product.dto.CreateProductRequest;
import com.kavyapharm.farmatrack.product.dto.ProductResponse;
import com.kavyapharm.farmatrack.product.dto.UpdateProductRequest;
import com.kavyapharm.farmatrack.product.model.Product;
import com.kavyapharm.farmatrack.product.repository.ProductRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<ProductResponse> list() {
        return productRepository.findAll(Sort.by(Sort.Direction.DESC, "id"))
                .stream().map(ProductService::toResponse).toList();
    }

    public ProductResponse get(Long id) {
        Objects.requireNonNull(id, "id is required");
        return toResponse(getEntity(id));
    }

    public ProductResponse create(CreateProductRequest request) {
        System.out.println("DEBUG: Creating product: " + request.name());
        if (productRepository.findByName(request.name()).isPresent()) {
            throw new RuntimeException(
                    "Product cannot be created as its been already added as per the project standards");
        }

        // Create new product
        Product product = new Product();
        product.setName(request.name());
        product.setCategory(request.category());
        product.setPrice(request.price());
        product.setStock(request.stock());
        product.setDescription(request.description());
        product.setExpiryDate(request.expiryDate());
        return toResponse(productRepository.save(product));
    }

    public ProductResponse update(Long id, UpdateProductRequest request) {
        Objects.requireNonNull(id, "id is required");
        Product product = getEntity(id);

        product.setName(request.name());
        product.setCategory(request.category());
        product.setPrice(request.price());
        // Standard absolute update (Frontend handles calculation for addition)
        product.setStock(request.stock());
        product.setDescription(request.description());
        product.setExpiryDate(request.expiryDate());

        return toResponse(productRepository.save(product));
    }

    public void delete(Long id) {
        Objects.requireNonNull(id, "id is required");
        if (!productRepository.existsById(id)) {
            return;
        }
        productRepository.deleteById(id);
    }

    private Product getEntity(Long id) {
        Objects.requireNonNull(id, "id is required");
        return productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
    }

    public static ProductResponse toResponse(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getCategory(),
                product.getPrice(),
                product.getStock(),
                product.getDescription(),
                product.getExpiryDate());
    }
}
