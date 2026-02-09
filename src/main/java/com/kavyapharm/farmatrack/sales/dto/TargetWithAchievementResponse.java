package com.kavyapharm.farmatrack.sales.dto;

import java.time.LocalDate;

public record TargetWithAchievementResponse(
        Long id,
        Long mrId,
        String mrName,
        String productName,
        String category,
        String targetType,
        Integer targetUnits,
        Integer achievedUnits,
        Double achievementPercentage,
        String progressStatus,
        LocalDate assignedDate,
        Integer periodMonth,
        Integer periodYear) {

    public static TargetWithAchievementResponse from(Long id, Long mrId, String mrName, String productName,
            String category, String targetType, Integer targetUnits, Integer achievedUnits,
            LocalDate assignedDate, Integer periodMonth, Integer periodYear) {
        int achieved = achievedUnits != null ? achievedUnits : 0;
        double percentage = targetUnits > 0 ? (achieved * 100.0 / targetUnits) : 0.0;

        String status;
        if (percentage >= 90) {
            status = "Excellent";
        } else if (percentage >= 75) {
            status = "Good";
        } else if (percentage >= 50) {
            status = "Average";
        } else {
            status = "Poor";
        }

        return new TargetWithAchievementResponse(
                id, mrId, mrName, productName, category, targetType, targetUnits, achieved,
                Math.round(percentage * 100.0) / 100.0, status,
                assignedDate, periodMonth, periodYear);
    }
}
