package com.kavyapharm.farmatrack.common;

import com.kavyapharm.farmatrack.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
public class SystemController {

    private final UserRepository userRepository;

    public SystemController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @DeleteMapping("/reset-users")
    public ResponseEntity<String> resetUsers() {
        userRepository.deleteAll();
        return ResponseEntity.ok("All users deleted successfully. You can now sign up fresh.");
    }
}
