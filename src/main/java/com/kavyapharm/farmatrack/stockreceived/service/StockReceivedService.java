package com.kavyapharm.farmatrack.stockreceived.service;

import com.kavyapharm.farmatrack.mrstock.service.MrStockService;
import com.kavyapharm.farmatrack.stockreceived.dto.CreateStockReceivedEntryRequest;
import com.kavyapharm.farmatrack.stockreceived.dto.StockReceivedEntryResponse;
import com.kavyapharm.farmatrack.stockreceived.model.StockReceivedEntry;
import com.kavyapharm.farmatrack.stockreceived.repository.StockReceivedRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
public class StockReceivedService {

    private final StockReceivedRepository repository;
    private final MrStockService mrStockService;

    public StockReceivedService(StockReceivedRepository repository, MrStockService mrStockService) {
        this.repository = repository;
        this.mrStockService = mrStockService;
    }

    public List<StockReceivedEntryResponse> list(String productId, String userName) {
        // Simple manual filter for now to avoid repo changes if possible,
        // but it's better to update repo for scalability.
        return repository.findAll(Sort.by(Sort.Direction.DESC, "date"))
                .stream()
                .filter(e -> productId == null || productId.isBlank() || e.getProductId().equals(productId))
                .filter(e -> userName == null || userName.isBlank() || e.getUserName().equals(userName))
                .map(StockReceivedService::toResponse)
                .toList();
    }

    @Transactional
    public StockReceivedEntryResponse create(CreateStockReceivedEntryRequest request) {
        StockReceivedEntry entry = new StockReceivedEntry();
        entry.setProductId(request.productId());
        entry.setQuantity(request.quantity());
        entry.setDate(request.date());
        entry.setUserName(request.userName());
        entry.setNotes(request.notes());

        StockReceivedEntry saved = repository.save(entry);
        mrStockService.adjustStockOrThrow(request.productId(), request.userName(), request.quantity());

        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Objects.requireNonNull(id, "id is required");
        if (!repository.existsById(id)) {
            return;
        }
        StockReceivedEntry entry = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Stock received entry not found"));

        Integer qty = entry.getQuantity() == null ? 0 : entry.getQuantity();
        if (qty > 0) {
            mrStockService.adjustStockOrThrow(entry.getProductId(), entry.getUserName(), -qty);
        }
        repository.deleteById(id);
    }

    public static StockReceivedEntryResponse toResponse(StockReceivedEntry entry) {
        return new StockReceivedEntryResponse(entry.getId(), entry.getProductId(), entry.getQuantity(), entry.getDate(),
                entry.getUserName(), entry.getNotes());
    }
}
