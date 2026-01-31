package com.kavyapharm.farmatrack.target.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.LocalDate;

public record UpdateTargetRequest(
        @NotBlank(message = "MR name is required") String mrName,
        @NotNull(message = "Sales target is required") @PositiveOrZero(message = "Sales target must be >= 0") Integer salesTarget,
        @NotNull(message = "Sales achievement is required") @PositiveOrZero(message = "Sales achievement must be >= 0") Integer salesAchievement,
        LocalDate startDate,
        LocalDate endDate,
        @NotBlank(message = "Status is required") String status
) {
}
