package com.kavyapharm.farmatrack.sales.repository;

import com.kavyapharm.farmatrack.sales.model.SalesAchievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalesAchievementRepository extends JpaRepository<SalesAchievement, Long> {

    List<SalesAchievement> findByMrIdAndPeriodMonthAndPeriodYear(Long mrId, Integer month, Integer year);

    List<SalesAchievement> findByPeriodMonthAndPeriodYear(Integer month, Integer year);

    @Query("SELECT SUM(sa.achievedUnits) FROM SalesAchievement sa WHERE sa.mrId = :mrId AND sa.productId = :productId AND sa.periodMonth = :month AND sa.periodYear = :year")
    Integer sumAchievedUnitsByMrAndProduct(@Param("mrId") Long mrId, @Param("productId") Long productId,
            @Param("month") Integer month, @Param("year") Integer year);

    Optional<SalesAchievement> findByMrIdAndProductIdAndPeriodMonthAndPeriodYear(
            Long mrId, Long productId, Integer month, Integer year);
}
