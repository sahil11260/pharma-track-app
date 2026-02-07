package com.kavyapharm.farmatrack.mrdashboard.controller;

import com.kavyapharm.farmatrack.mrdashboard.dto.MrDashboardResponse;
import com.kavyapharm.farmatrack.mrdashboard.service.MrDashboardService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mr-dashboard")
public class MrDashboardController {

    private final MrDashboardService mrDashboardService;

    public MrDashboardController(MrDashboardService mrDashboardService) {
        this.mrDashboardService = mrDashboardService;
    }

    @GetMapping
    public MrDashboardResponse get() {
        return mrDashboardService.get();
    }
}

