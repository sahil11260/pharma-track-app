package com.kavyapharm.farmatrack.sales.repository;

import com.kavyapharm.farmatrack.sales.model.SalesTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalesTargetRepository extends JpaRepository<SalesTarget, Long> {

    List<SalesTarget> findByMrIdAndPeriodMonthAndPeriodYear(Long mrId, Integer month, Integer year);

    List<SalesTarget> findByPeriodMonthAndPeriodYearOrderByMrNameAsc(Integer month, Integer year);

    @Query("SELECT st FROM SalesTarget st WHERE st.periodMonth = :month AND st.periodYear = :year")
    List<SalesTarget> findAllByPeriod(@Param("month") Integer month, @Param("year") Integer year);

    Optional<SalesTarget> findByMrIdAndProductIdAndPeriodMonthAndPeriodYear(
            Long mrId, Long productId, Integer month, Integer year);

    List<SalesTarget> findByMrId(Long mrId);
}
