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
        return mrStockRepository.findAllByUserNameIgnoreCase(userName)
                .stream().map(MrStockService::toResponse).toList();
    }

    public MrStockItemResponse get(String id, String userName) {
        return toResponse(getEntity(id, userName));
    }

    public MrStockItemResponse update(String id, String userName, UpdateMrStockItemRequest request) {
        MrStockItem item = getEntity(id, userName);
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

    public void adjustStockOrThrow(String id, String investigatorName, int delta) {
        Objects.requireNonNull(id, "id is required");
        MrStockItem item = mrStockRepository.findByIdAndUserNameIgnoreCase(id, investigatorName)
                .orElseGet(() -> {
                    MrStockItem newItem = new MrStockItem();
                    newItem.setId(id);
                    newItem.setUserName(investigatorName);
                    String productName = "Product " + id;
                    try {
                        Long pId = Long.parseLong(id);
                        productName = productRepository.findById(pId)
                                .map(com.kavyapharm.farmatrack.product.model.Product::getName)
                                .orElse(productName);
                    } catch (Exception ignored) {
                    }
                    newItem.setName(productName);
                    newItem.setStock(0);
                    return newItem;
                });

        int current = item.getStock() == null ? 0 : item.getStock();
        int next = current + delta;
        if (next < 0) {
            throw new IllegalArgumentException("Insufficient stock for product " + id + ". Available: " + current);
        }
        item.setStock(next);
        mrStockRepository.save(item);
    }

    private MrStockItem getEntity(String id, String userName) {
        return mrStockRepository.findByIdAndUserNameIgnoreCase(id, userName)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Stock item not found for id " + id + " and user " + userName));
    }

    public static MrStockItemResponse toResponse(MrStockItem item) {
        return new MrStockItemResponse(item.getId(), item.getName(), item.getStock());
    }
}
