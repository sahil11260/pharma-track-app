package com.kavyapharm.farmatrack.doctor.service;

import com.kavyapharm.farmatrack.doctor.dto.CreateDoctorRequest;
import com.kavyapharm.farmatrack.doctor.dto.DoctorResponse;
import com.kavyapharm.farmatrack.doctor.dto.UpdateDoctorRequest;
import com.kavyapharm.farmatrack.doctor.model.Doctor;
import com.kavyapharm.farmatrack.doctor.repository.DoctorRepository;
import com.kavyapharm.farmatrack.user.model.User;
import com.kavyapharm.farmatrack.user.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;

    public DoctorService(DoctorRepository doctorRepository, UserRepository userRepository) {
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
    }

    public List<DoctorResponse> list() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return List.of(); // Secure by default
        }

        String currentEmail = auth.getName();
        boolean isManager = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
        boolean isMR = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MR"));
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPERADMIN"));

        if (isAdmin) {
            return doctorRepository.findAll(Sort.by(Sort.Direction.ASC, "name").and(Sort.by(Sort.Direction.ASC, "id")))
                    .stream().map(DoctorService::toResponse).toList();
        }

        if (isManager) {
            List<String> managerIds = getUserIdentifiers(currentEmail);
            if (managerIds.isEmpty())
                return List.of();

            // Get all MRs belonging to this manager to strictly filter doctor assignments
            java.util.Set<String> myMrIdentifiers = new java.util.HashSet<>();
            for (String managerId : managerIds) {
                userRepository
                        .findByRoleAndAssignedManagerIgnoreCase(com.kavyapharm.farmatrack.user.model.UserRole.MR,
                                managerId.trim())
                        .forEach(u -> {
                            if (u.getName() != null)
                                myMrIdentifiers.add(u.getName().trim().toLowerCase());
                            if (u.getEmail() != null)
                                myMrIdentifiers.add(u.getEmail().trim().toLowerCase());
                        });
            }

            java.util.Set<Doctor> doctorSet = new java.util.HashSet<>();

            // Doctors owned directly by the manager
            for (String managerId : managerIds) {
                doctorSet.addAll(doctorRepository.findByManagerEmailIgnoreCase(managerId.trim()));
            }

            // Doctors assigned to this manager's MRs
            for (String mrId : myMrIdentifiers) {
                doctorSet.addAll(doctorRepository.findByAssignedMRIgnoreCase(mrId));
            }

            return doctorSet.stream()
                    .sorted((d1, d2) -> {
                        int res = d1.getName().compareToIgnoreCase(d2.getName());
                        return res != 0 ? res : d1.getId().compareTo(d2.getId());
                    })
                    .map(DoctorService::toResponse)
                    .toList();
        }

        if (isMR) {
            List<String> mrIds = getUserIdentifiers(currentEmail);
            if (mrIds.isEmpty())
                return List.of();

            java.util.Set<Doctor> doctorSet = new java.util.HashSet<>();
            for (String mrId : mrIds) {
                doctorSet.addAll(doctorRepository.findByAssignedMRIgnoreCase(mrId.trim()));
            }

            return doctorSet.stream()
                    .sorted((d1, d2) -> {
                        int res = d1.getName().compareToIgnoreCase(d2.getName());
                        return res != 0 ? res : d1.getId().compareTo(d2.getId());
                    })
                    .map(DoctorService::toResponse)
                    .toList();
        }

        return List.of();
    }

    private List<String> getUserIdentifiers(String currentEmail) {
        List<String> ids = new ArrayList<>();
        if (currentEmail == null)
            return ids;
        ids.add(currentEmail);
        userRepository.findByEmailIgnoreCase(currentEmail).ifPresent(u -> {
            if (u.getName() != null)
                ids.add(u.getName());
        });
        return ids.stream().distinct().toList();
    }

    public DoctorResponse get(Long id) {
        Objects.requireNonNull(id, "id is required");
        return toResponse(getEntity(id));
    }

    public DoctorResponse create(CreateDoctorRequest request) {
        String managerEmail = resolveManagerEmail();
        
        // Prevent duplicate doctors for the same manager (by name and phone)
        doctorRepository.findByManagerEmailIgnoreCase(managerEmail).stream()
            .filter(d -> d.getName().equalsIgnoreCase(request.name()) && d.getPhone().equals(request.phone()))
            .findFirst()
            .ifPresent(d -> {
                throw new IllegalArgumentException("Doctor with this name and phone already exists for this manager.");
            });

        Doctor doctor = new Doctor();
        doctor.setName(request.name());
        doctor.setType(request.type());
        doctor.setSpecialty(request.specialty());
        doctor.setPhone(request.phone());
        doctor.setEmail(request.email());
        doctor.setClinicName(request.clinicName());
        doctor.setAddress(request.address());
        doctor.setCity(request.city());
        doctor.setAssignedMR(request.assignedMR());
        doctor.setNotes(request.notes());
        doctor.setStatus(request.status());
        doctor.setManagerEmail(managerEmail);
        return toResponse(doctorRepository.save(doctor));
    }

    public DoctorResponse update(Long id, UpdateDoctorRequest request) {
        Objects.requireNonNull(id, "id is required");
        Doctor doctor = getEntity(id);
        doctor.setName(request.name());
        doctor.setType(request.type());
        doctor.setSpecialty(request.specialty());
        doctor.setPhone(request.phone());
        doctor.setEmail(request.email());
        doctor.setClinicName(request.clinicName());
        doctor.setAddress(request.address());
        doctor.setCity(request.city());
        doctor.setAssignedMR(request.assignedMR());
        doctor.setNotes(request.notes());
        doctor.setStatus(request.status());
        if (doctor.getManagerEmail() == null || doctor.getManagerEmail().isBlank()) {
            doctor.setManagerEmail(resolveManagerEmail());
        }
        return toResponse(doctorRepository.save(doctor));
    }

    private String resolveManagerEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getName() != null && !auth.getName().isBlank()) {
            return auth.getName();
        }
        return "system";
    }

    public void delete(Long id) {
        Objects.requireNonNull(id, "id is required");
        if (!doctorRepository.existsById(id)) {
            return;
        }
        doctorRepository.deleteById(id);
    }

    private Doctor getEntity(Long id) {
        Objects.requireNonNull(id, "id is required");
        return doctorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));
    }

    public static DoctorResponse toResponse(Doctor doctor) {
        return new DoctorResponse(
                doctor.getId(),
                doctor.getName(),
                doctor.getType(),
                doctor.getSpecialty(),
                doctor.getPhone(),
                doctor.getEmail(),
                doctor.getClinicName(),
                doctor.getAddress(),
                doctor.getCity(),
                doctor.getAssignedMR(),
                doctor.getNotes(),
                doctor.getStatus(),
                doctor.getManagerEmail());
    }
}
