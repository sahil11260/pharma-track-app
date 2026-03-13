package com.kavyapharm.farmatrack.mrlocation.dto;

import java.time.Instant;

public record MrLocationResponse(
        Long mrId,
        String mrName,
        String territory,
        Double latitude,
        Double longitude,
        Double accuracy,
        Instant updatedAt,
        String status
) {
}
