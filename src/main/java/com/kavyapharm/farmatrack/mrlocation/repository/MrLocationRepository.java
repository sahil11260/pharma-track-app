package com.kavyapharm.farmatrack.mrlocation.repository;

import com.kavyapharm.farmatrack.mrlocation.model.MrLocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MrLocationRepository extends JpaRepository<MrLocation, Long> {
    List<MrLocation> findByMrIdIn(List<Long> mrIds);
}
