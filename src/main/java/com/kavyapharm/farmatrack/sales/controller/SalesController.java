package com.kavyapharm.farmatrack.sales.controller;

import com.kavyapharm.farmatrack.sales.dto.*;
import com.kavyapharm.farmatrack.sales.model.SalesAchievement;
import com.kavyapharm.farmatrack.sales.model.SalesTarget;
import com.kavyapharm.farmatrack.sales.service.SalesService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class SalesController {

    private final SalesService salesService;

    public SalesController(SalesService salesService) {
        this.salesService = salesService;
    }

    /**
     * Manager: Assign sales target to MR
     */
    @PostMapping("/manager/sales-targets")
    public ResponseEntity<SalesTarget> assignTarget(@Valid @RequestBody CreateTargetRequest request) {
        SalesTarget target = salesService.assignTarget(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(target);
    }

    /**
     * Manager: Get dashboard summary with all metrics
     */
    @GetMapping("/manager/sales-targets/summary")
    public ResponseEntity<ManagerDashboardSummary> getManagerDashboard(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {

        // Default to current month/year if not provided
        LocalDate now = LocalDate.now();
        int targetMonth = month != null ? month : now.getMonthValue();
        int targetYear = year != null ? year : now.getYear();

        ManagerDashboardSummary summary = salesService.getManagerDashboardSummary(targetMonth, targetYear);
        return ResponseEntity.ok(summary);
    }

    /**
     * Manager: Get all targets with achievements
     */
    @GetMapping("/manager/sales-targets")
    public ResponseEntity<List<TargetWithAchievementResponse>> getAllTargets(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {

        LocalDate now = LocalDate.now();
        int targetMonth = month != null ? month : now.getMonthValue();
        int targetYear = year != null ? year : now.getYear();

        List<TargetWithAchievementResponse> targets = salesService.getAllTargetsWithAchievements(targetMonth,
                targetYear);
        return ResponseEntity.ok(targets);
    }

    /**
     * Manager: Delete a target
     */
    @DeleteMapping("/manager/sales-targets/{id}")
    public ResponseEntity<Void> deleteTarget(@PathVariable Long id) {
        salesService.deleteTarget(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * MR: Get own targets for a period
     */
    @GetMapping("/mr/{mrId}/sales-targets")
    public ResponseEntity<List<TargetWithAchievementResponse>> getMrTargets(
            @PathVariable Long mrId,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {

        LocalDate now = LocalDate.now();
        int targetMonth = month != null ? month : now.getMonthValue();
        int targetYear = year != null ? year : now.getYear();

        List<TargetWithAchievementResponse> targets = salesService.getMrTargets(mrId, targetMonth, targetYear);
        return ResponseEntity.ok(targets);
    }

    /**
     * MR: Get own targets using authentication context
     */
    @GetMapping("/mr/me/sales-targets")
    public ResponseEntity<List<TargetWithAchievementResponse>> getMyTargets(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {

        // Get user from SecurityContext
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Ideally we'd have a way to get the database ID here.
        // For now, let's find the user by their identifier (email or name)
        String identifier = auth.getName();
        com.kavyapharm.farmatrack.user.model.User user = salesService.getUserByUsername(identifier);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        LocalDate now = LocalDate.now();
        int targetMonth = month != null ? month : now.getMonthValue();
        int targetYear = year != null ? year : now.getYear();

        List<TargetWithAchievementResponse> targets = salesService.getMrTargets(user.getId(), targetMonth, targetYear);
        return ResponseEntity.ok(targets);
    }

    /**
     * MR: Record sales achievement
     */
    @PostMapping("/mr/sales-achievements")
    public ResponseEntity<SalesAchievement> recordAchievement(@Valid @RequestBody RecordAchievementRequest request) {
        SalesAchievement achievement = salesService.recordAchievement(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(achievement);
    }

    /**
     * Common: Get target by ID
     */
    @GetMapping("/sales-targets/{id}")
    public ResponseEntity<SalesTarget> getTargetById(@PathVariable Long id) {
        SalesTarget target = salesService.getTargetById(id);
        return ResponseEntity.ok(target);
    }
}
