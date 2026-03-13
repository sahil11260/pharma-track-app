package com.kavyapharm.farmatrack.mrlocation.dto;

public record MrLocationUpdateRequest(
        Double latitude,
        Double longitude,
        Double accuracy
) {
}
