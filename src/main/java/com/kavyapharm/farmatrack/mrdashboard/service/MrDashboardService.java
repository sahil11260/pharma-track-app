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
            System.out.println("[MR-DASHBOARD] Fetching dashboard for email: " + email);

            // Get user details
            var userOpt = userRepository.findByEmailIgnoreCase(email);
            if (userOpt.isEmpty()) {
                System.out.println("[MR-DASHBOARD] User not found for email: " + email);
                return new MrDashboardResponse(0.0, 0, 0, 0.0, 0.0);
            }

            Long userId = userOpt.get().getId();
            String userName = userOpt.get().getName() != null ? userOpt.get().getName().trim() : email;
            System.out.println("[MR-DASHBOARD] User: ID=" + userId + ", Name='" + userName + "'");

            // 1. Calculate Visits
            List<com.kavyapharm.farmatrack.dcr.model.DcrReport> allDcrs = dcrRepository.findAll();
            int visits = (int) allDcrs.stream()
                    .filter(dcr -> {
                        String dcrMrName = dcr.getMrName() != null ? dcr.getMrName().trim() : null;
                        boolean matches = dcrMrName != null && userName.equalsIgnoreCase(dcrMrName);
                        if (matches && !userName.equals(dcr.getMrName())) {
                            try {
                                dcr.setMrName(userName);
                                dcrRepository.save(dcr);
                            } catch (Exception e) {
                            }
                        }
                        return matches;
                    })
                    .count();

            // 2. Calculate Expenses
            List<MrExpense> allExpenses = expenseRepository.findAll();
            List<MrExpense> userExpenses = allExpenses.stream()
                    .filter(exp -> {
                        String expMrName = exp.getMrName() != null ? exp.getMrName().trim() : null;
                        boolean matches = expMrName != null && userName.equalsIgnoreCase(expMrName);
                        if (matches && !userName.equals(exp.getMrName())) {
                            try {
                                exp.setMrName(userName);
                                expenseRepository.save(exp);
                            } catch (Exception e) {
                            }
                        }
                        return matches;
                    })
                    .toList();

            double pending = userExpenses.stream()
                    .filter(e -> "Pending".equalsIgnoreCase(e.getStatus()))
                    .mapToDouble(e -> e.getAmount() != null ? e.getAmount() : 0.0)
                    .sum();
            double approved = userExpenses.stream()
                    .filter(e -> "Approved".equalsIgnoreCase(e.getStatus()))
                    .mapToDouble(e -> e.getAmount() != null ? e.getAmount() : 0.0)
                    .sum();

            // 3. Calculate Sales & Target
            LocalDate today = LocalDate.now();
            int month = today.getMonthValue();
            int year = today.getYear();

            List<SalesAchievement> achievements = salesAchievementRepository
                    .findByMrIdAndPeriodMonthAndPeriodYear(userId, month, year);
            double totalSales = achievements.stream()
                    .mapToDouble(a -> a.getAchievedUnits() != null ? a.getAchievedUnits() : 0.0)
                    .sum();

            List<SalesTarget> targets = salesTargetRepository.findByMrIdAndPeriodMonthAndPeriodYear(userId, month,
                    year);
            double totalTargetUnits = targets.stream()
                    .mapToDouble(t -> t.getTargetUnits() != null ? t.getTargetUnits() : 0.0)
                    .sum();

            int targetPercent = 0;
            if (totalTargetUnits > 0) {
                targetPercent = (int) ((totalSales / totalTargetUnits) * 100);
            }

            System.out.println("[MR-DASHBOARD] Results -> Visits: " + visits + ", Pending: " + pending +
                    ", Approved: " + approved + ", Sales: " + totalSales + ", Target%: " + targetPercent);

            return new MrDashboardResponse(totalSales, targetPercent, visits, pending, approved);

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
}
