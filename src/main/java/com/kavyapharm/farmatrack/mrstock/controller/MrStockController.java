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
    public List<MrStockItemResponse> list(@RequestParam(required = false) String userName) {
        if (userName != null && !userName.isBlank()) {
            return mrStockService.listForUser(userName);
        }
        return mrStockService.list();
    }

    @GetMapping("/{id}")
    public MrStockItemResponse get(@PathVariable String id, @RequestParam String userName) {
        return mrStockService.get(id, userName);
    }

    @PutMapping("/{id}")
    public MrStockItemResponse update(@PathVariable String id, @RequestParam String userName,
            @Valid @RequestBody UpdateMrStockItemRequest request) {
        return mrStockService.update(id, userName, request);
    }

    @PostMapping
    public ResponseEntity<MrStockItemResponse> create(@RequestParam String userName,
            @Valid @RequestBody CreateMrStockItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mrStockService.create(request, userName));
    }
}
