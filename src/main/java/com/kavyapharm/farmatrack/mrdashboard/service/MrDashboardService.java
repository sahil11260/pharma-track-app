package com.kavyapharm.farmatrack.mrdashboard.service;

import com.kavyapharm.farmatrack.mrdashboard.dto.MrDashboardResponse;
import com.kavyapharm.farmatrack.dcr.repository.DcrRepository;
import com.kavyapharm.farmatrack.mrexpense.model.MrExpense;
import com.kavyapharm.farmatrack.mrexpense.repository.MrExpenseRepository;
import com.kavyapharm.farmatrack.user.repository.UserRepository;
import com.kavyapharm.farmatrack.sales.repository.SalesAchievementRepository;
import com.kavyapharm.farmatrack.sales.repository.SalesTargetRepository;
import com.kavyapharm.farmatrack.sales.model.SalesAchievement;
import com.kavyapharm.farmatrack.sales.model.SalesTarget;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class MrDashboardService {

    private final DcrRepository dcrRepository;
    private final MrExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final SalesAchievementRepository salesAchievementRepository;
    private final SalesTargetRepository salesTargetRepository;

    public MrDashboardService(DcrRepository dcrRepository,
            MrExpenseRepository expenseRepository,
            UserRepository userRepository,
            SalesAchievementRepository salesAchievementRepository,
            SalesTargetRepository salesTargetRepository) {
        this.dcrRepository = dcrRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.salesAchievementRepository = salesAchievementRepository;
        this.salesTargetRepository = salesTargetRepository;
    }

    public MrDashboardResponse get() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
                System.out.println("[MR-DASHBOARD] No authenticated user found, returning zeros");
                return new MrDashboardResponse(0.0, 0, 0, 0.0, 0.0);
            }

            String email = auth.getName();
            System.out.println("[MR-DASHBOARD] Fetching dashboard for email: " + email + " (Auth type: "
                    + auth.getClass().getSimpleName() + ")");

            // Get user details
            var userOpt = userRepository.findByEmailIgnoreCase(email);
            if (userOpt.isEmpty()) {
                System.out.println("[MR-DASHBOARD] User NOT FOUND in database for email: " + email);
                // List first 5 users in log for debugging
                logFirstFewUsers();
                return new MrDashboardResponse(0.0, 0, 0, 0.0, 0.0);
            }

            Long userId = userOpt.get().getId();
            String userName = userOpt.get().getName() != null ? userOpt.get().getName().trim() : email;
            System.out.println("[MR-DASHBOARD] User found: ID=" + userId + ", Name='" + userName + "', Role="
                    + userOpt.get().getRole());

            // 1. Calculate Visits for the current month
            LocalDate today = LocalDate.now();
            int currentMonth = today.getMonthValue();
            int currentYear = today.getYear();

            // Use repository method to get DCRs for this MR for better performance
            List<com.kavyapharm.farmatrack.dcr.model.DcrReport> userDcrs = dcrRepository
                    .findByMrNameIgnoreCase(userName);
            int visits = (int) userDcrs.stream()
                    .filter(dcr -> {
                        // Filter by current month/year
                        try {
                            String subTime = dcr.getSubmissionTime(); // e.g., 2026-02-09T15:51:35.000Z
                            if (subTime != null) {
                                LocalDate subDate = LocalDate.parse(subTime.split("T")[0]);
                                return subDate.getMonthValue() == currentMonth && subDate.getYear() == currentYear;
                            }
                        } catch (Exception e) {
                            // Fallback
                        }
                        return true;
                    })
                    .count();

            // 2. Calculate Expenses using the correct ExpenseRepository
            List<MrExpense> userExpenses = expenseRepository.findByMrNameIgnoreCase(userName, Sort.unsorted());

            double pending = userExpenses.stream()
                    .filter(e -> "Pending".equalsIgnoreCase(e.getStatus()))
                    .mapToDouble(e -> e.getAmount() != null ? e.getAmount() : 0.0)
                    .sum();
            double approved = userExpenses.stream()
                    .filter(e -> "Approved".equalsIgnoreCase(e.getStatus()))
                    .mapToDouble(e -> e.getAmount() != null ? e.getAmount() : 0.0)
                    .sum();

            // 3. Calculate Sales & Target (Product Sales only)
            List<SalesTarget> targets = salesTargetRepository.findByMrIdAndPeriodMonthAndPeriodYear(userId,
                    currentMonth, currentYear);

            // Total Targeted Units (Excluding Visits)
            double totalTargetUnits = targets.stream()
                    .filter(t -> !"Visit".equalsIgnoreCase(t.getCategory()))
                    .mapToDouble(t -> t.getTargetUnits() != null ? t.getTargetUnits() : 0.0)
                    .sum();

            // Total Achieved Units from two sources:
            // 1. Manual entries
            Integer manualAchieved = salesAchievementRepository.sumAchievedUnitsByMr(userId, currentMonth, currentYear);

            // 2. DCR reported samples
            int dcrAchieved = (int) userDcrs.stream()
                    .filter(dcr -> {
                        try {
                            String subTime = dcr.getSubmissionTime();
                            if (subTime == null)
                                return false;
                            LocalDate subDate = LocalDate.parse(subTime.split("T")[0]);
                            return subDate.getMonthValue() == currentMonth && subDate.getYear() == currentYear;
                        } catch (Exception e) {
                            return false;
                        }
                    })
                    .flatMap(dcr -> dcr.getSamplesGiven().stream())
                    .mapToInt(com.kavyapharm.farmatrack.dcr.model.DcrSampleItem::getQuantity)
                    .sum();

            double totalSalesActual = (manualAchieved != null ? manualAchieved : 0) + dcrAchieved;

            int targetPercent = 0;
            if (totalTargetUnits > 0) {
                targetPercent = (int) ((totalSalesActual / totalTargetUnits) * 100);
            }

            System.out.println("[MR-DASHBOARD] Results -> Visits: " + visits + ", Pending: " + pending +
                    ", Approved: " + approved + ", Sales: " + totalSalesActual + ", Target%: " + targetPercent);

            return new MrDashboardResponse(totalSalesActual, targetPercent, visits, pending, approved);

        } catch (Exception e) {
            System.err.println("[MR-DASHBOARD] CRITICAL ERROR: " + e.getMessage());
            e.printStackTrace();
            return new MrDashboardResponse(0.0, 0, 0, 0.0, 0.0);
        }
    }

    private String getCurrentMrName() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return null;
        }
        String email = auth.getName();
        return userRepository.findByEmailIgnoreCase(email)
                .map(com.kavyapharm.farmatrack.user.model.User::getName)
                .orElse(email);
    }

    private void logFirstFewUsers() {
        try {
            userRepository.findAll().stream().limit(5)
                    .forEach(u -> System.out.println("[MR-DASHBOARD-DEBUG] DB User: Email=" + u.getEmail() + ", Name="
                            + u.getName() + ", Role=" + u.getRole()));
        } catch (Exception e) {
            System.err.println("[MR-DASHBOARD-DEBUG] Error listing users: " + e.getMessage());
        }
    }
}
