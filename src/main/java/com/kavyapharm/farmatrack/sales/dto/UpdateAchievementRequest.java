package com.kavyapharm.farmatrack.sales.dto;

public record UpdateAchievementRequest(
        Long mrId,
        Long productId,
        Integer targetUnits,
        Integer achievedUnits,
        Integer periodMonth,
        Integer periodYear) {
}
