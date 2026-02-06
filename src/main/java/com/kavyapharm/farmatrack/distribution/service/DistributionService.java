package com.kavyapharm.farmatrack.distribution.service;

import com.kavyapharm.farmatrack.distribution.model.Distribution;
import com.kavyapharm.farmatrack.distribution.repository.DistributionRepository;
import com.kavyapharm.farmatrack.dto.CreateDistributionRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class DistributionService {

    private final DistributionRepository distributionRepository;

    public DistributionService(DistributionRepository distributionRepository) {
        this.distributionRepository = distributionRepository;
    }

    public Distribution create(CreateDistributionRequest request) {
        Distribution d = new Distribution();
        d.setProduct(request.product());
        d.setMr(request.mr());
        d.setQuantity(request.quantity());
        d.setRecipient(request.recipient());
        d.setNotes(request.notes());
        d.setUserName(request.userName());
        d.setDate(LocalDate.now());
        d.setStatus("completed");
        return distributionRepository.save(d);
    }

    public List<Distribution> list() {
        return distributionRepository.findAll();
    }

    public List<Distribution> listByUser(String userName) {
        return distributionRepository.findAll().stream()
                .filter(d -> userName == null || userName.isBlank()
                        || (d.getUserName() != null && d.getUserName().equals(userName)))
                .toList();
    }
}
