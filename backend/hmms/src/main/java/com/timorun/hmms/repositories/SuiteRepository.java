package com.timorun.hmms.repositories;

import com.timorun.hmms.entities.Suite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SuiteRepository extends JpaRepository<Suite, Long> {

    Optional<Suite> findByIcalExportToken(String icalExportToken);

    List<Suite> findByBookingIcalUrlIsNotNull();
}