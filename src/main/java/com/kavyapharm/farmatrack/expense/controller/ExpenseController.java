package com.kavyapharm.farmatrack.expense.controller;

import com.kavyapharm.farmatrack.expense.dto.CreateExpenseRequest;
import com.kavyapharm.farmatrack.expense.dto.ExpenseResponse;
import com.kavyapharm.farmatrack.expense.dto.UpdateExpenseRequest;
import com.kavyapharm.farmatrack.expense.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    /**
     * Create new expense (without file upload)
     */
    @PostMapping
    public ResponseEntity<ExpenseResponse> createExpense(@Valid @RequestBody CreateExpenseRequest request) {
        ExpenseResponse response = expenseService.createExpense(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Create new expense with receipt upload
     */
    @PostMapping(value = "/with-receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExpenseResponse> createExpenseWithReceipt(
            @RequestParam("mrName") String mrName,
            @RequestParam("category") String category,
            @RequestParam("amount") Double amount,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("expenseDate") String expenseDate,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt) throws IOException {

        CreateExpenseRequest request = new CreateExpenseRequest(
                mrName,
                category,
                amount,
                description,
                java.time.LocalDate.parse(expenseDate),
                receipt != null ? receipt.getOriginalFilename() : null);

        ExpenseResponse response;
        if (receipt != null && !receipt.isEmpty()) {
            response = expenseService.createExpenseWithReceipt(request, receipt);
        } else {
            response = expenseService.createExpense(request);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get all expenses (for Manager)
     */
    @GetMapping
    public ResponseEntity<List<ExpenseResponse>> getAllExpenses() {
        List<ExpenseResponse> expenses = expenseService.getAllExpenses();
        return ResponseEntity.ok(expenses);
    }

    /**
     * Get expenses by MR name
     */
    @GetMapping("/mr/{mrName}")
    public ResponseEntity<List<ExpenseResponse>> getExpensesByMr(@PathVariable String mrName) {
        List<ExpenseResponse> expenses = expenseService.getExpensesByMr(mrName);
        return ResponseEntity.ok(expenses);
    }

    /**
     * Get single expense by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ExpenseResponse> getExpenseById(@PathVariable Long id) {
        ExpenseResponse expense = expenseService.getExpenseById(id);
        return ResponseEntity.ok(expense);
    }

    /**
     * Update expense (without file upload)
     */
    @PutMapping("/{id}")
    public ResponseEntity<ExpenseResponse> updateExpense(
            @PathVariable Long id,
            @Valid @RequestBody UpdateExpenseRequest request) {
        ExpenseResponse response = expenseService.updateExpense(id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Update expense with receipt upload
     */
    @PutMapping(value = "/{id}/with-receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExpenseResponse> updateExpenseWithReceipt(
            @PathVariable Long id,
            @RequestParam("category") String category,
            @RequestParam("amount") Double amount,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("expenseDate") String expenseDate,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "rejectionReason", required = false) String rejectionReason) throws IOException {

        UpdateExpenseRequest request = new UpdateExpenseRequest(
                category,
                amount,
                description,
                java.time.LocalDate.parse(expenseDate),
                receipt != null ? receipt.getOriginalFilename() : null,
                status,
                rejectionReason);

        ExpenseResponse response;
        if (receipt != null && !receipt.isEmpty()) {
            response = expenseService.updateExpenseWithReceipt(id, request, receipt);
        } else {
            response = expenseService.updateExpense(id, request);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Approve expense
     */
    @PutMapping("/{id}/approve")
    public ResponseEntity<ExpenseResponse> approveExpense(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String approvedBy = body != null ? body.get("approvedBy") : "Manager";
        ExpenseResponse response = expenseService.approveExpense(id, approvedBy);
        return ResponseEntity.ok(response);
    }

    /**
     * Reject expense
     */
    @PutMapping("/{id}/reject")
    public ResponseEntity<ExpenseResponse> rejectExpense(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String rejectedBy = body.getOrDefault("rejectedBy", "Manager");
        String reason = body.getOrDefault("reason", "Not specified");
        ExpenseResponse response = expenseService.rejectExpense(id, rejectedBy, reason);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete expense
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long id) {
        expenseService.deleteExpense(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Upload receipt file separately
     */
    @PostMapping("/upload-receipt")
    public ResponseEntity<Map<String, String>> uploadReceipt(@RequestParam("file") MultipartFile file)
            throws IOException {
        String filePath = expenseService.uploadReceipt(file);
        return ResponseEntity.ok(Map.of("filePath", filePath, "filename", file.getOriginalFilename()));
    }
}
