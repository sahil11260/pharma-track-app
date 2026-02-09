package com.kavyapharm.farmatrack.user.repository;

import com.kavyapharm.farmatrack.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    java.util.List<User> findByAssignedManagerIgnoreCase(String managerName);

    java.util.List<User> findByRoleAndAssignedManagerIgnoreCase(com.kavyapharm.farmatrack.user.model.UserRole role,
            String managerName);

    Optional<User> findByNameIgnoreCase(String name);
}
