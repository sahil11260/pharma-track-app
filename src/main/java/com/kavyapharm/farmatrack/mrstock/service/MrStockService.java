package com.kavyapharm.farmatrack.mrstock.service;

import com.kavyapharm.farmatrack.mrstock.dto.CreateMrStockItemRequest;
import com.kavyapharm.farmatrack.mrstock.dto.MrStockItemResponse;
import com.kavyapharm.farmatrack.mrstock.dto.UpdateMrStockItemRequest;
import com.kavyapharm.farmatrack.mrstock.model.MrStockItem;
import com.kavyapharm.farmatrack.mrstock.repository.MrStockRepository;
import com.kavyapharm.farmatrack.product.repository.ProductRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Objects;

@Service
public class MrStockService {
    private static final Logger logger = LoggerFactory.getLogger(MrStockService.class);

    private final MrStockRepository mrStockRepository;
    private final ProductRepository productRepository;

    public MrStockService(MrStockRepository mrStockRepository, ProductRepository productRepository) {
        this.mrStockRepository = mrStockRepository;
        this.productRepository = productRepository;
    }

    public List<MrStockItemResponse> list() {
        return mrStockRepository.findAll(Sort.by(Sort.Direction.ASC, "productId"))
                .stream().map(MrStockService::toResponse).toList();
    }

    public List<MrStockItemResponse> listForUser(String userName) {
        if (userName == null || userName.isBlank()) {
            return list();
        }
        return mrStockRepository.findAllByUserNameIgnoreCase(userName)
                .stream().map(MrStockService::toResponse).toList();
    }

    public MrStockItemResponse get(String productId, String userName) {
        return toResponse(getEntity(productId, userName));
    }

    public MrStockItemResponse update(String productId, String userName, UpdateMrStockItemRequest request) {
        MrStockItem item = getEntity(productId, userName);
        item.setName(request.name());
        item.setStock(request.stock());
        return toResponse(mrStockRepository.save(item));
    }

    public MrStockItemResponse create(CreateMrStockItemRequest request, String userName) {
        MrStockItem item = new MrStockItem();
        item.setProductId(request.id() != null ? request.id() : nextId());
        item.setName(request.name());
        item.setStock(request.stock() == null ? 0 : request.stock());
        item.setUserName(userName);
        return toResponse(mrStockRepository.save(item));
    }

    private String nextId() {
        // Fallback for ID generation if not provided
        int max = 0;
        for (MrStockItem it : mrStockRepository.findAll()) {
            String pid = it.getProductId();
            if (pid == null || !pid.startsWith("P"))
                continue;
            try {
                int n = Integer.parseInt(pid.substring(1));
                if (n > max)
                    max = n;
            } catch (Exception ignored) {
            }
        }
        return String.format("P%03d", max + 1);
    }

    @Transactional
    public void adjustStockOrThrow(String productId, String investigatorName, int delta) {
        Objects.requireNonNull(productId, "productId is required");
        logger.info("Adjusting stock for product: {}, user: {}, delta: {}", productId, investigatorName, delta);
        MrStockItem item = mrStockRepository.findByProductIdAndUserNameIgnoreCase(productId, investigatorName)
                .orElseGet(() -> {
                    MrStockItem newItem = new MrStockItem();
                    newItem.setProductId(productId);
                    newItem.setUserName(investigatorName);
                    String productName = "Product " + productId;
                    try {
                        // First try parsing as ID
                        try {
                            Long pId = Long.parseLong(productId);
                            productName = productRepository.findById(pId)
                                    .map(com.kavyapharm.farmatrack.product.model.Product::getName)
                                    .orElse(productName);
                        } catch (NumberFormatException nfe) {
                            // Fallback: search by name directly if the ID looks like a name
                            productName = productRepository.findByName(productId)
                                    .map(com.kavyapharm.farmatrack.product.model.Product::getName)
                                    .orElse(productId);
                        }
                    } catch (Exception ignored) {
                    }
                    newItem.setName(productName);
                    newItem.setStock(0);
                    return newItem;
                });

        int current = item.getStock() == null ? 0 : item.getStock();
        int next = current + delta;
        if (next < 0) {
            throw new IllegalArgumentException("Insufficient stock for product " + productId + ". Available: " + current);
        }
        item.setStock(next);
        mrStockRepository.save(item);
    }

    private MrStockItem getEntity(String productId, String userName) {
        return mrStockRepository.findByProductIdAndUserNameIgnoreCase(productId, userName)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Stock item not found for productId " + productId + " and user " + userName));
    }

    public static MrStockItemResponse toResponse(MrStockItem item) {
        return new MrStockItemResponse(item.getProductId(), item.getName(), item.getStock());
    }
}
