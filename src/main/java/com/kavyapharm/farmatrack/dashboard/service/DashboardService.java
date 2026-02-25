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
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class DashboardService {

    private final UserService userService;
    private final MrStockRepository mrStockRepository;
    private final SalesAchievementRepository salesAchievementRepository;
    private final SalesTargetRepository salesTargetRepository;
    private final DcrRepository dcrRepository;
    private final TaskRepository taskRepository;
    private final ExpenseRepository expenseRepository;
    private final ProductRepository productRepository;

    public DashboardService(UserService userService, MrStockRepository mrStockRepository,
            SalesAchievementRepository salesAchievementRepository, SalesTargetRepository salesTargetRepository,
            DcrRepository dcrRepository, TaskRepository taskRepository, ExpenseRepository expenseRepository,
            ProductRepository productRepository) {
        this.userService = userService;
        this.mrStockRepository = mrStockRepository;
        this.salesAchievementRepository = salesAchievementRepository;
        this.salesTargetRepository = salesTargetRepository;
        this.dcrRepository = dcrRepository;
        this.taskRepository = taskRepository;
        this.expenseRepository = expenseRepository;
        this.productRepository = productRepository;
    }

    public DashboardStatsResponse getStats() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        String currentEmail = auth != null ? auth.getName() : null;

        com.kavyapharm.farmatrack.user.model.User currentUser = null;
        if (currentEmail != null && !"anonymousUser".equals(currentEmail)) {
            try {
                currentUser = userService.getByEmailOrThrow(currentEmail);
            } catch (Exception ignored) {
            }
        }

        List<com.kavyapharm.farmatrack.user.dto.UserResponse> allUsers = userService.list();
        List<com.kavyapharm.farmatrack.user.dto.UserResponse> myMRs = new ArrayList<>();
        long totalMRs = 0;
        double totalSales = 0;
        long totalVisits = 0;
        long pendingTasks = 0;

        if (currentUser != null && currentUser.getRole() == com.kavyapharm.farmatrack.user.model.UserRole.MANAGER) {
            String managerName = currentUser.getName();
            String managerEmail = currentUser.getEmail();
            myMRs = allUsers.stream()
                    .filter(u -> com.kavyapharm.farmatrack.user.model.UserRole.MR.equals(u.role()) &&
                            (Objects.equals(managerName, u.assignedManager())
                                    || Objects.equals(managerEmail, u.assignedManager())))
                    .toList();
            totalMRs = myMRs.size();

            LocalDate now = LocalDate.now();
            int currentMonth = now.getMonthValue();
            int currentYear = now.getYear();

            Map<Long, Double> productPrices = getProductPriceMap();
            Map<String, Double> productPricesByName = getProductPriceByNameMap();

            for (com.kavyapharm.farmatrack.user.dto.UserResponse mr : myMRs) {
                // Total Sales for MR in current month
                totalSales += salesAchievementRepository
                        .findByMrIdAndPeriodMonthAndPeriodYear(mr.id(), currentMonth, currentYear)
                        .stream()
                        .mapToDouble(sa -> sa.getAchievedUnits()
                                * getPrice(sa.getProductId(), sa.getProductName(), productPrices, productPricesByName))
                        .sum();

                // Also include DCR Reported Samples in Sales
                totalSales += dcrRepository.findByMrNameIgnoreCase(mr.name()).stream()
                        .filter(dcr -> isDateInMonth(dcr.getDateTime(), currentMonth, currentYear))
                        .flatMap(dcr -> dcr.getSamplesGiven().stream())
                        .mapToDouble(
                                item -> item.getQuantity() * getPriceByName(item.getProductName(), productPricesByName))
                        .sum();

                // Doctor Visits for MR in current month (proxied by DcrReports)
                totalVisits += dcrRepository.findByMrNameIgnoreCase(mr.name()).stream()
                        .filter(dcr -> isDateInMonth(dcr.getDateTime(), currentMonth, currentYear))
                        .count();

                // Pending Tasks for MR (check both name and email)
                pendingTasks += taskRepository.findByAssignedToIgnoreCase(mr.name()).stream()
                        .filter(t -> "pending".equalsIgnoreCase(t.getStatus()))
                        .count();
                if (mr.email() != null && !mr.email().equalsIgnoreCase(mr.name())) {
                    pendingTasks += taskRepository.findByAssignedToIgnoreCase(mr.email()).stream()
                            .filter(t -> "pending".equalsIgnoreCase(t.getStatus()))
                            .count();
                }
            }
        }

        long totalUsers = allUsers.size();
        long totalStock = mrStockRepository.findAll().stream()
                .mapToLong(item -> item.getStock() == null ? 0 : item.getStock()).sum();

        return new DashboardStatsResponse(totalMRs, totalSales, totalVisits, pendingTasks, totalUsers, totalStock);
    }

    private Map<Long, Double> getProductPriceMap() {
        return productRepository.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(
                        com.kavyapharm.farmatrack.product.model.Product::getId,
                        p -> parsePrice(p.getPrice()),
                        (v1, v2) -> v1));
    }

    private Map<String, Double> getProductPriceByNameMap() {
        return productRepository.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(
                        p -> p.getName().toLowerCase().trim(),
                        p -> parsePrice(p.getPrice()),
                        (v1, v2) -> v1));
    }

    private double parsePrice(String priceStr) {
        if (priceStr == null)
            return 0.0;
        try {
            return Double.parseDouble(priceStr.replace("₹", "").replace(",", "").trim());
        } catch (Exception e) {
            return 0.0;
        }
    }

    private double getPrice(Long id, String name, Map<Long, Double> pricesById, Map<String, Double> pricesByName) {
        if (id != null && pricesById.containsKey(id))
            return pricesById.get(id);
        return getPriceByName(name, pricesByName);
    }

    private double getPriceByName(String name, Map<String, Double> pricesByName) {
        if (name == null)
            return 0.0;
        return pricesByName.getOrDefault(name.toLowerCase().trim(), 0.0);
    }

    private boolean isDateInMonth(LocalDate date, int month, int year) {
        if (date == null)
            return false;
        return date.getMonthValue() == month && date.getYear() == year;
    }

    private boolean isDateInMonth(String dateStr, int month, int year) {
        if (dateStr == null || dateStr.isEmpty())
            return false;
        try {
            // DateTime from DCR is "yyyy-MM-dd HH:mm"
            LocalDate date = LocalDate.parse(dateStr.substring(0, 10));
            return isDateInMonth(date, month, year);
        } catch (Exception e) {
            return false;
        }
    }

    public DashboardChartsResponse getChartsData() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        String currentEmail = auth != null ? auth.getName() : null;

        com.kavyapharm.farmatrack.user.model.User currentUser = null;
        if (currentEmail != null && !"anonymousUser".equals(currentEmail)) {
            try {
                currentUser = userService.getByEmailOrThrow(currentEmail);
            } catch (Exception ignored) {
            }
        }

        List<String> monthLabels = getLastSixMonthLabels();
        List<Double> salesByMonth = new ArrayList<>();
        List<Long> visitsByMonth = new ArrayList<>();
        List<Double> targetsByMonth = new ArrayList<>();
        Map<String, Double> expenseByCategory = new HashMap<>();
        Map<String, List<Double>> productSalesByMonth = new HashMap<>();

        LocalDate now = LocalDate.now();

        if (currentUser != null && currentUser.getRole() == com.kavyapharm.farmatrack.user.model.UserRole.MANAGER) {
            String managerName = currentUser.getName();
            String managerEmail = currentUser.getEmail();
            List<com.kavyapharm.farmatrack.user.dto.UserResponse> myMRs = userService.list().stream()
                    .filter(u -> com.kavyapharm.farmatrack.user.model.UserRole.MR.equals(u.role()) &&
                            (Objects.equals(managerName, u.assignedManager())
                                    || Objects.equals(managerEmail, u.assignedManager())))
                    .toList();

            Map<Long, Double> productPrices = getProductPriceMap();
            Map<String, Double> productPricesByName = getProductPriceByNameMap();

            // Populate historical data for the last 6 months
            for (int i = 5; i >= 0; i--) {
                LocalDate targetDate = now.minusMonths(i);
                int m = targetDate.getMonthValue();
                int y = targetDate.getYear();

                double monthSales = 0;
                long monthVisits = 0;
                double monthTargets = 0;

                for (com.kavyapharm.farmatrack.user.dto.UserResponse mr : myMRs) {
                    // Sales from Achievements
                    List<com.kavyapharm.farmatrack.sales.model.SalesAchievement> sas = salesAchievementRepository
                            .findByMrIdAndPeriodMonthAndPeriodYear(mr.id(), m, y);
                    for (com.kavyapharm.farmatrack.sales.model.SalesAchievement sa : sas) {
                        double val = sa.getAchievedUnits()
                                * getPrice(sa.getProductId(), sa.getProductName(), productPrices, productPricesByName);
                        monthSales += val;

                        String pName = sa.getProductName();
                        productSalesByMonth.putIfAbsent(pName, generateZeroDoubleSeries(6));
                        productSalesByMonth.get(pName).set(5 - i, productSalesByMonth.get(pName).get(5 - i) + val);
                    }

                    // Sales from DCR Samples
                    List<com.kavyapharm.farmatrack.dcr.model.DcrReport> dcrs = dcrRepository
                            .findByMrNameIgnoreCase(mr.name()).stream()
                            .filter(dcr -> isDateInMonth(dcr.getDateTime(), m, y))
                            .toList();
                    for (com.kavyapharm.farmatrack.dcr.model.DcrReport dcr : dcrs) {
                        for (com.kavyapharm.farmatrack.dcr.model.DcrSampleItem item : dcr.getSamplesGiven()) {
                            double val = item.getQuantity()
                                    * getPriceByName(item.getProductName(), productPricesByName);
                            monthSales += val;

                            String pName = item.getProductName();
                            productSalesByMonth.putIfAbsent(pName, generateZeroDoubleSeries(6));
                            productSalesByMonth.get(pName).set(5 - i, productSalesByMonth.get(pName).get(5 - i) + val);
                        }
                        monthVisits++;
                    }

                    // Targets
                    monthTargets += salesTargetRepository
                            .findByMrIdAndPeriodMonthAndPeriodYear(mr.id(), m, y)
                            .stream()
                            .mapToDouble(st -> st.getTargetUnits()
                                    * getPrice(st.getProductId(), st.getProductName(), productPrices,
                                            productPricesByName))
                            .sum();
                }
                salesByMonth.add(monthSales);
                visitsByMonth.add(monthVisits);
                targetsByMonth.add(monthTargets);
            }

            // Expenses Breakdown (Current month)
            for (com.kavyapharm.farmatrack.user.dto.UserResponse mr : myMRs) {
                expenseRepository.findByMrNameIgnoreCase(mr.name())
                        .stream()
                        .filter(exp -> isDateInMonth(exp.getExpenseDate(), now.getMonthValue(), now.getYear()))
                        .forEach(exp -> {
                            expenseByCategory.put(exp.getCategory(),
                                    expenseByCategory.getOrDefault(exp.getCategory(), 0.0) + exp.getAmount());
                        });
            }
        } else {
            // Default empty series for non-managers (or global stats if needed later)
            salesByMonth = generateZeroDoubleSeries(6);
            visitsByMonth = generateZeroLongSeries(6);
            targetsByMonth = generateZeroDoubleSeries(6);
        }

        return new DashboardChartsResponse(salesByMonth, visitsByMonth, targetsByMonth, monthLabels, expenseByCategory,
                productSalesByMonth);
    }

    private List<Double> generateZeroDoubleSeries(int size) {
        List<Double> zeros = new ArrayList<>(size);
        for (int i = 0; i < size; i++)
            zeros.add(0.0);
        return zeros;
    }

    private List<Long> generateZeroLongSeries(int size) {
        List<Long> zeros = new ArrayList<>(size);
        for (int i = 0; i < size; i++)
            zeros.add(0L);
        return zeros;
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
