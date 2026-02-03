package com.kavyapharm.farmatrack.mrstock.controller;

import com.kavyapharm.farmatrack.mrstock.dto.MrStockItemResponse;
import com.kavyapharm.farmatrack.mrstock.dto.CreateMrStockItemRequest;
import com.kavyapharm.farmatrack.mrstock.dto.UpdateMrStockItemRequest;
import com.kavyapharm.farmatrack.mrstock.service.MrStockService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mr-stock")
public class MrStockController {

    private final MrStockService mrStockService;

    public MrStockController(MrStockService mrStockService) {
        this.mrStockService = mrStockService;
    }

    @GetMapping
    public List<MrStockItemResponse> list() {
        return mrStockService.list();
    }

    @GetMapping("/{id}")
    public MrStockItemResponse get(@PathVariable String id) {
        return mrStockService.get(id);
    }

    @PutMapping("/{id}")
    public MrStockItemResponse update(@PathVariable String id, @Valid @RequestBody UpdateMrStockItemRequest request) {
        return mrStockService.update(id, request);
    }

    @PostMapping
    public ResponseEntity<MrStockItemResponse> create(@Valid @RequestBody CreateMrStockItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mrStockService.create(request));
    }
}
