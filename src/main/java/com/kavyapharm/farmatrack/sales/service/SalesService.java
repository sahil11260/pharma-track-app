package com.kavyapharm.farmatrack.sales.service;

import com.kavyapharm.farmatrack.sales.dto.*;
import com.kavyapharm.farmatrack.sales.model.SalesAchievement;
import com.kavyapharm.farmatrack.sales.model.SalesTarget;

import java.util.List;

public interface SalesService {

    // Manager operations
    SalesTarget assignTarget(CreateTargetRequest request);

    ManagerDashboardSummary getManagerDashboardSummary(Integer month, Integer year);

    List<TargetWithAchievementResponse> getAllTargetsWithAchievements(Integer month, Integer year);

    // MR operations
    List<TargetWithAchievementResponse> getMrTargets(Long mrId, Integer month, Integer year);

    SalesAchievement recordAchievement(RecordAchievementRequest request);

    // Common
    SalesTarget getTargetById(Long id);

    void deleteTarget(Long id);

    SalesTarget updateTargetAndAchievement(Long id, UpdateAchievementRequest request);

    com.kavyapharm.farmatrack.user.model.User getUserByUsername(String username);
}
