package com.kavyapharm.farmatrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateDistributionRequest(
        @NotBlank String product,
        @NotBlank String mr,
        @NotNull @Positive Integer quantity,
        @NotBlank String recipient,
        String userName,
        String notes) {
}
