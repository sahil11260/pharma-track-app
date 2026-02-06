package com.kavyapharm.farmatrack.sales.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RecordAchievementRequest(
        @NotNull(message = "MR ID is required") Long mrId,
        @NotNull(message = "Product ID is required") Long productId,
        @NotNull(message = "Achieved units is required") @Min(value = 0, message = "Achieved units cannot be negative") Integer achievedUnits,
        @NotNull(message = "Period month is required") Integer periodMonth,
        @NotNull(message = "Period year is required") Integer periodYear,
        String remarks) {
}
