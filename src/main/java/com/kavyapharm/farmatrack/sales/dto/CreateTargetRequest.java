package com.kavyapharm.farmatrack.sales.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateTargetRequest(
                @NotNull(message = "MR ID is required") Long mrId,
                @NotBlank(message = "MR name is required") String mrName,
                Long productId,
                @NotBlank(message = "Product name is required") String productName,
                String category,
                @NotNull(message = "Target units is required") @Min(value = 1, message = "Target units must be at least 1") Integer targetUnits,
                @NotNull(message = "Period month is required") Integer periodMonth,
                @NotNull(message = "Period year is required") Integer periodYear,
                String assignedBy) {
}
