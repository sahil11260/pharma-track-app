package com.kavyapharm.farmatrack.dashboard.service;

import com.kavyapharm.farmatrack.dto.DashboardStatsResponse;
import com.kavyapharm.farmatrack.dto.DashboardChartsResponse;
import com.kavyapharm.farmatrack.mrstock.repository.MrStockRepository;
import com.kavyapharm.farmatrack.user.service.UserService;
import com.kavyapharm.farmatrack.doctor.service.DoctorService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class DashboardService {

    private final UserService userService;
    private final DoctorService doctorService;
    private final MrStockRepository mrStockRepository;

    public DashboardService(UserService userService, DoctorService doctorService, MrStockRepository mrStockRepository) {
        this.userService = userService;
        this.doctorService = doctorService;
        this.mrStockRepository = mrStockRepository;
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
        long totalMRs;
        long totalDoctors;

        if (currentUser != null && currentUser.getRole() == com.kavyapharm.farmatrack.user.model.UserRole.MANAGER) {
            String managerName = currentUser.getName();
            String managerEmail = currentUser.getEmail();
            totalMRs = allUsers.stream()
                    .filter(u -> com.kavyapharm.farmatrack.user.model.UserRole.MR.equals(u.role()) &&
                            (Objects.equals(managerName, u.assignedManager())
                                    || Objects.equals(managerEmail, u.assignedManager())))
                    .count();
            // Filter doctors by managerEmail
            totalDoctors = doctorService.list().stream()
                    .filter(d -> Objects.equals(currentEmail, d.managerEmail()))
                    .count();
        } else {
            totalMRs = allUsers.stream().filter(u -> com.kavyapharm.farmatrack.user.model.UserRole.MR.equals(u.role()))
                    .count();
            totalDoctors = doctorService.list().size();
        }

        long totalUsers = allUsers.size();
        long totalStock = mrStockRepository.findAll().stream()
                .mapToLong(item -> item.getStock() == null ? 0 : item.getStock()).sum();

        return new DashboardStatsResponse(totalMRs, totalDoctors, totalUsers, totalStock);
    }

    public DashboardChartsResponse getChartsData() {
        List<String> monthLabels = getLastSixMonthLabels();
        List<Integer> salesByMonth = generateZeroSeries(6);
        List<Integer> visitsByMonth = generateZeroSeries(6);
        List<Integer> targetsByMonth = generateZeroSeries(6);

        // TODO: Replace with real aggregation logic when sales/visits/targets entities
        // exist
        // For now, return zeros so charts render empty until data exists
        Map<String, Integer> expenseByCategory = Map.of(
                "Travel", 0,
                "Meals", 0,
                "Samples", 0,
                "Marketing", 0,
                "Other", 0);

        Map<String, List<Integer>> productSalesByMonth = Map.of(
                "Product A", generateZeroSeries(6),
                "Product B", generateZeroSeries(6),
                "Product C", generateZeroSeries(6),
                "Product D", generateZeroSeries(6));

        return new DashboardChartsResponse(salesByMonth, visitsByMonth, targetsByMonth, monthLabels, expenseByCategory,
                productSalesByMonth);
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

    private List<Integer> generateZeroSeries(int size) {
        List<Integer> zeros = new ArrayList<>(size);
        for (int i = 0; i < size; i++)
            zeros.add(0);
        return zeros;
    }
}
