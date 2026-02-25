package com.kavyapharm.farmatrack.dashboard.service;

import com.kavyapharm.farmatrack.dto.DashboardStatsResponse;
import com.kavyapharm.farmatrack.dto.DashboardChartsResponse;
import com.kavyapharm.farmatrack.mrstock.repository.MrStockRepository;
import com.kavyapharm.farmatrack.user.service.UserService;
import com.kavyapharm.farmatrack.sales.repository.SalesAchievementRepository;
import com.kavyapharm.farmatrack.sales.repository.SalesTargetRepository;
import com.kavyapharm.farmatrack.dcr.repository.DcrRepository;
import com.kavyapharm.farmatrack.task.repository.TaskRepository;
import com.kavyapharm.farmatrack.expense.repository.ExpenseRepository;
import com.kavyapharm.farmatrack.product.repository.ProductRepository;
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
    private final ProductRepository productRepository;
    private final DoctorService doctorService;

    public DashboardService(UserService userService,
            MrStockRepository mrStockRepository,
            SalesTargetRepository salesTargetRepository,
            SalesAchievementRepository salesAchievementRepository,
            DcrRepository dcrRepository,
            ExpenseRepository expenseRepository,
            TaskRepository taskRepository,
            ProductRepository productRepository,
            DoctorService doctorService) {
        this.userService = userService;
        this.mrStockRepository = mrStockRepository;
        this.salesTargetRepository = salesTargetRepository;
        this.salesAchievementRepository = salesAchievementRepository;
        this.dcrRepository = dcrRepository;
        this.expenseRepository = expenseRepository;
        this.taskRepository = taskRepository;
        this.productRepository = productRepository;
        this.doctorService = doctorService;
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

        if (info.currentUser != null && info.currentUser.getRole() == UserRole.MANAGER) {
            String managerName = info.currentUser.getName();
            String managerEmail = info.currentUser.getEmail();
            userService.list().stream()
                    .filter(u -> UserRole.MR.equals(u.role()) &&
                            (Objects.equals(managerName, u.assignedManager()) ||
                                    Objects.equals(managerEmail, u.assignedManager())))
                    .forEach(u -> {
                        info.mrNames.add(u.name());
                        info.mrIds.add(u.id());
                    });
            // Managers also track themselves if they have achievements/tasks
            info.mrNames.add(info.currentUser.getName());
            info.mrIds.add(info.currentUser.getId());
        }
        return info;
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

        long totalSalesUnits = salesAchievementRepository.findByPeriodMonthAndPeriodYear(month, year).stream()
                .filter(sa -> info.mrIds.isEmpty() || info.mrIds.contains(sa.getMrId()))
                .mapToLong(sa -> sa.getAchievedUnits() != null ? sa.getAchievedUnits() : 0)
                .sum();

        long totalVisits = dcrRepository.findAll().stream()
                .filter(dcr -> info.mrNames.isEmpty() || info.mrNames.contains(dcr.getMrName()))
                .filter(dcr -> isDateInMonth(dcr.getDateTime(), month, year))
                .count();

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

            // Aggregate Sales Achievement
            long monthSalesUnits = salesAchievementRepository.findByPeriodMonthAndPeriodYear(month, year).stream()
                    .filter(sa -> info.mrIds.isEmpty() || info.mrIds.contains(sa.getMrId()))
                    .mapToLong(sa -> sa.getAchievedUnits() != null ? sa.getAchievedUnits() : 0)
                    .sum();
            salesByMonth.add((double) monthSalesUnits);

            // Aggregate Visits (DCRs)
            long monthVisits = dcrRepository.findAll().stream()
                    .filter(dcr -> info.mrNames.isEmpty() || info.mrNames.contains(dcr.getMrName()))
                    .filter(dcr -> isDateInMonth(dcr.getDateTime(), month, year))
                    .count();
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
            salesAchievementRepository.findByPeriodMonthAndPeriodYear(month, year).stream()
                    .filter(sa -> info.mrIds.isEmpty() || info.mrIds.contains(sa.getMrId()))
                    .forEach(sa -> {
                        String pName = sa.getProductName();
                        productSalesByMonth.putIfAbsent(pName, new ArrayList<>(Collections.nCopies(6, 0.0)));
                        double currentVal = productSalesByMonth.get(pName).get(index);
                        productSalesByMonth.get(pName).set(index,
                                currentVal + (sa.getAchievedUnits() != null ? sa.getAchievedUnits() : 0));
                    });
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
