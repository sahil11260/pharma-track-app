package com.kavyapharm.farmatrack.expense.dto;

import com.kavyapharm.farmatrack.expense.model.Expense.ExpenseStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

public record CreateExpenseRequest(
                @NotBlank(message = "MR name is required") String mrName,

                @NotBlank(message = "Category is required") String category,

                @NotNull(message = "Amount is required") @Positive(message = "Amount must be positive") Double amount,

                String description,

                @NotNull(message = "Expense date is required") LocalDate expenseDate,

                String receiptFilename) {
}
