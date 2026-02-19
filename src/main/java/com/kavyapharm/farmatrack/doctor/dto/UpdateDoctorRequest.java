package com.kavyapharm.farmatrack.doctor.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UpdateDoctorRequest(
        @NotBlank(message = "Name is required") String name,
        @NotBlank(message = "Type is required") String type,
        @NotBlank(message = "Specialty is required") String specialty,
        @NotBlank(message = "Phone is required") String phone,
        @NotBlank(message = "Email is required") @Email(message = "Email should be valid") String email,
        @NotBlank(message = "Clinic name is required") String clinicName,
        String address,
        @NotBlank(message = "City is required") String city,
        String assignedMR,
        String notes,
        @NotBlank(message = "Status is required") String status) {
}
