package com.kavyapharm.farmatrack.mrstock.service;

import com.kavyapharm.farmatrack.mrstock.dto.MrStockItemResponse;
import com.kavyapharm.farmatrack.mrstock.dto.CreateMrStockItemRequest;
import com.kavyapharm.farmatrack.mrstock.dto.UpdateMrStockItemRequest;
import com.kavyapharm.farmatrack.mrstock.model.MrStockItem;
import com.kavyapharm.farmatrack.mrstock.repository.MrStockRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class MrStockService {

    private final MrStockRepository mrStockRepository;
    private final com.kavyapharm.farmatrack.product.repository.ProductRepository productRepository;

    public MrStockService(MrStockRepository mrStockRepository,
            com.kavyapharm.farmatrack.product.repository.ProductRepository productRepository) {
        this.mrStockRepository = mrStockRepository;
        this.productRepository = productRepository;
    }

    public List<MrStockItemResponse> list() {
        return mrStockRepository.findAll(Sort.by(Sort.Direction.ASC, "id"))
                .stream().map(MrStockService::toResponse).toList();
    }

    public List<MrStockItemResponse> listForUser(String userName) {
        if (userName == null || userName.isBlank()) {
            return list();
        }
        return mrStockRepository.findAllByUserName(userName)
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
        item.setId(request.id() != null ? request.id() : nextId());
        item.setName(request.name());
        item.setStock(request.stock() == null ? 0 : request.stock());
        item.setUserName(userName);
        return toResponse(mrStockRepository.save(item));
    }

    private String nextId() {
        // Fallback for ID generation if not provided
        int max = 0;
        for (MrStockItem it : mrStockRepository.findAll()) {
            String id = it.getId();
            if (id == null || !id.startsWith("P"))
                continue;
            try {
                int n = Integer.parseInt(id.substring(1));
                if (n > max)
                    max = n;
            } catch (Exception ignored) {
            }
        }
        return String.format("P%03d", max + 1);
    }

    public void adjustStockOrThrow(String productId, String userName, int delta) {
        Objects.requireNonNull(productId, "productId is required");

        Optional<MrStockItem> optItem = mrStockRepository.findByIdAndUserName(productId, userName);
        MrStockItem item;

        if (optItem.isPresent()) {
            item = optItem.get();
        } else {
            // Create new stock entry for this user
            item = new MrStockItem();
            item.setId(productId);
            item.setUserName(userName);

            String productName = "Product " + productId;
            try {
                Long pId = Long.parseLong(productId);
                productName = productRepository.findById(pId)
                        .map(com.kavyapharm.farmatrack.product.model.Product::getName)
                        .orElse(productName);
            } catch (Exception ignored) {
            }

            item.setName(productName);
            item.setStock(0);
        }

        int current = item.getStock() == null ? 0 : item.getStock();
        int next = current + delta;
        if (next < 0) {
            throw new IllegalArgumentException("Insufficient stock for product " + productId + " for user " + userName);
        }
        item.setStock(next);
        mrStockRepository.save(item);
    }

    private MrStockItem getEntity(String productId, String userName) {
        return mrStockRepository.findByIdAndUserName(productId, userName)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Stock item not found for product " + productId + " and user " + userName));
    }

    public static MrStockItemResponse toResponse(MrStockItem item) {
        return new MrStockItemResponse(item.getId(), item.getName(), item.getStock());
    }
}
