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
    private final com.kavyapharm.farmatrack.user.repository.UserRepository userRepository;
    private final com.kavyapharm.farmatrack.dcr.repository.DcrRepository dcrRepository;

    public SalesServiceImpl(SalesTargetRepository targetRepository,
            SalesAchievementRepository achievementRepository,
            com.kavyapharm.farmatrack.user.repository.UserRepository userRepository,
            com.kavyapharm.farmatrack.dcr.repository.DcrRepository dcrRepository) {
        this.targetRepository = targetRepository;
        this.achievementRepository = achievementRepository;
        this.userRepository = userRepository;
        this.dcrRepository = dcrRepository;
    }

    @Override
    public SalesTarget assignTarget(CreateTargetRequest request) {
        // Check for existing target for the same MR, product, and period
        List<SalesTarget> existing = targetRepository.findByMrIdAndProductIdAndPeriodMonthAndPeriodYear(
                request.mrId(), request.productId(), request.periodMonth(), request.periodYear());

        SalesTarget target;
        if (!existing.isEmpty()) {
            target = existing.get(0);
        } else {
            target = new SalesTarget();
        }

        target.setMrId(request.mrId());
        target.setMrName(request.mrName());
        target.setProductId(request.productId());
        target.setProductName(request.productName());
        target.setCategory(request.category() != null ? request.category() : "Product");
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
        // Get currently logged in manager
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        String managerIden = auth != null ? auth.getName() : null;

        List<Long> assignedMrIds = new ArrayList<>();
        if (managerIden != null) {
            // Find all MRs assigned to this manager (by name or email)
            List<com.kavyapharm.farmatrack.user.model.User> mrs = userRepository
                    .findByAssignedManagerIgnoreCase(managerIden);
            // Also try by manager name if managerIden is an email
            userRepository.findByEmailIgnoreCase(managerIden).ifPresent(u -> {
                mrs.addAll(userRepository.findByAssignedManagerIgnoreCase(u.getName()));
            });

            assignedMrIds = mrs.stream().map(com.kavyapharm.farmatrack.user.model.User::getId).distinct().toList();
        }

        List<SalesTarget> allTargets = targetRepository.findAllByPeriod(month, year);
        List<SalesAchievement> allAchievements = achievementRepository.findByPeriodMonthAndPeriodYear(month, year);

        // Filter by assigned MRs if not Admin
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPERADMIN"));

        final List<Long> finalAssignedMrIds = assignedMrIds;
        List<SalesTarget> targets = isAdmin ? allTargets
                : allTargets.stream()
                        .filter(t -> finalAssignedMrIds.contains(t.getMrId())).toList();
        List<SalesAchievement> achievements = isAdmin ? allAchievements
                : allAchievements.stream()
                        .filter(a -> finalAssignedMrIds.contains(a.getMrId())).toList();

        // Calculate totals
        int totalTarget = targets.stream().mapToInt(SalesTarget::getTargetUnits).sum();
        int totalAchievement = achievements.stream().mapToInt(SalesAchievement::getAchievedUnits).sum();
        double avgPercentage = totalTarget > 0 ? (totalAchievement * 100.0 / totalTarget) : 0.0;

        // Build target-achievement map
        Map<String, Integer> achievementMap = new HashMap<>();
        for (SalesAchievement ach : achievements) {
            String key = ach.getMrId() + "_" + (ach.getProductId() != null ? ach.getProductId() : "null");
            achievementMap.put(key, achievementMap.getOrDefault(key, 0) + ach.getAchievedUnits());
        }

        // Build response list
        List<TargetWithAchievementResponse> targetResponses = targets.stream()
                .map((SalesTarget target) -> {
                    String key = target.getMrId() + "_"
                            + (target.getProductId() != null ? target.getProductId() : "null");
                    Integer achieved;

                    if ("Visit".equalsIgnoreCase(target.getCategory())) {
                        achieved = (int) dcrRepository.findAll().stream()
                                .filter(dcr -> target.getMrName().equalsIgnoreCase(dcr.getMrName()))
                                .count();
                    } else {
                        achieved = achievementMap.getOrDefault(key, 0);
                    }

                    return TargetWithAchievementResponse.from(
                            target.getId(),
                            target.getMrId(),
                            target.getMrName(),
                            target.getProductName(),
                            target.getCategory(),
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
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        String managerIden = auth != null ? auth.getName() : null;

        List<Long> assignedMrIds = new ArrayList<>();
        if (managerIden != null) {
            List<com.kavyapharm.farmatrack.user.model.User> mrs = userRepository
                    .findByAssignedManagerIgnoreCase(managerIden);
            userRepository.findByEmailIgnoreCase(managerIden).ifPresent(u -> {
                mrs.addAll(userRepository.findByAssignedManagerIgnoreCase(u.getName()));
            });
            assignedMrIds = mrs.stream().map(com.kavyapharm.farmatrack.user.model.User::getId).toList();
        }

        List<SalesTarget> allTargets = targetRepository.findAllByPeriod(month, year);
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPERADMIN"));

        final List<Long> finalAssignedMrIds = assignedMrIds;
        List<SalesTarget> targets = isAdmin ? allTargets
                : allTargets.stream()
                        .filter(t -> finalAssignedMrIds.contains(t.getMrId())).collect(Collectors.toList());

        return targets.stream()
                .map((SalesTarget target) -> {
                    Integer achieved;
                    if ("Visit".equalsIgnoreCase(target.getCategory())) {
                        achieved = (int) dcrRepository.findAll().stream()
                                .filter(dcr -> target.getMrName().equalsIgnoreCase(dcr.getMrName()))
                                .count();
                    } else {
                        achieved = achievementRepository.sumAchievedUnitsByMrAndProduct(
                                target.getMrId(), target.getProductId(), month, year);
                    }

                    return TargetWithAchievementResponse.from(
                            target.getId(),
                            target.getMrId(),
                            target.getMrName(),
                            target.getProductName(),
                            target.getCategory(),
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
                .map((SalesTarget target) -> {
                    Integer achieved;
                    if ("Visit".equalsIgnoreCase(target.getCategory())) {
                        achieved = (int) dcrRepository.findAll().stream()
                                .filter(dcr -> target.getMrName().equalsIgnoreCase(dcr.getMrName()))
                                .count();
                    } else {
                        achieved = achievementRepository.sumAchievedUnitsByMrAndProduct(
                                target.getMrId(), target.getProductId(), month, year);
                    }

                    return TargetWithAchievementResponse.from(
                            target.getId(),
                            target.getMrId(),
                            target.getMrName(),
                            target.getProductName(),
                            target.getCategory(),
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
        List<SalesAchievement> existingList = achievementRepository
                .findByMrIdAndProductIdAndPeriodMonthAndPeriodYear(
                        request.mrId(), request.productId(), request.periodMonth(), request.periodYear());

        SalesAchievement achievement;
        if (!existingList.isEmpty()) {
            // Update existing (take first if duplicates exist)
            achievement = existingList.get(0);
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
            List<SalesTarget> targets = targetRepository.findByMrIdAndProductIdAndPeriodMonthAndPeriodYear(
                    request.mrId(), request.productId(), request.periodMonth(), request.periodYear());

            if (!targets.isEmpty()) {
                achievement.setMrName(targets.get(0).getMrName());
                achievement.setProductName(targets.get(0).getProductName());
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

    @Override
    public com.kavyapharm.farmatrack.user.model.User getUserByUsername(String username) {
        return userRepository.findByEmailIgnoreCase(username)
                .orElseGet(() -> userRepository.findByNameIgnoreCase(username).orElse(null));
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
