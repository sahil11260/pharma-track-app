package com.kavyapharm.farmatrack.target.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.LocalDate;

public record CreateTargetRequest(
        @NotBlank(message = "MR name is required") String mrName,
        @NotNull(message = "Sales target is required") @PositiveOrZero(message = "Sales target must be >= 0") Integer salesTarget,
        LocalDate startDate,
        LocalDate endDate
) {
}
