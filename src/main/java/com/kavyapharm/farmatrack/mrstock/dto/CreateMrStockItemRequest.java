package com.kavyapharm.farmatrack.mrstock.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public record CreateMrStockItemRequest(
        @NotBlank(message = "Name is required") String name,
        @PositiveOrZero(message = "Stock must be >= 0") Integer stock
) {
}
