package com.kavyapharm.farmatrack.sales.service;

import com.kavyapharm.farmatrack.sales.dto.*;
import com.kavyapharm.farmatrack.sales.model.SalesAchievement;
import com.kavyapharm.farmatrack.sales.model.SalesTarget;
import com.kavyapharm.farmatrack.sales.repository.SalesAchievementRepository;
import com.kavyapharm.farmatrack.sales.repository.SalesTargetRepository;
import com.kavyapharm.farmatrack.mrstock.repository.MrStockRepository;
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
    private final MrStockRepository mrStockRepository;
    private final com.kavyapharm.farmatrack.user.repository.UserRepository userRepository;
    private final com.kavyapharm.farmatrack.dcr.repository.DcrRepository dcrRepository;

    public SalesServiceImpl(SalesTargetRepository targetRepository,
            SalesAchievementRepository achievementRepository,
            MrStockRepository mrStockRepository,
            com.kavyapharm.farmatrack.user.repository.UserRepository userRepository,
            com.kavyapharm.farmatrack.dcr.repository.DcrRepository dcrRepository) {
        this.targetRepository = targetRepository;
        this.achievementRepository = achievementRepository;
        this.mrStockRepository = mrStockRepository;
        this.userRepository = userRepository;
        this.dcrRepository = dcrRepository;
    }

    @Override
    public SalesTarget assignTarget(CreateTargetRequest request) {
        if (request.startDate() != null && request.endDate() != null && request.endDate().isBefore(request.startDate())) {
            throw new IllegalArgumentException("End Date cannot be earlier than Start Date");
        }

        if ("Product".equalsIgnoreCase(String.valueOf(request.category())) && request.productId() == null) {
            throw new IllegalArgumentException("Please select a product");
        }

        if (request.productId() != null && "Product".equalsIgnoreCase(String.valueOf(request.category()))) {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                    .getContext().getAuthentication();
            String managerIdentifier = auth != null ? auth.getName() : null;
            if (managerIdentifier != null && !managerIdentifier.isBlank()) {
                String productId = String.valueOf(request.productId());
                Integer available = mrStockRepository.findByIdAndUserName(productId, managerIdentifier)
                        .map(it -> it.getStock())
                        .orElse(0);

                int availableStock = available == null ? 0 : available;
                int requested = request.targetUnits() == null ? 0 : request.targetUnits();
                if (availableStock <= 0 || requested > availableStock) {
                    throw new IllegalArgumentException("Insufficient stock to assign target");
                }
            }
        }

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
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        String managerIden = auth != null ? auth.getName() : null;

        List<Long> assignedMrIds = new ArrayList<>();
        if (managerIden != null) {
            List<com.kavyapharm.farmatrack.user.model.User> trackedUsers = new ArrayList<>(userRepository
                    .findByAssignedManagerIgnoreCase(managerIden));
            userRepository.findByEmailIgnoreCase(managerIden).ifPresent(u -> {
                trackedUsers.addAll(userRepository.findByAssignedManagerIgnoreCase(u.getName()));
                trackedUsers.add(u); // Manager themselves are also included
            });
            assignedMrIds = trackedUsers.stream().map(com.kavyapharm.farmatrack.user.model.User::getId).distinct()
                    .toList();
        }

        List<SalesTarget> allTargets = targetRepository.findAllByPeriod(month, year);
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPERADMIN"));

        final List<Long> finalAssignedMrIds = assignedMrIds;
        List<SalesTarget> targets = isAdmin ? allTargets
                : allTargets.stream().filter(t -> finalAssignedMrIds.contains(t.getMrId())).toList();

        // Build response list with calculated achievements
        List<TargetWithAchievementResponse> targetResponses = targets.stream()
                .map(target -> calculateTargetAchievement(target, month, year))
                .collect(Collectors.toList());

        // Calculate totals
        int totalTarget = targetResponses.stream().mapToInt(TargetWithAchievementResponse::targetUnits).sum();
        int totalAchievement = targetResponses.stream().mapToInt(TargetWithAchievementResponse::achievedUnits).sum();
        double avgPercentage = totalTarget > 0 ? (totalAchievement * 100.0 / totalTarget) : 0.0;

        // Calculate top performers by MR
        Map<Long, MrPerformance> mrPerformanceMap = new HashMap<>();
        for (TargetWithAchievementResponse res : targetResponses) {
            mrPerformanceMap.putIfAbsent(res.mrId(), new MrPerformance(res.mrId(), res.mrName()));
            mrPerformanceMap.get(res.mrId()).addTarget(res.targetUnits());
            mrPerformanceMap.get(res.mrId()).addAchievement(res.achievedUnits());
        }

        List<ManagerDashboardSummary.TopPerformerData> topPerformers = mrPerformanceMap.values().stream()
                .sorted((a, b) -> Double.compare(b.getPercentage(), a.getPercentage()))
                .limit(10)
                .map(perf -> {
                    int rank = mrPerformanceMap.values().stream()
                            .filter(p -> p.getPercentage() > perf.getPercentage())
                            .toList()
                            .size() + 1;

                    double pct = perf.getPercentage();
                    String status = getStatusFromPercentage(pct);

                    return new ManagerDashboardSummary.TopPerformerData(
                            rank, perf.getMrName(), perf.getTotalTarget(), perf.getTotalAchievement(),
                            Math.round(pct * 100.0) / 100.0, status);
                })
                .collect(Collectors.toList());

        // Determine top performer - only show if there are actual achievements
        String topPerformer = "No Top Performer";
        if (!topPerformers.isEmpty()) {
            ManagerDashboardSummary.TopPerformerData best = topPerformers.get(0);
            System.out.println("[DEBUG] Best performer: " + best.mrName() + 
                ", achievement: " + best.achievement() + 
                ", percentage: " + best.achievementPercentage() + 
                ", total MRs: " + mrPerformanceMap.size());
            
            // Only show a top performer if they have some achievement (> 0% or > 0 units)
            if (best.achievementPercentage() > 0 || (best.achievement() != null && best.achievement() > 0)) {
                topPerformer = best.mrName();
                System.out.println("[DEBUG] Top performer selected based on achievement: " + topPerformer);
            } else {
                System.out.println("[DEBUG] No top performer - all achievements are 0");
            }
        } else {
            System.out.println("[DEBUG] No performers found");
        }

        return new ManagerDashboardSummary(totalTarget, totalAchievement, Math.round(avgPercentage * 100.0) / 100.0,
                topPerformer, targetResponses, topPerformers);
    }

    private TargetWithAchievementResponse calculateTargetAchievement(SalesTarget target, Integer month, Integer year) {
        Integer achieved;
        if ("Visit".equalsIgnoreCase(target.getCategory())) {
            achieved = (int) dcrRepository.findAll().stream()
                    .filter(dcr -> target.getMrName().equalsIgnoreCase(dcr.getMrName()))
                    .filter(dcr -> isWithinPeriod(dcr.getDateTime(), month, year))
                    .count();
        } else {
            // Sum from two sources:
            // 1. DCR Reported Samples
            int dcrSum = dcrRepository.findAll().stream()
                    .filter(dcr -> target.getMrName().equalsIgnoreCase(dcr.getMrName()))
                    .filter(dcr -> isWithinPeriod(dcr.getDateTime(), month, year))
                    .flatMap(dcr -> dcr.getSamplesGiven().stream())
                    .filter(item -> isProductMatch(target, item))
                    .mapToInt(com.kavyapharm.farmatrack.dcr.model.DcrSampleItem::getQuantity)
                    .sum();

            // 2. Manual entry achievements
            int manualSum = achievementRepository.sumAchievedUnitsByMrAndProduct(
                    target.getMrId(), target.getProductId(), month, year);

            achieved = dcrSum + manualSum;
        }

        return TargetWithAchievementResponse.from(
                target.getId(), target.getMrId(), target.getMrName(), target.getProductName(),
                target.getCategory(), target.getTargetType().name(), target.getTargetUnits(),
                achieved, target.getAssignedDate(), target.getPeriodMonth(), target.getPeriodYear());
    }

    private boolean isWithinPeriod(String dateTimeStr, Integer month, Integer year) {
        try {
            if (dateTimeStr == null)
                return false;
            LocalDate date = LocalDate.parse(dateTimeStr.substring(0, 10));
            return date.getMonthValue() == month && date.getYear() == year;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isProductMatch(SalesTarget target, com.kavyapharm.farmatrack.dcr.model.DcrSampleItem item) {
        if (target.getProductId() != null) {
            return String.valueOf(target.getProductId()).equals(item.getProductId());
        } else {
            return target.getProductName().equalsIgnoreCase(item.getProductName());
        }
    }

    private String getStatusFromPercentage(double pct) {
        if (pct >= 90)
            return "Excellent";
        if (pct >= 75)
            return "Good";
        if (pct >= 50)
            return "Average";
        return "Poor";
    }

    @Override
    @Transactional(readOnly = true)
    public List<TargetWithAchievementResponse> getAllTargetsWithAchievements(Integer month, Integer year) {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        String managerIden = auth != null ? auth.getName() : null;

        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPERADMIN"));

        List<SalesTarget> allTargets = targetRepository.findAllByPeriod(month, year);

        // If Admin, return all. If anonymous and we're in a global request context,
        // return all for the dashboard.
        if (isAdmin || auth == null || "anonymousUser".equals(auth.getName())) {
            return allTargets.stream()
                    .map(target -> calculateTargetAchievement(target, month, year))
                    .collect(Collectors.toList());
        }

        // Otherwise filter by manager
        List<com.kavyapharm.farmatrack.user.model.User> trackedUsers = new ArrayList<>(userRepository
                .findByAssignedManagerIgnoreCase(managerIden));
        userRepository.findByEmailIgnoreCase(managerIden).ifPresent(u -> {
            trackedUsers.addAll(userRepository.findByAssignedManagerIgnoreCase(u.getName()));
            trackedUsers.add(u); // Manager themselves are also included
        });
        List<Long> assignedMrIds = trackedUsers.stream().map(com.kavyapharm.farmatrack.user.model.User::getId)
                .distinct()
                .toList();

        return allTargets.stream()
                .filter(t -> assignedMrIds.contains(t.getMrId()))
                .map(target -> calculateTargetAchievement(target, month, year))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TargetWithAchievementResponse> getMrTargets(Long mrId, Integer month, Integer year) {
        List<SalesTarget> targets = targetRepository.findByMrIdAndPeriodMonthAndPeriodYear(mrId, month, year);
        return targets.stream()
                .map(target -> calculateTargetAchievement(target, month, year))
                .collect(Collectors.toList());
    }

    @Override
    public SalesAchievement recordAchievement(RecordAchievementRequest request) {
        List<SalesAchievement> existingList = achievementRepository
                .findByMrIdAndProductIdAndPeriodMonthAndPeriodYear(
                        request.mrId(), request.productId(), request.periodMonth(), request.periodYear());

        SalesAchievement achievement;
        if (!existingList.isEmpty()) {
            achievement = existingList.get(0);
            achievement.setAchievedUnits(achievement.getAchievedUnits() + request.achievedUnits());
            achievement.setRemarks(request.remarks());
        } else {
            achievement = new SalesAchievement();
            achievement.setMrId(request.mrId());
            achievement.setProductId(request.productId());
            achievement.setAchievedUnits(request.achievedUnits());
            achievement.setPeriodMonth(request.periodMonth());
            achievement.setPeriodYear(request.periodYear());
            achievement.setRemarks(request.remarks());
            achievement.setAchievementDate(LocalDate.now());

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

    @Override
    public SalesTarget updateTargetAndAchievement(Long id, UpdateAchievementRequest request) {
        SalesTarget target = targetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Target not found with id: " + id));

        // 1. Update target units
        if (request.targetUnits() != null) {
            target.setTargetUnits(request.targetUnits());
            targetRepository.save(target);
        }

        // 2. Adjust manual achievement to reach the desired total
        if (request.achievedUnits() != null) {
            // Find current DCR sum (which we can't change)
            int dcrSum = 0;
            if (!"Visit".equalsIgnoreCase(target.getCategory())) {
                dcrSum = dcrRepository.findAll().stream()
                        .filter(dcr -> target.getMrName().equalsIgnoreCase(dcr.getMrName()))
                        .filter(dcr -> isWithinPeriod(dcr.getDateTime(), target.getPeriodMonth(),
                                target.getPeriodYear()))
                        .flatMap(dcr -> dcr.getSamplesGiven().stream())
                        .filter(item -> isProductMatch(target, item))
                        .mapToInt(com.kavyapharm.farmatrack.dcr.model.DcrSampleItem::getQuantity)
                        .sum();
            } else {
                dcrSum = (int) dcrRepository.findAll().stream()
                        .filter(dcr -> target.getMrName().equalsIgnoreCase(dcr.getMrName()))
                        .filter(dcr -> isWithinPeriod(dcr.getDateTime(), target.getPeriodMonth(),
                                target.getPeriodYear()))
                        .count();
            }

            int desiredManualSum = request.achievedUnits() - dcrSum;
            if (desiredManualSum < 0)
                desiredManualSum = 0; // Can't be negative

            // Update or create manual achievement record
            List<SalesAchievement> existingList = achievementRepository
                    .findByMrIdAndProductIdAndPeriodMonthAndPeriodYear(
                            target.getMrId(), target.getProductId(), target.getPeriodMonth(), target.getPeriodYear());

            SalesAchievement achievement;
            if (!existingList.isEmpty()) {
                achievement = existingList.get(0);
                achievement.setAchievedUnits(desiredManualSum);
            } else {
                achievement = new SalesAchievement();
                achievement.setMrId(target.getMrId());
                achievement.setMrName(target.getMrName());
                achievement.setProductId(target.getProductId());
                achievement.setProductName(target.getProductName());
                achievement.setAchievedUnits(desiredManualSum);
                achievement.setPeriodMonth(target.getPeriodMonth());
                achievement.setPeriodYear(target.getPeriodYear());
                achievement.setAchievementDate(LocalDate.now());
                achievement.setRemarks("Manager Override");
            }
            achievementRepository.save(achievement);
        }

        return target;
    }

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
