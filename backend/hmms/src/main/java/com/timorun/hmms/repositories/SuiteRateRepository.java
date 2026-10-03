package com.timorun.hmms.repositories;

import com.timorun.hmms.entities.SuiteRate;
import com.timorun.hmms.entities.SuiteRateId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Repository
public interface SuiteRateRepository extends JpaRepository<SuiteRate, SuiteRateId> {
    // Both dates inclusive
    List<SuiteRate> findByRateDateBetweenOrderBySuiteIdAscRateDateAsc(LocalDate from, LocalDate to);

    List<SuiteRate> findBySuiteIdInAndRateDateBetween(Collection<Long> suiteIds, LocalDate from, LocalDate to);

    @Modifying
    @Query("DELETE FROM SuiteRate r WHERE r.suiteId IN :suiteIds AND r.rateDate IN :dates")
    int deleteRates(@Param("suiteIds") Collection<Long> suiteIds, @Param("dates") Collection<LocalDate> dates);
}
