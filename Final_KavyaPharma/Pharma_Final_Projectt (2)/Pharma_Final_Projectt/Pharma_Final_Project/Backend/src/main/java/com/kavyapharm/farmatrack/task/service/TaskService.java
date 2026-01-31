package com.kavyapharm.farmatrack.task.service;

import com.kavyapharm.farmatrack.task.dto.CreateTaskRequest;
import com.kavyapharm.farmatrack.task.dto.TaskResponse;
import com.kavyapharm.farmatrack.task.dto.UpdateTaskRequest;
import com.kavyapharm.farmatrack.task.model.Task;
import com.kavyapharm.farmatrack.task.repository.TaskRepository;
import com.kavyapharm.farmatrack.user.model.User;
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
            return List.of(); // Secure by default
        }

        String currentEmail = auth.getName();
        boolean isManager = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
        boolean isMR = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MR"));
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPERADMIN"));

        System.out.println("[TASK_DEBUG] User: " + currentEmail + " | Roles: Admin=" + isAdmin + ", Manager=" + isManager + ", MR=" + isMR);

        if (isAdmin) {
            List<Task> allTasks = taskRepository.findAll(Sort.by(Sort.Direction.DESC, "createdDate").and(Sort.by(Sort.Direction.DESC, "id")));
            System.out.println("[TASK_DEBUG] Admin fetching all tasks. Count: " + allTasks.size());
            return allTasks.stream().map(TaskService::toResponse).toList();
        }

        if (isManager) {
            List<String> managerIds = getUserIdentifiers(currentEmail);
            System.out.println("[TASK_DEBUG] Manager IDs: " + managerIds);
            if (managerIds.isEmpty())
                return List.of();

            // Get all MRs belonging to this manager to define the scope
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
            System.out.println("[TASK_DEBUG] Manager's MR identifiers: " + myMrIdentifiers);

            // Fetch tasks for all matching MR identifiers
            java.util.Set<Task> taskSet = new java.util.HashSet<>();
            for (String mrId : myMrIdentifiers) {
                taskSet.addAll(taskRepository.findByAssignedToIgnoreCase(mrId));
            }

            System.out.println("[TASK_DEBUG] Manager found tasks: " + taskSet.size());

            return taskSet.stream()
                    .sorted((t1, t2) -> {
                        int res = t2.getCreatedDate().compareTo(t1.getCreatedDate());
                        return res != 0 ? res : t2.getId().compareTo(t1.getId());
                    })
                    .map(TaskService::toResponse)
                    .toList();
        }

        if (isMR) {
            System.out.println("[TASK_DEBUG] MR Login: " + currentEmail);
            // STRICT: Only match tasks assigned to the MR's email address
            List<Task> mrTasks = taskRepository.findByAssignedToIgnoreCase(currentEmail.trim());
            System.out.println("[TASK_DEBUG] Found " + mrTasks.size() + " tasks by email for: " + currentEmail);
            System.out.println("[TASK_DEBUG] Total tasks for MR " + currentEmail + ": " + mrTasks.size());

            return mrTasks.stream()
                    .sorted((t1, t2) -> {
                        int res = t2.getCreatedDate().compareTo(t1.getCreatedDate());
                        return res != 0 ? res : t2.getId().compareTo(t1.getId());
                    })
                    .map(TaskService::toResponse)
                    .toList();
        }

        System.out.println("[TASK_DEBUG] No matching role flow for " + currentEmail);
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
