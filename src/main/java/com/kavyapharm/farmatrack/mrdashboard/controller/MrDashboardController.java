package com.kavyapharm.farmatrack.mrdashboard.controller;

import com.kavyapharm.farmatrack.mrdashboard.dto.MrDashboardResponse;
import com.kavyapharm.farmatrack.mrdashboard.service.MrDashboardService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mr-dashboard")
@CrossOrigin(origins = "*")
public class MrDashboardController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MrDashboardController.class);

    private final MrDashboardService mrDashboardService;

    public MrDashboardController(MrDashboardService mrDashboardService) {
        this.mrDashboardService = mrDashboardService;
    }

    @GetMapping
    public MrDashboardResponse get() {
        return mrDashboardService.get();
    }
}
