package com.kavyapharm.farmatrack.sales.dto;

import java.util.List;

public record ManagerDashboardSummary(
        Integer totalTarget,
        Integer totalAchievement,
        Double avgAchievementPercentage,
        String topPerformer,
        List<TargetWithAchievementResponse> targets,
        List<TopPerformerData> topPerformers) {

    public record TopPerformerData(
            Integer rank,
            String mrName,
            Integer target,
            Integer achievement,
            Double achievementPercentage,
            String status) {
    }
}
