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

    public MrStockService(MrStockRepository mrStockRepository) {
        this.mrStockRepository = mrStockRepository;
    }

    public List<MrStockItemResponse> list() {
        ensureInitialized();
        return mrStockRepository.findAll(Sort.by(Sort.Direction.ASC, "id"))
                .stream().map(MrStockService::toResponse).toList();
    }

    public MrStockItemResponse get(String id) {
        Objects.requireNonNull(id, "id is required");
        ensureInitialized();
        return toResponse(getEntity(id));
    }

    public MrStockItemResponse update(String id, UpdateMrStockItemRequest request) {
        Objects.requireNonNull(id, "id is required");
        ensureInitialized();
        MrStockItem item = getEntity(id);
        item.setName(request.name());
        item.setStock(request.stock());
        return toResponse(mrStockRepository.save(item));
    }

    public MrStockItemResponse create(CreateMrStockItemRequest request) {
        Objects.requireNonNull(request, "request is required");
        ensureInitialized();

        String id = nextId();
        MrStockItem item = new MrStockItem();
        item.setId(id);
        item.setName(request.name());
        item.setStock(request.stock() == null ? 0 : request.stock());
        return toResponse(mrStockRepository.save(item));
    }

    private String nextId() {
        int max = 0;
        for (MrStockItem it : mrStockRepository.findAll()) {
            String id = it.getId();
            if (id == null) continue;
            String upper = id.toUpperCase();
            if (!upper.startsWith("P")) continue;
            String digits = upper.substring(1).replaceAll("[^0-9]", "");
            if (digits.isBlank()) continue;
            try {
                int n = Integer.parseInt(digits);
                if (n > max) max = n;
            } catch (NumberFormatException ignored) {
            }
        }
        return String.format("P%03d", max + 1);
    }

    public void adjustStockOrThrow(String productId, int delta) {
        Objects.requireNonNull(productId, "productId is required");
        ensureInitialized();
        MrStockItem item = getEntity(productId);

        int current = item.getStock() == null ? 0 : item.getStock();
        int next = current + delta;
        if (next < 0) {
            throw new IllegalArgumentException("Insufficient stock for product " + productId);
        }
        item.setStock(next);
        mrStockRepository.save(item);
    }

    private MrStockItem getEntity(String id) {
        Objects.requireNonNull(id, "id is required");
        return mrStockRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Stock item not found"));
    }

    private void ensureInitialized() {
        if (mrStockRepository.count() > 0) {
            return;
        }
    }

    public static MrStockItemResponse toResponse(MrStockItem item) {
        return new MrStockItemResponse(item.getId(), item.getName(), item.getStock());
    }
}
