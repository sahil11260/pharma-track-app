package com.kavyapharm.farmatrack.dto;

public record DashboardStatsResponse(
                long totalMRs,
                double totalSales,
                long totalVisits,
                long pendingTasks,
                long totalUsers,
                long totalStock) {
}
