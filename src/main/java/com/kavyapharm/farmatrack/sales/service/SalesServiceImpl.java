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
    private final com.kavyapharm.farmatrack.mrstock.repository.MrStockRepository mrStockRepository;
    private final com.kavyapharm.farmatrack.user.repository.UserRepository userRepository;
    private final com.kavyapharm.farmatrack.dcr.repository.DcrRepository dcrRepository;

    public SalesServiceImpl(SalesTargetRepository targetRepository,
            SalesAchievementRepository achievementRepository,
            com.kavyapharm.farmatrack.mrstock.repository.MrStockRepository mrStockRepository,
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
        if (request.startDate() != null && request.endDate() != null
                && request.endDate().isBefore(request.startDate())) {
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

                // 1. DEDUCT from Manager
                com.kavyapharm.farmatrack.mrstock.model.MrStockItem managerStock = mrStockRepository
                        .findByIdAndUserNameIgnoreCase(productId, managerIdentifier)
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Manager stock item not found for product " + productId));

                int currentManagerStock = managerStock.getStock() == null ? 0 : managerStock.getStock();
                int requested = request.targetUnits() == null ? 0 : request.targetUnits();

                if (currentManagerStock < requested) {
                    throw new IllegalArgumentException("Insufficient manager stock. Available: " + currentManagerStock);
                }

                managerStock.setStock(currentManagerStock - requested);
                mrStockRepository.save(managerStock);

                // 2. ADD to MR
                com.kavyapharm.farmatrack.mrstock.model.MrStockItem mrStock = mrStockRepository
                        .findByIdAndUserNameIgnoreCase(productId, request.mrName())
                        .orElseGet(() -> {
                            com.kavyapharm.farmatrack.mrstock.model.MrStockItem newItem = new com.kavyapharm.farmatrack.mrstock.model.MrStockItem();
                            newItem.setId(productId);
                            newItem.setUserName(request.mrName());
                            newItem.setName(managerStock.getName());
                            newItem.setStock(0);
                            return newItem;
                        });

                mrStock.setStock((mrStock.getStock() == null ? 0 : mrStock.getStock()) + requested);
                mrStockRepository.save(mrStock);
            }
        }

        // Only update if explicit target ID is provided, otherwise always create new
        SalesTarget target;
        if (request.id() != null) {
            target = targetRepository.findById(request.id())
                    .orElseGet(() -> new SalesTarget());
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
        target.setStartDate(request.startDate());
        target.setEndDate(request.endDate());
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

        // Build response list with calculated cumulative waterfall achievements
        List<TargetWithAchievementResponse> targetResponses = new ArrayList<>();
        Map<String, List<SalesTarget>> groupedTargets = targets.stream()
                .collect(Collectors.groupingBy(t -> t.getMrId() + "-" + t.getProductId() + "-"
                        + (t.getCategory() == null ? "Product" : t.getCategory())));

        for (List<SalesTarget> group : groupedTargets.values()) {
            targetResponses.addAll(calculateWaterfallForGroup(group, month, year));
        }

        // Calculate totals
        int totalTarget = targetResponses.stream().mapToInt(TargetWithAchievementResponse::targetUnits).sum();
        int totalAchievement = targetResponses.stream().mapToInt(TargetWithAchievementResponse::achievedUnits).sum();
        double avgPercentage = totalTarget > 0 ? (totalAchievement * 100.0 / totalTarget) : 0.0;

        // Calculate top performers by MR
        Map<Long, MrPerformance> mrPerformanceMap = new HashMap<>();
        for (TargetWithAchievementResponse res : targetResponses) {
            mrPerformanceMap.putIfAbsent(res.mrId(), new MrPerformance(res.mrName()));
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

    private static class SaleEvent {
        LocalDate date;
        int quantity;
        Long targetId;

        SaleEvent(LocalDate date, int quantity) {
            this.date = date;
            this.quantity = quantity;
            this.targetId = null;
        }

        SaleEvent(LocalDate date, int quantity, Long targetId) {
            this.date = date;
            this.quantity = quantity;
            this.targetId = targetId;
        }
    }

    private List<TargetWithAchievementResponse> calculateWaterfallForGroup(List<SalesTarget> groupTargets,
            Integer month, Integer year) {
        if (groupTargets.isEmpty())
            return Collections.emptyList();

        // 1. Sort targets: startDate ASC, assignedDate ASC, id ASC
        List<SalesTarget> sortedTargets = new ArrayList<>(groupTargets);
        sortedTargets
                .sort(Comparator.comparing(SalesTarget::getStartDate, Comparator.nullsFirst(Comparator.naturalOrder()))
                        .thenComparing(SalesTarget::getAssignedDate, Comparator.nullsFirst(Comparator.naturalOrder()))
                        .thenComparing(SalesTarget::getId, Comparator.nullsFirst(Comparator.naturalOrder())));

        // 2. Aggregate Sales (DCR + Manual Achievements)
        Set<Long> mrIdsInGroup = sortedTargets.stream().map(SalesTarget::getMrId).collect(Collectors.toSet());
        Set<com.kavyapharm.farmatrack.user.model.User> allPotentialUsers = new HashSet<>();
        for (Long mrId : mrIdsInGroup) {
            userRepository.findById(mrId).ifPresent(u -> {
                allPotentialUsers.add(u);
                allPotentialUsers.addAll(getSubordinatesRecursively(u));
            });
        }

        List<SaleEvent> allSales = new ArrayList<>();
        SalesTarget rep = sortedTargets.get(0);
        String category = rep.getCategory();
        Long productId = rep.getProductId();

        for (com.kavyapharm.farmatrack.user.model.User sub : allPotentialUsers) {
            // DCR Samples
            List<com.kavyapharm.farmatrack.dcr.model.DcrReport> dcrList = new ArrayList<>();
            if (sub.getName() != null)
                dcrList.addAll(dcrRepository.findByMrNameIgnoreCase(sub.getName()));
            if (sub.getEmail() != null && !sub.getEmail().equalsIgnoreCase(sub.getName())) {
                dcrList.addAll(dcrRepository.findByMrNameIgnoreCase(sub.getEmail()));
            }
            dcrList.stream().distinct().forEach(dcr -> {
                if (dcr.getDateTime() == null || dcr.getDateTime().length() < 10)
                    return;
                try {
                    LocalDate dDate = LocalDate.parse(dcr.getDateTime().substring(0, 10));
                    if (dDate.getMonthValue() == month && dDate.getYear() == year) {
                        if ("Visit".equalsIgnoreCase(category)) {
                            allSales.add(new SaleEvent(dDate, 1));
                        } else {
                            int qty = dcr.getSamplesGiven().stream()
                                    .filter(item -> isProductMatch(rep, item))
                                    .mapToInt(com.kavyapharm.farmatrack.dcr.model.DcrSampleItem::getQuantity)
                                    .sum();
                            if (qty > 0)
                                allSales.add(new SaleEvent(dDate, qty));
                        }
                    }
                } catch (Exception ignored) {
                }
            });

            // Manual Achievements
            if (!"Visit".equalsIgnoreCase(category)) {
                achievementRepository.findByMrIdAndProductIdAndPeriodMonthAndPeriodYear(
                        sub.getId(), productId, month, year).stream()
                        .filter(ach -> isProductMatchForAchievement(rep, ach))
                        .forEach(ach -> {
                            if (ach.getAchievementDate() != null && ach.getAchievedUnits() != null) {
                                allSales.add(new SaleEvent(ach.getAchievementDate(), ach.getAchievedUnits(),
                                        ach.getTargetId()));
                            }
                        });
            }
        }

        // Sort SaleEvents by date
        allSales.sort(Comparator.comparing(s -> s.date));

        // 3. Waterfall Distribution
        Map<Long, Integer> distribution = new HashMap<>();
        for (SalesTarget t : sortedTargets)
            distribution.put(t.getId(), 0);

        for (SaleEvent sale : allSales) {
            int remaining = sale.quantity;

            // 0. Priority: If sale is bound to a specific target
            if (sale.targetId != null) {
                if (distribution.containsKey(sale.targetId)) {
                    distribution.put(sale.targetId, distribution.get(sale.targetId) + remaining);
                    remaining = 0;
                }
            }

            // 1. First pass: Fill targets that have capacity and cover the date
            if (remaining > 0) {
                for (SalesTarget t : sortedTargets) {
                    if (remaining <= 0)
                        break;
                    if (isDateWithinTargetRange(sale.date, t)) {
                        int assigned = distribution.get(t.getId());
                        int needed = (t.getTargetUnits() != null ? t.getTargetUnits() : 0) - assigned;
                        if (needed > 0) {
                            int take = Math.min(remaining, needed);
                            distribution.put(t.getId(), assigned + take);
                            remaining -= take;
                        }
                    }
                }
            }

            // 2. Second pass: Overflow goes to the latest target that covers the date
            if (remaining > 0) {
                SalesTarget lastCandidate = null;
                for (SalesTarget t : sortedTargets) {
                    if (isDateWithinTargetRange(sale.date, t)) {
                        lastCandidate = t;
                    }
                }
                if (lastCandidate != null) {
                    distribution.put(lastCandidate.getId(), distribution.get(lastCandidate.getId()) + remaining);
                }
            }
        }

        // 4. Build responses
        return sortedTargets.stream()
                .map(t -> {
                    int achieved = distribution.get(t.getId());
                    return TargetWithAchievementResponse.from(
                            t.getId(), t.getMrId(), t.getMrName(), t.getProductName(),
                            t.getCategory(), t.getTargetType().name(), t.getTargetUnits(),
                            achieved, t.getAssignedDate(), t.getStartDate(), t.getEndDate(),
                            t.getPeriodMonth(), t.getPeriodYear());
                })
                .collect(Collectors.toList());
    }

    private Set<com.kavyapharm.farmatrack.user.model.User> getSubordinatesRecursively(
            com.kavyapharm.farmatrack.user.model.User manager) {
        Set<com.kavyapharm.farmatrack.user.model.User> allSubordinates = new HashSet<>();
        // Find by manager identifier (email or name)
        List<com.kavyapharm.farmatrack.user.model.User> directSubordinates = userRepository
                .findByAssignedManagerIgnoreCase(manager.getEmail());
        if (directSubordinates.isEmpty()) {
            directSubordinates = userRepository.findByAssignedManagerIgnoreCase(manager.getName());
        }

        for (com.kavyapharm.farmatrack.user.model.User sub : directSubordinates) {
            if (!allSubordinates.contains(sub)) {
                allSubordinates.add(sub);
                allSubordinates.addAll(getSubordinatesRecursively(sub));
            }
        }
        return allSubordinates;
    }

    private boolean isWithinTargetRange(String dateTimeStr, SalesTarget target) {
        if (dateTimeStr == null || dateTimeStr.isBlank())
            return false;
        try {
            LocalDate saleDate = LocalDate.parse(dateTimeStr.substring(0, 10));
            return isDateWithinTargetRange(saleDate, target);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isDateWithinTargetRange(LocalDate date, SalesTarget target) {
        // Essential: Must be within the target month and year
        if (date.getMonthValue() != target.getPeriodMonth() || date.getYear() != target.getPeriodYear()) {
            return false;
        }

        // Respect explicit boundaries if they are set.
        // This ensures that new targets don't include previously sold units
        // if they were assigned later in the month.
        LocalDate start = target.getStartDate() != null ? target.getStartDate() : target.getAssignedDate();
        if (date.isBefore(start))
            return false;
        if (target.getEndDate() != null && date.isAfter(target.getEndDate()))
            return false;

        return true;
    }

    private boolean isProductMatchForAchievement(SalesTarget target, SalesAchievement achievement) {
        if (target.getProductId() != null) {
            return target.getProductId().equals(achievement.getProductId());
        } else {
            return target.getProductName().equalsIgnoreCase(achievement.getProductName());
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

        // Build response list with calculated waterfall achievements
        List<TargetWithAchievementResponse> targetResponses = new ArrayList<>();
        List<SalesTarget> filteredTargets;
        if (isAdmin || auth == null || "anonymousUser".equals(auth.getName())) {
            filteredTargets = allTargets;
        } else {
            List<com.kavyapharm.farmatrack.user.model.User> trackedUsers = new ArrayList<>(userRepository
                    .findByAssignedManagerIgnoreCase(managerIden));
            userRepository.findByEmailIgnoreCase(managerIden).ifPresent(u -> {
                trackedUsers.addAll(userRepository.findByAssignedManagerIgnoreCase(u.getName()));
                trackedUsers.add(u);
            });
            List<Long> assignedMrIds = trackedUsers.stream().map(com.kavyapharm.farmatrack.user.model.User::getId)
                    .distinct()
                    .toList();
            filteredTargets = allTargets.stream().filter(t -> assignedMrIds.contains(t.getMrId())).toList();
        }

        Map<String, List<SalesTarget>> grouped = filteredTargets.stream()
                .collect(Collectors.groupingBy(t -> t.getMrId() + "-" + t.getProductId() + "-"
                        + (t.getCategory() == null ? "Product" : t.getCategory())));

        for (List<SalesTarget> group : grouped.values()) {
            targetResponses.addAll(calculateWaterfallForGroup(group, month, year));
        }

        return targetResponses;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TargetWithAchievementResponse> getMrTargets(Long mrId, Integer month, Integer year) {
        List<SalesTarget> targets = targetRepository.findByMrIdAndPeriodMonthAndPeriodYear(mrId, month, year);

        List<TargetWithAchievementResponse> targetResponses = new ArrayList<>();
        Map<String, List<SalesTarget>> grouped = targets.stream()
                .collect(Collectors.groupingBy(t -> t.getMrId() + "-" + t.getProductId() + "-"
                        + (t.getCategory() == null ? "Product" : t.getCategory())));

        for (List<SalesTarget> group : grouped.values()) {
            targetResponses.addAll(calculateWaterfallForGroup(group, month, year));
        }

        return targetResponses;
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
            com.kavyapharm.farmatrack.user.model.User mrUser = userRepository.findById(target.getMrId()).orElse(null);
            String subName = target.getMrName();
            String subEmail = mrUser != null ? mrUser.getEmail() : subName;

            List<com.kavyapharm.farmatrack.dcr.model.DcrReport> dcrList = new ArrayList<>();
            if (subName != null)
                dcrList.addAll(dcrRepository.findByMrNameIgnoreCase(subName));
            if (subEmail != null && !subEmail.equalsIgnoreCase(subName))
                dcrList.addAll(dcrRepository.findByMrNameIgnoreCase(subEmail));
            List<com.kavyapharm.farmatrack.dcr.model.DcrReport> distinctDcrs = dcrList.stream().distinct().toList();

            if (!"Visit".equalsIgnoreCase(target.getCategory())) {
                dcrSum = distinctDcrs.stream()
                        .filter(dcr -> isWithinTargetRange(dcr.getDateTime(), target))
                        .flatMap(dcr -> dcr.getSamplesGiven().stream())
                        .filter(item -> isProductMatch(target, item))
                        .mapToInt(com.kavyapharm.farmatrack.dcr.model.DcrSampleItem::getQuantity)
                        .sum();
            } else {
                dcrSum = (int) distinctDcrs.stream()
                        .filter(dcr -> isWithinTargetRange(dcr.getDateTime(), target))
                        .count();
            }

            int desiredManualSum = request.achievedUnits() - dcrSum;
            if (desiredManualSum < 0)
                desiredManualSum = 0; // Can't be negative

            // Update or create target-specific manual achievement record
            List<SalesAchievement> existingList = achievementRepository.findByTargetId(target.getId());

            SalesAchievement achievement;
            if (!existingList.isEmpty()) {
                achievement = existingList.get(0);
                achievement.setAchievedUnits(desiredManualSum);
            } else {
                achievement = new SalesAchievement();
                achievement.setMrId(target.getMrId());
                achievement.setTargetId(target.getId());
                achievement.setMrName(target.getMrName());
                achievement.setProductId(target.getProductId());
                achievement.setProductName(target.getProductName());
                achievement.setAchievedUnits(desiredManualSum);
                achievement.setPeriodMonth(target.getPeriodMonth());
                achievement.setPeriodYear(target.getPeriodYear());
                achievement.setAchievementDate(LocalDate.now());
                achievement.setRemarks("Manager Override (Target " + target.getId() + ")");
            }
            achievementRepository.save(achievement);
        }

        return target;
    }

    private static class MrPerformance {
        private final String mrName;
        private int totalTarget = 0;
        private int totalAchievement = 0;

        public MrPerformance(String mrName) {
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
