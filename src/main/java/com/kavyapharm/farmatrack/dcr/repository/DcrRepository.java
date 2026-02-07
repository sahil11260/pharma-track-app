package com.kavyapharm.farmatrack.dcr.repository;

import com.kavyapharm.farmatrack.dcr.model.DcrReport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DcrRepository extends JpaRepository<DcrReport, Long> {
    java.util.List<com.kavyapharm.farmatrack.dcr.model.DcrReport> findByMrNameIgnoreCase(String mrName,
            org.springframework.data.domain.Sort sort);
}
