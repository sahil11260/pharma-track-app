package com.kavyapharm.farmatrack.sales.service;

import com.kavyapharm.farmatrack.sales.dto.*;
import com.kavyapharm.farmatrack.sales.model.SalesAchievement;
import com.kavyapharm.farmatrack.sales.model.SalesTarget;
import com.kavyapharm.farmatrack.sales.repository.SalesAchievementRepository;
import com.kavyapharm.farmatrack.sales.repository.SalesTargetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class SalesServiceImpl implements SalesService {

    private final SalesTargetRepository targetRepository;
    private final SalesAchievementRepository achievementRepository;

    public SalesServiceImpl(SalesTargetRepository targetRepository,
            SalesAchievementRepository achievementRepository) {
        this.targetRepository = targetRepository;
        this.achievementRepository = achievementRepository;
    }

    @Override
    public SalesTarget assignTarget(CreateTargetRequest request) {
        SalesTarget target = new SalesTarget();
        target.setMrId(request.mrId());
        target.setMrName(request.mrName());
        target.setProductId(request.productId());
        target.setProductName(request.productName());
        target.setTargetUnits(request.targetUnits());
        target.setPeriodMonth(request.periodMonth());
        target.setPeriodYear(request.periodYear());
        target.setAssignedBy(request.assignedBy());
        target.setAssignedDate(LocalDate.now());
        target.setTargetType(SalesTarget.TargetType.MONTHLY);

        return targetRepository.save(target);
    }

    @Override
    @Transactional(readOnly = true)
    public ManagerDashboardSummary getManagerDashboardSummary(Integer month, Integer year) {
        List<SalesTarget> targets = targetRepository.findAllByPeriod(month, year);
        List<SalesAchievement> achievements = achievementRepository.findByPeriodMonthAndPeriodYear(month, year);

        // Calculate totals
        int totalTarget = targets.stream().mapToInt(SalesTarget::getTargetUnits).sum();
        int totalAchievement = achievements.stream().mapToInt(SalesAchievement::getAchievedUnits).sum();
        double avgPercentage = totalTarget > 0 ? (totalAchievement * 100.0 / totalTarget) : 0.0;

        // Build target-achievement map
        Map<String, Map<String, Integer>> achievementMap = new HashMap<>();
        for (SalesAchievement ach : achievements) {
            String key = ach.getMrId() + "_" + ach.getProductId();
            achievementMap.putIfAbsent(key, new HashMap<>());
            achievementMap.get(key).put("achieved",
                    achievementMap.get(key).getOrDefault("achieved", 0) + ach.getAchievedUnits());
        }

        // Build response list
        List<TargetWithAchievementResponse> targetResponses = targets.stream()
                .map(target -> {
                    String key = target.getMrId() + "_" + target.getProductId();
                    Integer achieved = achievementMap.getOrDefault(key, new HashMap<>())
                            .getOrDefault("achieved", 0);

                    return TargetWithAchievementResponse.from(
                            target.getId(),
                            target.getMrId(),
                            target.getMrName(),
                            target.getProductName(),
                            target.getTargetType().name(),
                            target.getTargetUnits(),
                            achieved,
                            target.getAssignedDate(),
                            target.getPeriodMonth(),
                            target.getPeriodYear());
                })
                .collect(Collectors.toList());

        // Calculate top performers by MR
        Map<Long, MrPerformance> mrPerformanceMap = new HashMap<>();
        for (SalesTarget target : targets) {
            mrPerformanceMap.putIfAbsent(target.getMrId(),
                    new MrPerformance(target.getMrId(), target.getMrName()));
            mrPerformanceMap.get(target.getMrId()).addTarget(target.getTargetUnits());
        }

        for (SalesAchievement ach : achievements) {
            if (mrPerformanceMap.containsKey(ach.getMrId())) {
                mrPerformanceMap.get(ach.getMrId()).addAchievement(ach.getAchievedUnits());
            }
        }

        List<ManagerDashboardSummary.TopPerformerData> topPerformers = mrPerformanceMap.values().stream()
                .sorted((a, b) -> Double.compare(b.getPercentage(), a.getPercentage()))
                .limit(10)
                .map(perf -> {
                    int rank = mrPerformanceMap.values().stream()
                            .filter(p -> p.getPercentage() > perf.getPercentage())
                            .toList()
                            .size() + 1;

                    String status;
                    double pct = perf.getPercentage();
                    if (pct >= 90)
                        status = "Excellent";
                    else if (pct >= 75)
                        status = "Good";
                    else if (pct >= 50)
                        status = "Average";
                    else
                        status = "Poor";

                    return new ManagerDashboardSummary.TopPerformerData(
                            rank,
                            perf.getMrName(),
                            perf.getTotalTarget(),
                            perf.getTotalAchievement(),
                            Math.round(pct * 100.0) / 100.0,
                            status);
                })
                .collect(Collectors.toList());

        String topPerformer = topPerformers.isEmpty() ? "N/A" : topPerformers.get(0).mrName();

        return new ManagerDashboardSummary(
                totalTarget,
                totalAchievement,
                Math.round(avgPercentage * 100.0) / 100.0,
                topPerformer,
                targetResponses,
                topPerformers);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TargetWithAchievementResponse> getAllTargetsWithAchievements(Integer month, Integer year) {
        List<SalesTarget> targets = targetRepository.findAllByPeriod(month, year);

        return targets.stream()
                .map(target -> {
                    Integer achieved = achievementRepository.sumAchievedUnitsByMrAndProduct(
                            target.getMrId(), target.getProductId(), month, year);

                    return TargetWithAchievementResponse.from(
                            target.getId(),
                            target.getMrId(),
                            target.getMrName(),
                            target.getProductName(),
                            target.getTargetType().name(),
                            target.getTargetUnits(),
                            achieved,
                            target.getAssignedDate(),
                            target.getPeriodMonth(),
                            target.getPeriodYear());
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TargetWithAchievementResponse> getMrTargets(Long mrId, Integer month, Integer year) {
        List<SalesTarget> targets = targetRepository.findByMrIdAndPeriodMonthAndPeriodYear(mrId, month, year);

        return targets.stream()
                .map(target -> {
                    Integer achieved = achievementRepository.sumAchievedUnitsByMrAndProduct(
                            target.getMrId(), target.getProductId(), month, year);

                    return TargetWithAchievementResponse.from(
                            target.getId(),
                            target.getMrId(),
                            target.getMrName(),
                            target.getProductName(),
                            target.getTargetType().name(),
                            target.getTargetUnits(),
                            achieved,
                            target.getAssignedDate(),
                            target.getPeriodMonth(),
                            target.getPeriodYear());
                })
                .collect(Collectors.toList());
    }

    @Override
    public SalesAchievement recordAchievement(RecordAchievementRequest request) {
        // Check if achievement already exists
        Optional<SalesAchievement> existing = achievementRepository
                .findByMrIdAndProductIdAndPeriodMonthAndPeriodYear(
                        request.mrId(), request.productId(), request.periodMonth(), request.periodYear());

        SalesAchievement achievement;
        if (existing.isPresent()) {
            // Update existing
            achievement = existing.get();
            achievement.setAchievedUnits(achievement.getAchievedUnits() + request.achievedUnits());
            achievement.setRemarks(request.remarks());
        } else {
            // Create new
            achievement = new SalesAchievement();
            achievement.setMrId(request.mrId());
            achievement.setProductId(request.productId());
            achievement.setAchievedUnits(request.achievedUnits());
            achievement.setPeriodMonth(request.periodMonth());
            achievement.setPeriodYear(request.periodYear());
            achievement.setRemarks(request.remarks());
            achievement.setAchievementDate(LocalDate.now());

            // Get MR and Product names from target
            Optional<SalesTarget> target = targetRepository.findByMrIdAndProductIdAndPeriodMonthAndPeriodYear(
                    request.mrId(), request.productId(), request.periodMonth(), request.periodYear());

            if (target.isPresent()) {
                achievement.setMrName(target.get().getMrName());
                achievement.setProductName(target.get().getProductName());
            }
        }

        return achievementRepository.save(achievement);
    }

    @Override
    @Transactional(readOnly = true)
    public SalesTarget getTargetById(Long id) {
        return targetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Target not found with id: " + id));
    }

    @Override
    public void deleteTarget(Long id) {
        targetRepository.deleteById(id);
    }

    // Helper class for calculating MR performance
    private static class MrPerformance {
        private final Long mrId;
        private final String mrName;
        private int totalTarget = 0;
        private int totalAchievement = 0;

        public MrPerformance(Long mrId, String mrName) {
            this.mrId = mrId;
            this.mrName = mrName;
        }

        public void addTarget(int units) {
            this.totalTarget += units;
        }

        public void addAchievement(int units) {
            this.totalAchievement += units;
        }

        public Long getMrId() {
            return mrId;
        }

        public String getMrName() {
            return mrName;
        }

        public int getTotalTarget() {
            return totalTarget;
        }

        public int getTotalAchievement() {
            return totalAchievement;
        }

        public double getPercentage() {
            return totalTarget > 0 ? (totalAchievement * 100.0 / totalTarget) : 0.0;
        }
    }
}
