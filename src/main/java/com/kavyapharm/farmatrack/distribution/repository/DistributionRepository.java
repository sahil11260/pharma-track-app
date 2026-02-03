package com.kavyapharm.farmatrack.distribution.repository;

import com.kavyapharm.farmatrack.distribution.model.Distribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DistributionRepository extends JpaRepository<Distribution, Long> {
}
