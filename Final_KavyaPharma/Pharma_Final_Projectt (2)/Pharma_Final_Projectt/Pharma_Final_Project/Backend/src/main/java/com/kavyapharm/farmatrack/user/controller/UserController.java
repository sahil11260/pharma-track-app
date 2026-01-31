package com.kavyapharm.farmatrack.user.controller;

import com.kavyapharm.farmatrack.user.dto.CreateUserRequest;
import com.kavyapharm.farmatrack.user.dto.UpdateUserRequest;
import com.kavyapharm.farmatrack.user.dto.UserResponse;
import com.kavyapharm.farmatrack.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserResponse> list(
            @org.springframework.web.bind.annotation.RequestParam(required = false) String manager,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String role) {
        if (role != null && !role.isBlank()) {
            try {
                com.kavyapharm.farmatrack.user.model.UserRole userRole = com.kavyapharm.farmatrack.user.model.UserRole.valueOf(role.toUpperCase());
                return userService.listByRoleAndManager(userRole, manager);
            } catch (Exception ignored) {}
        }
        return userService.list(manager);
    }

    @GetMapping("/{id}")
    public UserResponse get(@PathVariable Long id) {
        return userService.get(id);
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(request));
    }

    @PutMapping("/{id}")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        return userService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
