package com.kavyapharm.farmatrack.notification.service;

import com.kavyapharm.farmatrack.notification.dto.CreateNotificationRequest;
import com.kavyapharm.farmatrack.notification.dto.NotificationResponse;
import com.kavyapharm.farmatrack.notification.dto.UpdateNotificationRequest;
import com.kavyapharm.farmatrack.notification.model.Notification;
import com.kavyapharm.farmatrack.notification.repository.NotificationRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final com.kavyapharm.farmatrack.user.repository.UserRepository userRepository;
    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    public NotificationService(NotificationRepository notificationRepository,
            com.kavyapharm.farmatrack.user.repository.UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    public List<NotificationResponse> list() {
        // Get current user's role from SecurityContext
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()) {
            return List.of();
        }

        // Extract role from authorities
        String userRole = auth.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring(5)) // Remove "ROLE_" prefix
                .findFirst()
                .orElse(null);

        // Get user ID from principal (username/email)
        String username = auth.getName();
        Long userId = getUserIdFromUsername(username);

        logger.debug("Listing notifications for user: {}, role: {}, id: {}", username, userRole, userId);

        return notificationRepository
                .findAll(Sort.by(Sort.Direction.DESC, "date").and(Sort.by(Sort.Direction.DESC, "id")))
                .stream()
                .filter(notification -> {
                    boolean visible = isNotificationVisibleToUser(notification, userRole, userId);
                    if (visible) {
                        logger.trace("Notification {} is visible to user {}", notification.getId(), username);
                    }
                    return visible;
                })
                .map(NotificationService::toResponse)
                .toList();
    }

    private boolean isNotificationVisibleToUser(Notification notification, String userRole, Long userId) {
        // If notification has a specific recipient, check if it matches current user
        if (notification.getRecipientId() != null) {
            return notification.getRecipientId().equals(userId);
        }

        String type = notification.getType();
        String targetRole = notification.getTargetRole();

        // Handle "All" recipients
        if ("All".equalsIgnoreCase(type) || "ALL".equalsIgnoreCase(targetRole)) {
            return true;
        }

        // Handle Role-specific recipients
        if ("Managers".equalsIgnoreCase(type) || "MANAGER".equalsIgnoreCase(targetRole)) {
            return "MANAGER".equalsIgnoreCase(userRole) || "ADMIN".equalsIgnoreCase(userRole)
                    || "SUPERADMIN".equalsIgnoreCase(userRole);
        }

        if ("MRs".equalsIgnoreCase(type) || "MR".equalsIgnoreCase(targetRole)) {
            return "MR".equalsIgnoreCase(userRole) || "ADMIN".equalsIgnoreCase(userRole)
                    || "SUPERADMIN".equalsIgnoreCase(userRole);
        }

        // If it specifically has a target role, exact match
        if (targetRole != null && !targetRole.isBlank()) {
            return targetRole.equalsIgnoreCase(userRole);
        }

        // Default: only admins see unspecified notifications
        return "ADMIN".equalsIgnoreCase(userRole) || "SUPERADMIN".equalsIgnoreCase(userRole);
    }

    private Long getUserIdFromUsername(String username) {
        if (username == null)
            return null;
        return userRepository.findByEmailIgnoreCase(username)
                .map(com.kavyapharm.farmatrack.user.model.User::getId)
                .orElse(null);
    }

    public NotificationResponse get(String id) {
        Objects.requireNonNull(id, "id is required");
        return toResponse(getEntity(id));
    }

    public NotificationResponse create(CreateNotificationRequest request) {
        String id = generateId();

        Notification notification = new Notification();
        notification.setId(id);
        notification.setTitle(request.title());
        notification.setMessage(request.message());
        notification.setType(request.type());
        notification.setDate(request.date() == null ? LocalDate.now() : request.date());
        notification.setStatus(request.status() == null || request.status().isBlank() ? "Unread" : request.status());
        notification.setPriority(
                request.priority() == null || request.priority().isBlank() ? "Normal" : request.priority());
        notification.setRecipientId(request.recipientId());

        String tRole = request.targetRole();
        if (tRole == null || tRole.isBlank()) {
            if ("Managers".equalsIgnoreCase(request.type()))
                tRole = "MANAGER";
            else if ("MRs".equalsIgnoreCase(request.type()))
                tRole = "MR";
            else if ("All".equalsIgnoreCase(request.type()))
                tRole = "ALL";
        }
        notification.setTargetRole(tRole);

        logger.info("Created notification {} with type {} and targetRole {}", id, request.type(), tRole);
        return toResponse(notificationRepository.save(notification));
    }

    public NotificationResponse update(String id, UpdateNotificationRequest request) {
        Objects.requireNonNull(id, "id is required");
        Notification notification = getEntity(id);

        notification.setTitle(request.title());
        notification.setMessage(request.message());
        notification.setType(request.type());
        notification.setDate(request.date() == null ? notification.getDate() : request.date());
        notification.setStatus(request.status());
        notification.setPriority(request.priority());
        notification.setRecipientId(request.recipientId());
        notification.setTargetRole(request.targetRole());

        return toResponse(notificationRepository.save(notification));
    }

    public void delete(String id) {
        Objects.requireNonNull(id, "id is required");
        if (!notificationRepository.existsById(id)) {
            return;
        }
        notificationRepository.deleteById(id);
    }

    private Notification getEntity(String id) {
        Objects.requireNonNull(id, "id is required");
        return notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
    }

    private String generateId() {
        String id;
        do {
            int n = (int) Math.floor(Math.random() * 1000);
            id = "N" + String.format("%03d", n);
        } while (notificationRepository.existsById(id));
        return id;
    }

    public static NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getType(),
                notification.getDate(),
                notification.getStatus(),
                notification.getPriority(),
                notification.getRecipientId(),
                notification.getTargetRole());
    }
}
