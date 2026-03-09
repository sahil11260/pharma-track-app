package com.kavyapharm.farmatrack.dashboard.service;

import com.kavyapharm.farmatrack.user.repository.UserRepository;

import com.kavyapharm.farmatrack.dto.DashboardStatsResponse;
import com.kavyapharm.farmatrack.dto.DashboardChartsResponse;
import com.kavyapharm.farmatrack.mrstock.repository.MrStockRepository;
import com.kavyapharm.farmatrack.user.service.UserService;
import com.kavyapharm.farmatrack.sales.repository.SalesAchievementRepository;
import com.kavyapharm.farmatrack.sales.repository.SalesTargetRepository;
import com.kavyapharm.farmatrack.dcr.repository.DcrRepository;
import com.kavyapharm.farmatrack.task.repository.TaskRepository;
import com.kavyapharm.farmatrack.expense.repository.ExpenseRepository;
import com.kavyapharm.farmatrack.doctor.service.DoctorService;
import com.kavyapharm.farmatrack.user.model.User;
import com.kavyapharm.farmatrack.user.model.UserRole;
import com.kavyapharm.farmatrack.user.dto.UserResponse;
import com.kavyapharm.farmatrack.expense.model.Expense;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class DashboardService {

    private final UserService userService;
    private final MrStockRepository mrStockRepository;
    private final SalesTargetRepository salesTargetRepository;
    private final SalesAchievementRepository salesAchievementRepository;
    private final DcrRepository dcrRepository;
    private final ExpenseRepository expenseRepository;
    private final TaskRepository taskRepository;
    private final DoctorService doctorService;
    private final UserRepository userRepository;

    public DashboardService(UserService userService,
            MrStockRepository mrStockRepository,
            SalesTargetRepository salesTargetRepository,
            SalesAchievementRepository salesAchievementRepository,
            DcrRepository dcrRepository,
            ExpenseRepository expenseRepository,
            TaskRepository taskRepository,
            DoctorService doctorService,
            UserRepository userRepository) {
        this.userService = userService;
        this.mrStockRepository = mrStockRepository;
        this.salesTargetRepository = salesTargetRepository;
        this.salesAchievementRepository = salesAchievementRepository;
        this.dcrRepository = dcrRepository;
        this.expenseRepository = expenseRepository;
        this.taskRepository = taskRepository;
        this.doctorService = doctorService;
        this.userRepository = userRepository;
    }

    private static class TrackedInfo {
        List<String> mrNames = new ArrayList<>();
        List<Long> mrIds = new ArrayList<>();
        User currentUser;
    }

    private TrackedInfo getTrackedInfo() {
        TrackedInfo info = new TrackedInfo();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = (auth != null && auth.isAuthenticated()) ? auth.getName() : null;

        if (currentEmail != null && !"anonymousUser".equals(currentEmail)) {
            try {
                info.currentUser = userService.getByEmailOrThrow(currentEmail);
            } catch (Exception ignored) {
            }
        }

        if (info.currentUser != null) {
            if (info.currentUser.getRole() == UserRole.MANAGER) {
                List<com.kavyapharm.farmatrack.user.model.User> allUsers = userRepository.findAll();
                Set<com.kavyapharm.farmatrack.user.model.User> allSubordinates = getSubordinatesRecursively(
                        info.currentUser, allUsers);
                for (com.kavyapharm.farmatrack.user.model.User sub : allSubordinates) {
                    info.mrNames.add(sub.getName());
                    info.mrIds.add(sub.getId());
                }
                // Managers also track themselves if they have achievements/tasks
                info.mrNames.add(info.currentUser.getName());
                info.mrIds.add(info.currentUser.getId());
            } else if (info.currentUser.getRole() == UserRole.MR) {
                info.mrNames.add(info.currentUser.getName());
                info.mrIds.add(info.currentUser.getId());
            }
        }
        return info;
    }

    private Set<com.kavyapharm.farmatrack.user.model.User> getSubordinatesRecursively(
            com.kavyapharm.farmatrack.user.model.User manager,
            List<com.kavyapharm.farmatrack.user.model.User> allUsers) {
        Set<com.kavyapharm.farmatrack.user.model.User> allSubordinates = new HashSet<>();
        List<com.kavyapharm.farmatrack.user.model.User> directSubordinates = allUsers.stream()
                .filter(u -> (Objects.equals(manager.getName(), u.getAssignedManager()) ||
                        Objects.equals(manager.getEmail(), u.getAssignedManager())) &&
                        !Objects.equals(manager.getEmail(), u.getEmail())) // avoid self-loop
                .toList();

        for (com.kavyapharm.farmatrack.user.model.User sub : directSubordinates) {
            if (allSubordinates.add(sub)) {
                allSubordinates.addAll(getSubordinatesRecursively(sub, allUsers));
            }
        }
        return allSubordinates;
    }

    public DashboardStatsResponse getStats() {
        TrackedInfo info = getTrackedInfo();
        List<UserResponse> allUsers = userService.list();

        long totalMRs;
        long totalDoctors;

        if (info.currentUser != null && info.currentUser.getRole() == UserRole.MANAGER) {
            // totalMRs for manager is the count of assigned MRs (excluding manager
            // themselves)
            totalMRs = Math.max(0, info.mrIds.size() - 1);
            totalDoctors = doctorService.list().stream()
                    .filter(d -> Objects.equals(info.currentUser.getEmail(), d.managerEmail()))
                    .count();
        } else {
            totalMRs = allUsers.stream().filter(u -> UserRole.MR.equals(u.role())).count();
            totalDoctors = doctorService.list().size();
        }

        long totalUsers = allUsers.size();
        long totalStock = mrStockRepository.findAll().stream()
                .mapToLong(item -> item.getStock() == null ? 0 : item.getStock()).sum();

        LocalDate now = LocalDate.now();
        int month = now.getMonthValue();
        int year = now.getYear();

        long totalSalesUnits = 0;
        int currentMonth = month;
        int currentYear = year;

        // Calculate unified sales units (Achievements + DCR Samples)
        if (info.mrIds.isEmpty()) {
            // Admin view - sum everything for the period
            totalSalesUnits += salesAchievementRepository.findByPeriodMonthAndPeriodYear(currentMonth, currentYear)
                    .stream()
                    .mapToLong(sa -> sa.getAchievedUnits() != null ? sa.getAchievedUnits() : 0)
                    .sum();

            totalSalesUnits += dcrRepository.findAll().stream()
                    .filter(dcr -> isDateInMonth(dcr.getDateTime(), currentMonth, currentYear))
                    .flatMap(dcr -> dcr.getSamplesGiven().stream())
                    .mapToLong(item -> item.getQuantity() != null ? item.getQuantity() : 0)
                    .sum();
        } else {
            // Manager/MR view - filter by subordinates
            totalSalesUnits += salesAchievementRepository.findByPeriodMonthAndPeriodYear(currentMonth, currentYear)
                    .stream()
                    .filter(sa -> info.mrIds.contains(sa.getMrId()))
                    .mapToLong(sa -> sa.getAchievedUnits() != null ? sa.getAchievedUnits() : 0)
                    .sum();

            for (String mrName : info.mrNames) {
                totalSalesUnits += dcrRepository.findByMrNameIgnoreCase(mrName).stream()
                        .filter(dcr -> isDateInMonth(dcr.getDateTime(), currentMonth, currentYear))
                        .flatMap(dcr -> dcr.getSamplesGiven().stream())
                        .mapToLong(item -> item.getQuantity() != null ? item.getQuantity() : 0)
                        .sum();
            }
        }

        long totalVisits = 0;
        if (info.mrNames.isEmpty()) {
            totalVisits = dcrRepository.findAll().stream()
                    .filter(dcr -> isDateInMonth(dcr.getDateTime(), month, year))
                    .count();
        } else {
            for (String mrName : info.mrNames) {
                totalVisits += dcrRepository.findByMrNameIgnoreCase(mrName).stream()
                        .filter(dcr -> isDateInMonth(dcr.getDateTime(), month, year))
                        .count();
            }
        }

        long pendingTasks = taskRepository.findAll().stream()
                .filter(tk -> info.mrNames.isEmpty() || info.mrNames.contains(tk.getAssignedTo()))
                .filter(tk -> "Pending".equalsIgnoreCase(tk.getStatus())
                        || "In Progress".equalsIgnoreCase(tk.getStatus()))
                .count();

        return new DashboardStatsResponse(totalMRs, totalDoctors, totalUsers, totalStock, totalSalesUnits,
                totalVisits, pendingTasks);
    }

    public DashboardChartsResponse getChartsData() {
        TrackedInfo info = getTrackedInfo();
        List<String> monthLabels = getLastSixMonthLabels();
        List<Double> salesByMonth = new ArrayList<>();
        List<Long> visitsByMonth = new ArrayList<>();
        List<Double> targetsByMonth = new ArrayList<>();

        LocalDate now = LocalDate.now();
        for (int i = 5; i >= 0; i--) {
            LocalDate date = now.minusMonths(i);
            int month = date.getMonthValue();
            int year = date.getYear();

            // Aggregate Targets
            long monthTargetUnits = salesTargetRepository.findAllByPeriod(month, year).stream()
                    .filter(t -> info.mrIds.isEmpty() || info.mrIds.contains(t.getMrId()))
                    .mapToLong(t -> t.getTargetUnits() != null ? t.getTargetUnits() : 0)
                    .sum();
            targetsByMonth.add((double) monthTargetUnits);

            // Aggregate Sales Achievement (Manual + DCR Samples)
            long monthSalesUnits = 0;
            if (info.mrIds.isEmpty()) {
                monthSalesUnits += salesAchievementRepository.findByPeriodMonthAndPeriodYear(month, year).stream()
                        .mapToLong(sa -> sa.getAchievedUnits() != null ? sa.getAchievedUnits() : 0)
                        .sum();

                monthSalesUnits += dcrRepository.findAll().stream()
                        .filter(dcr -> isDateInMonth(dcr.getDateTime(), month, year))
                        .flatMap(dcr -> dcr.getSamplesGiven().stream())
                        .mapToLong(item -> item.getQuantity() != null ? item.getQuantity() : 0)
                        .sum();
            } else {
                monthSalesUnits += salesAchievementRepository.findByPeriodMonthAndPeriodYear(month, year).stream()
                        .filter(sa -> info.mrIds.contains(sa.getMrId()))
                        .mapToLong(sa -> sa.getAchievedUnits() != null ? sa.getAchievedUnits() : 0)
                        .sum();

                for (String mrName : info.mrNames) {
                    monthSalesUnits += dcrRepository.findByMrNameIgnoreCase(mrName).stream()
                            .filter(dcr -> isDateInMonth(dcr.getDateTime(), month, year))
                            .flatMap(dcr -> dcr.getSamplesGiven().stream())
                            .mapToLong(item -> item.getQuantity() != null ? item.getQuantity() : 0)
                            .sum();
                }
            }
            salesByMonth.add((double) monthSalesUnits);

            // Aggregate Visits (DCRs)
            long monthVisits = 0;
            if (info.mrNames.isEmpty()) {
                monthVisits = dcrRepository.findAll().stream()
                        .filter(dcr -> isDateInMonth(dcr.getDateTime(), month, year))
                        .count();
            } else {
                for (String mrName : info.mrNames) {
                    monthVisits += dcrRepository.findByMrNameIgnoreCase(mrName).stream()
                            .filter(dcr -> isDateInMonth(dcr.getDateTime(), month, year))
                            .count();
                }
            }
            visitsByMonth.add(monthVisits);
        }

        // Expense Breakdown
        Map<String, Double> expenseByCategory = new HashMap<>();
        expenseRepository.findByStatus(Expense.ExpenseStatus.APPROVED).stream()
                .filter(e -> info.mrNames.isEmpty() || info.mrNames.contains(e.getMrName()))
                .forEach(e -> {
                    String cat = e.getCategory() != null ? e.getCategory() : "Other";
                    double amount = (e.getAmount() != null) ? e.getAmount() : 0.0;
                    expenseByCategory.put(cat, expenseByCategory.getOrDefault(cat, 0.0) + amount);
                });

        Map<String, List<Double>> productSalesByMonth = new LinkedHashMap<>();
        // Product-wise sales breakdown for charts
        for (int i = 5; i >= 0; i--) {
            LocalDate date = now.minusMonths(i);
            int month = date.getMonthValue();
            int year = date.getYear();

            final int index = 5 - i;
            // 1. Manual Achievements
            salesAchievementRepository.findByPeriodMonthAndPeriodYear(month, year).stream()
                    .filter(sa -> info.mrIds.isEmpty() || info.mrIds.contains(sa.getMrId()))
                    .forEach(sa -> {
                        String pName = sa.getProductName();
                        productSalesByMonth.putIfAbsent(pName, new ArrayList<>(Collections.nCopies(6, 0.0)));
                        double currentVal = productSalesByMonth.get(pName).get(index);
                        productSalesByMonth.get(pName).set(index,
                                currentVal + (sa.getAchievedUnits() != null ? sa.getAchievedUnits() : 0));
                    });

            // 2. DCR Samples
            if (info.mrNames.isEmpty()) {
                dcrRepository.findAll().stream()
                        .filter(dcr -> isDateInMonth(dcr.getDateTime(), month, year))
                        .forEach(dcr -> {
                            dcr.getSamplesGiven().forEach(item -> {
                                String pName = item.getProductName();
                                productSalesByMonth.putIfAbsent(pName, new ArrayList<>(Collections.nCopies(6, 0.0)));
                                double currentVal = productSalesByMonth.get(pName).get(index);
                                productSalesByMonth.get(pName).set(index,
                                        currentVal + (item.getQuantity() != null ? item.getQuantity() : 0));
                            });
                        });
            } else {
                for (String mrName : info.mrNames) {
                    dcrRepository.findByMrNameIgnoreCase(mrName).stream()
                            .filter(dcr -> isDateInMonth(dcr.getDateTime(), month, year))
                            .forEach(dcr -> {
                                dcr.getSamplesGiven().forEach(item -> {
                                    String pName = item.getProductName();
                                    productSalesByMonth.putIfAbsent(pName,
                                            new ArrayList<>(Collections.nCopies(6, 0.0)));
                                    double currentVal = productSalesByMonth.get(pName).get(index);
                                    productSalesByMonth.get(pName).set(index,
                                            currentVal + (item.getQuantity() != null ? item.getQuantity() : 0));
                                });
                            });
                }
            }
        }

        return new DashboardChartsResponse(salesByMonth, visitsByMonth, targetsByMonth, monthLabels, expenseByCategory,
                productSalesByMonth);
    }

    private boolean isDateInMonth(String dateStr, int month, int year) {
        if (dateStr == null || dateStr.isEmpty())
            return false;
        try {
            // DateTime from DCR is typically "yyyy-MM-dd HH:mm" or "yyyy-MM-dd"
            LocalDate date = LocalDate.parse(dateStr.substring(0, 10));
            return date.getMonthValue() == month && date.getYear() == year;
        } catch (Exception e) {
            return false;
        }
    }

    private List<String> getLastSixMonthLabels() {
        List<String> labels = new ArrayList<>();
        LocalDate now = LocalDate.now();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM");
        for (int i = 5; i >= 0; i--) {
            labels.add(now.minusMonths(i).format(fmt));
        }
        return labels;
    }
}
