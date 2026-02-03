package com.kavyapharm.farmatrack.distribution.controller;

import com.kavyapharm.farmatrack.distribution.model.Distribution;
import com.kavyapharm.farmatrack.distribution.service.DistributionService;
import com.kavyapharm.farmatrack.dto.CreateDistributionRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/distributions")
public class DistributionController {

    private final DistributionService distributionService;

    public DistributionController(DistributionService distributionService) {
        this.distributionService = distributionService;
    }

    @GetMapping
    public List<Distribution> list() {
        return distributionService.list();
    }

    @PostMapping
    public ResponseEntity<Distribution> create(@Valid @RequestBody CreateDistributionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(distributionService.create(request));
    }
}
