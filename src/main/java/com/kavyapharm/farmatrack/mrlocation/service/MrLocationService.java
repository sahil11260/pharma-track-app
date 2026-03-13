package com.kavyapharm.farmatrack.mrlocation.service;

import com.kavyapharm.farmatrack.mrlocation.dto.MrLocationResponse;
import com.kavyapharm.farmatrack.mrlocation.dto.MrLocationUpdateRequest;
import com.kavyapharm.farmatrack.mrlocation.model.MrLocation;
import com.kavyapharm.farmatrack.mrlocation.repository.MrLocationRepository;
import com.kavyapharm.farmatrack.security.CustomUserDetails;
import com.kavyapharm.farmatrack.user.model.User;
import com.kavyapharm.farmatrack.user.model.UserRole;
import com.kavyapharm.farmatrack.user.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class MrLocationService {

    private static final Duration ONLINE_THRESHOLD = Duration.ofMinutes(5);

    private final MrLocationRepository mrLocationRepository;
    private final UserRepository userRepository;

    public MrLocationService(MrLocationRepository mrLocationRepository, UserRepository userRepository) {
        this.mrLocationRepository = mrLocationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void updateMyLocation(MrLocationUpdateRequest request) {
        Objects.requireNonNull(request, "request is required");
        if (request.latitude() == null || request.longitude() == null) {
            throw new IllegalArgumentException("latitude and longitude are required");
        }

        User current = getCurrentUserEntity().orElseThrow(() -> new IllegalArgumentException("Unauthorized"));
        if (current.getRole() != UserRole.MR) {
            throw new IllegalArgumentException("Only MR can update location");
        }

        MrLocation entity = mrLocationRepository.findById(current.getId()).orElseGet(MrLocation::new);
        entity.setMrId(current.getId());
        entity.setMrName(current.getName());
        entity.setTerritory(current.getTerritory());
        entity.setLatitude(request.latitude());
        entity.setLongitude(request.longitude());
        entity.setAccuracy(request.accuracy());
        entity.setUpdatedAt(Instant.now());

        mrLocationRepository.save(entity);
    }

    public List<MrLocationResponse> listForManager(String managerParam, Long mrIdFilter) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPERADMIN"));
        boolean isManager = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));

        if (!isAdmin && !isManager) {
            return List.of();
        }

        List<String> managerIdentifiers = resolveManagerIdentifiers(auth, managerParam, isAdmin);
        if (managerIdentifiers.isEmpty() && !isAdmin) {
            return List.of();
        }

        Set<User> mrUsers = managerIdentifiers.stream()
                .filter(s -> s != null && !s.isBlank())
                .flatMap(id -> userRepository.findByRoleAndAssignedManagerIgnoreCase(UserRole.MR, id.trim()).stream())
                .collect(Collectors.toSet());

        if (mrIdFilter != null) {
            mrUsers = mrUsers.stream().filter(u -> u.getId().equals(mrIdFilter)).collect(Collectors.toSet());
        }

        List<Long> ids = mrUsers.stream().map(User::getId).toList();
        Map<Long, MrLocation> latestMap = new HashMap<>();
        if (!ids.isEmpty()) {
            for (MrLocation loc : mrLocationRepository.findByMrIdIn(ids)) {
                if (loc != null && loc.getMrId() != null) {
                    latestMap.put(loc.getMrId(), loc);
                }
            }
        }

        Instant now = Instant.now();
        List<MrLocationResponse> out = new ArrayList<>();
        for (User u : mrUsers) {
            MrLocation loc = latestMap.get(u.getId());
            Instant updatedAt = loc != null ? loc.getUpdatedAt() : null;
            String status = (updatedAt != null && Duration.between(updatedAt, now).compareTo(ONLINE_THRESHOLD) <= 0)
                    ? "online"
                    : "offline";

            out.add(new MrLocationResponse(
                    u.getId(),
                    u.getName(),
                    u.getTerritory(),
                    loc != null ? loc.getLatitude() : null,
                    loc != null ? loc.getLongitude() : null,
                    loc != null ? loc.getAccuracy() : null,
                    updatedAt,
                    status));
        }

        return out;
    }

    private Optional<User> getCurrentUserEntity() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return Optional.empty();
        }

        Object principal = auth.getPrincipal();
        if (principal instanceof CustomUserDetails cud && cud.getUser() != null) {
            return Optional.of(cud.getUser());
        }

        String email = auth.getName();
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }

        return userRepository.findByEmailIgnoreCase(email.trim());
    }

    private List<String> resolveManagerIdentifiers(Authentication auth, String managerParam, boolean isAdmin) {
        if (isAdmin) {
            return (managerParam != null && !managerParam.isBlank()) ? List.of(managerParam.trim()) : List.of();
        }

        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return List.of();
        }

        List<String> ids = new ArrayList<>();
        String currentEmail = auth.getName();
        if (currentEmail != null && !currentEmail.isBlank()) {
            ids.add(currentEmail.trim());
            userRepository.findByEmailIgnoreCase(currentEmail.trim()).ifPresent(u -> {
                if (u.getName() != null && !u.getName().isBlank()) {
                    ids.add(u.getName().trim());
                }
            });
        }

        if (managerParam != null && !managerParam.isBlank()) {
            ids.add(managerParam.trim());
        }

        return ids.stream().filter(Objects::nonNull).map(String::trim).filter(s -> !s.isBlank()).distinct().toList();
    }
}
