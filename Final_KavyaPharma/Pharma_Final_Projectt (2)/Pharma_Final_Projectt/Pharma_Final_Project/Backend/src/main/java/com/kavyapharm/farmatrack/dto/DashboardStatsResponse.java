package com.kavyapharm.farmatrack.dto;

public record DashboardStatsResponse(
        long totalMRs,
        long totalDoctors,
        long totalUsers,
        long totalStock
) {
}
