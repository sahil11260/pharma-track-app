package com.kavyapharm.farmatrack.mrdashboard.service;

import com.kavyapharm.farmatrack.mrdashboard.dto.MrDashboardResponse;
import com.kavyapharm.farmatrack.dcr.repository.DcrRepository;
import com.kavyapharm.farmatrack.mrexpense.model.MrExpense;
import com.kavyapharm.farmatrack.mrexpense.repository.MrExpenseRepository;
import com.kavyapharm.farmatrack.user.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MrDashboardService {

    private final DcrRepository dcrRepository;
    private final MrExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    public MrDashboardService(DcrRepository dcrRepository,
            MrExpenseRepository expenseRepository,
            UserRepository userRepository) {
        this.dcrRepository = dcrRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
    }

    public MrDashboardResponse get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            System.out.println("[MR-DASHBOARD] No authenticated user found, returning zeros");
            return new MrDashboardResponse(0.0, 0, 0, 0.0, 0.0);
        }

        String email = auth.getName();
        System.out.println("[MR-DASHBOARD] Current user email: " + email);

        // Get user details
        var userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            System.out.println("[MR-DASHBOARD] User not found for email: " + email);
            return new MrDashboardResponse(0.0, 0, 0, 0.0, 0.0);
        }

        String userName = userOpt.get().getName();
        System.out.println("[MR-DASHBOARD] User name: " + userName);

        // Calculate Visits - fetch all and filter by user
        List<com.kavyapharm.farmatrack.dcr.model.DcrReport> allDcrs = dcrRepository.findAll();
        int visits = (int) allDcrs.stream()
                .filter(dcr -> {
                    String dcrMrName = dcr.getMrName();
                    // Match by name (case-insensitive) or if mrName is null/empty, we'll count it
                    boolean matches = dcrMrName != null && userName.equalsIgnoreCase(dcrMrName.trim());
                    if (matches && !userName.equals(dcrMrName)) {
                        // Auto-fix: Update the mr_name to match exactly
                        dcr.setMrName(userName);
                        dcrRepository.save(dcr);
                        System.out.println(
                                "[MR-DASHBOARD] Auto-updated DCR " + dcr.getReportId() + " mr_name to: " + userName);
                    }
                    return matches;
                })
                .count();
        System.out.println("[MR-DASHBOARD] Visits count for " + userName + ": " + visits);

        // Calculate Expenses - fetch all and filter by user
        List<MrExpense> allExpenses = expenseRepository.findAll();
        List<MrExpense> userExpenses = allExpenses.stream()
                .filter(exp -> {
                    String expMrName = exp.getMrName();
                    // Match by name (case-insensitive)
                    boolean matches = expMrName != null && userName.equalsIgnoreCase(expMrName.trim());
                    if (matches && !userName.equals(expMrName)) {
                        // Auto-fix: Update the mr_name to match exactly
                        exp.setMrName(userName);
                        expenseRepository.save(exp);
                        System.out.println(
                                "[MR-DASHBOARD] Auto-updated expense " + exp.getId() + " mr_name to: " + userName);
                    }
                    return matches;
                })
                .toList();

        System.out.println("[MR-DASHBOARD] Total expenses found: " + userExpenses.size());

        // Debug: Print all expenses
        for (MrExpense exp : userExpenses) {
            System.out.println("[MR-DASHBOARD]   Expense ID: " + exp.getId() +
                    ", Amount: " + exp.getAmount() +
                    ", Status: '" + exp.getStatus() + "'");
        }

        double pending = userExpenses.stream()
                .filter(e -> "Pending".equalsIgnoreCase(e.getStatus()))
                .mapToDouble(e -> e.getAmount() != null ? e.getAmount() : 0.0)
                .sum();
        double approved = userExpenses.stream()
                .filter(e -> "Approved".equalsIgnoreCase(e.getStatus()))
                .mapToDouble(e -> e.getAmount() != null ? e.getAmount() : 0.0)
                .sum();

        System.out.println("[MR-DASHBOARD] Expenses - Pending: " + pending + ", Approved: " + approved);

        MrDashboardResponse response = new MrDashboardResponse(0.0, 0, visits, pending, approved);
        System.out.println("[MR-DASHBOARD] Returning response: " + response);
        return response;
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
