package com.kavyapharm.farmatrack.task.repository;

import com.kavyapharm.farmatrack.task.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskRepository extends JpaRepository<Task, Long> {
  java.util.List<Task> findByAssignedToIgnoreCase(String assignedTo);

  @Query("SELECT t FROM Task t WHERE LOWER(TRIM(t.assignedTo)) = LOWER(TRIM(:id))")
  java.util.List<Task> findByAssignedToSpecific(@Param("id") String id);
}
