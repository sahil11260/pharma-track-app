package com.kavyapharm.farmatrack.dashboard.controller;

import com.kavyapharm.farmatrack.dashboard.service.DashboardService;
import com.kavyapharm.farmatrack.dto.DashboardStatsResponse;
import com.kavyapharm.farmatrack.dto.DashboardChartsResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    public DashboardStatsResponse stats() {
        return dashboardService.getStats();
    }

    @GetMapping("/charts")
    public DashboardChartsResponse charts() {
        return dashboardService.getChartsData();
    }
}
