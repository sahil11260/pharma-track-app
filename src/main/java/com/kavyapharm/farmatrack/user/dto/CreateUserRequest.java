package com.kavyapharm.farmatrack.user.dto;

import com.kavyapharm.farmatrack.user.model.UserRole;
import com.kavyapharm.farmatrack.user.model.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CreateUserRequest(
                @NotBlank(message = "Name is required") @Pattern(regexp = "^[a-zA-Z\\s]+$", message = "Name must only contain alphabets and spaces") String name,
                @Email(message = "Invalid email") @NotBlank(message = "Email is required") String email,
                @NotBlank(message = "Password is required") String password,
                @NotNull(message = "Role is required") UserRole role,
                String phone,
                String territory,
                UserStatus status,
                String assignedManager) {
}
