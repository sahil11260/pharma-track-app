package com.kavyapharm.farmatrack.expense.dto;

import com.kavyapharm.farmatrack.expense.model.Expense;
import com.kavyapharm.farmatrack.expense.model.Expense.ExpenseStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record ExpenseResponse(
                Long id,
                String mrName,
                String category,
                Double amount,
                String description,
                LocalDate expenseDate,
                ExpenseStatus status,
                String receiptPath,
                String receiptFilename,
                LocalDateTime submittedDate,
                LocalDateTime approvedDate,
                String approvedBy,
                String rejectionReason) {
        public static ExpenseResponse from(Expense expense) {
                return new ExpenseResponse(
                                expense.getId(),
                                expense.getMrName(),
                                expense.getCategory(),
                                expense.getAmount(),
                                expense.getDescription(),
                                expense.getExpenseDate(),
                                expense.getStatus(),
                                expense.getReceiptPath(),
                                expense.getReceiptFilename(),
                                expense.getSubmittedDate(),
                                expense.getApprovedDate(),
                                expense.getApprovedBy(),
                                expense.getRejectionReason());
        }
}
