package com.kavyapharm.farmatrack.distribution.service;

import com.kavyapharm.farmatrack.distribution.model.Distribution;
import com.kavyapharm.farmatrack.distribution.repository.DistributionRepository;
import com.kavyapharm.farmatrack.dto.CreateDistributionRequest;
import com.kavyapharm.farmatrack.mrstock.service.MrStockService;
import com.kavyapharm.farmatrack.stockreceived.dto.CreateStockReceivedEntryRequest;
import com.kavyapharm.farmatrack.stockreceived.service.StockReceivedService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class DistributionService {

    private final DistributionRepository distributionRepository;
    private final MrStockService mrStockService;
    private final StockReceivedService stockReceivedService;

    public DistributionService(DistributionRepository distributionRepository, 
                               MrStockService mrStockService,
                               StockReceivedService stockReceivedService) {
        this.distributionRepository = distributionRepository;
        this.mrStockService = mrStockService;
        this.stockReceivedService = stockReceivedService;
    }

    @Transactional
    public Distribution create(CreateDistributionRequest request) {
        // 1. Save the distribution record
        Distribution d = new Distribution();
        d.setProductId(request.productId());
        d.setProduct(request.product());
        d.setMr(request.mr());
        d.setQuantity(request.quantity());
        d.setRecipient(request.recipient());
        d.setNotes(request.notes());
        d.setUserName(request.userName());
        d.setDate(LocalDate.now());
        d.setStatus("completed");
        Distribution saved = distributionRepository.save(d);

        // 2. Adjust manager's stock (decrease)
        if (request.userName() != null && !request.userName().isBlank()) {
            try {
                mrStockService.adjustStockOrThrow(request.productId(), request.userName(), -request.quantity());
            } catch (Exception e) {
                // If manager stock is not initialized, we might want to allow it or fail.
                // For now, let's just log and continue if it's a manager.
            }
        }

        // 3. Adjust MR's stock (increase) AND create reception history
        // Creating reception history automatically calls mrStockService.adjustStockOrThrow for the MR.
        CreateStockReceivedEntryRequest receptionRequest = new CreateStockReceivedEntryRequest(
            request.productId(),
            request.quantity(),
            LocalDate.now().toString(),
            request.mr(),
            "Received from Manager: " + request.userName() + (request.notes() != null ? " - " + request.notes() : "")
        );
        stockReceivedService.create(receptionRequest);

        return saved;
    }

    public List<Distribution> list() {
        return distributionRepository.findAll();
    }

    public List<Distribution> listByUser(String userName) {
        if (userName == null || userName.isBlank()) {
            return list();
        }
        return distributionRepository.findAllByUserNameIgnoreCaseOrderByInternalIdDesc(userName);
    }
}

