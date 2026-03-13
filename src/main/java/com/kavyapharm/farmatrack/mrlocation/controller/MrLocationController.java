package com.kavyapharm.farmatrack.mrlocation.controller;

import com.kavyapharm.farmatrack.mrlocation.dto.MrLocationResponse;
import com.kavyapharm.farmatrack.mrlocation.dto.MrLocationUpdateRequest;
import com.kavyapharm.farmatrack.mrlocation.service.MrLocationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/mr-locations")
public class MrLocationController {

    private final MrLocationService mrLocationService;

    public MrLocationController(MrLocationService mrLocationService) {
        this.mrLocationService = mrLocationService;
    }

    @PostMapping("/me")
    public ResponseEntity<Void> updateMyLocation(@RequestBody MrLocationUpdateRequest request) {
        mrLocationService.updateMyLocation(request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public List<MrLocationResponse> listForManager(
            @RequestParam(value = "manager", required = false) String manager,
            @RequestParam(value = "mrId", required = false) Long mrId) {
        return mrLocationService.listForManager(manager, mrId);
    }
}
