package com.kavyapharm.farmatrack.task.service;

import com.kavyapharm.farmatrack.task.dto.CreateTaskRequest;
import com.kavyapharm.farmatrack.task.dto.TaskResponse;
import com.kavyapharm.farmatrack.task.dto.UpdateTaskRequest;
import com.kavyapharm.farmatrack.task.model.Task;
import com.kavyapharm.farmatrack.task.repository.TaskRepository;
import com.kavyapharm.farmatrack.user.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskService(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    public List<TaskResponse> list() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return List.of();
        }

        String currentEmail = auth.getName() != null ? auth.getName().trim().toLowerCase() : "";
        boolean isManager = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
        boolean isMR = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MR"));
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPERADMIN"));

        System.out.println("[TASK_DEBUG] Context USER: " + currentEmail + " | Roles: Admin=" + isAdmin + ", Manager=" + isManager + ", MR=" + isMR);

        if (isAdmin) {
            List<Task> allTasks = taskRepository.findAll(Sort.by(Sort.Direction.DESC, "createdDate").and(Sort.by(Sort.Direction.DESC, "id")));
            return allTasks.stream().map(TaskService::toResponse).toList();
        }

        // AGGRESSIVE COLLECTION: We'll gather matching tasks from ANY role-based identifier
        java.util.Set<Task> finalTaskSet = new java.util.HashSet<>();

        // 1. PERSONAL TASK FETCH: Always look for tasks assigned directly to the current user (Email or Name)
        List<String> myIdentifiers = getUserIdentifiers(currentEmail);
        System.out.println("[TASK_DEBUG] Personal Identifiers for " + currentEmail + ": " + myIdentifiers);
        for (String id : myIdentifiers) {
           finalTaskSet.addAll(taskRepository.findByAssignedToSpecific(id));
        }

        // 2. MANAGER SCOPE FETCH: If user is a manager, also include all tasks for their subordinates (MRs)
        if (isManager) {
            List<String> myManagerRecords = getUserIdentifiers(currentEmail);
            java.util.Set<String> subMrIdentifiers = new java.util.HashSet<>();
            for (String mId : myManagerRecords) {
                userRepository
                    .findByRoleAndAssignedManagerIgnoreCase(com.kavyapharm.farmatrack.user.model.UserRole.MR, mId)
                    .forEach(u -> {
                        if (u.getName() != null) subMrIdentifiers.add(u.getName().trim().toLowerCase());
                        if (u.getEmail() != null) subMrIdentifiers.add(u.getEmail().trim().toLowerCase());
                    });
            }
            System.out.println("[TASK_DEBUG] Manager " + currentEmail + " - subordinate MRs found: " + subMrIdentifiers);
            for (String mrId : subMrIdentifiers) {
                finalTaskSet.addAll(taskRepository.findByAssignedToSpecific(mrId));
            }
        }

        System.out.println("[TASK_DEBUG] Resulting task count for " + currentEmail + ": " + finalTaskSet.size());

        return finalTaskSet.stream()
                .sorted((t1, t2) -> {
                    LocalDate d1 = t1.getCreatedDate();
                    LocalDate d2 = t2.getCreatedDate();
                    if (d1 == null && d2 == null) return t2.getId().compareTo(t1.getId());
                    if (d1 == null) return 1;
                    if (d2 == null) return -1;
                    int res = d2.compareTo(d1);
                    return res != 0 ? res : t2.getId().compareTo(t1.getId());
                })
                .map(TaskService::toResponse)
                .toList();
    }

    private List<String> getUserIdentifiers(String currentEmail) {
        List<String> ids = new ArrayList<>();
        if (currentEmail == null || currentEmail.isBlank())
            return ids;
        
        String trimmed = currentEmail.trim().toLowerCase();
        ids.add(trimmed);
        
        // Lookup name by email from current session
        userRepository.findByEmailIgnoreCase(trimmed).ifPresent(u -> {
            if (u.getName() != null && !u.getName().isBlank()) {
                ids.add(u.getName().trim().toLowerCase());
            }
        });
        
        return ids.stream().distinct().toList();
    }

    public TaskResponse get(Long id) {
        Objects.requireNonNull(id, "id is required");
        return toResponse(getEntity(id));
    }

    public TaskResponse create(CreateTaskRequest request) {
        Task task = new Task();
        task.setTitle(request.title());
        task.setType(request.type());
        task.setAssignedTo(request.assignedTo());
        task.setPriority(request.priority());
        task.setStatus("pending");
        task.setDueDate(request.dueDate());
        task.setLocation(request.location());
        task.setDescription(request.description());
        task.setClinicName(request.clinicName());
        task.setDoctorName(request.doctorName());
        task.setCreatedDate(LocalDate.now());

        return toResponse(taskRepository.save(task));
    }

    public TaskResponse update(Long id, UpdateTaskRequest request) {
        Objects.requireNonNull(id, "id is required");
        Task task = getEntity(id);

        task.setTitle(request.title());
        task.setType(request.type());
        task.setAssignedTo(request.assignedTo());
        task.setPriority(request.priority());
        task.setStatus(request.status());
        task.setDueDate(request.dueDate());
        task.setLocation(request.location());
        task.setDescription(request.description());
        task.setClinicName(request.clinicName());
        task.setDoctorName(request.doctorName());

        return toResponse(taskRepository.save(task));
    }

    public void delete(Long id) {
        Objects.requireNonNull(id, "id is required");
        if (!taskRepository.existsById(id)) {
            return;
        }
        taskRepository.deleteById(id);
    }

    private Task getEntity(Long id) {
        Objects.requireNonNull(id, "id is required");
        return taskRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
    }

    public static TaskResponse toResponse(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getType(),
                task.getAssignedTo(),
                task.getPriority(),
                task.getStatus(),
                task.getDueDate(),
                task.getLocation(),
                task.getDescription(),
                task.getCreatedDate(),
                task.getClinicName(),
                task.getDoctorName());
    }
}
