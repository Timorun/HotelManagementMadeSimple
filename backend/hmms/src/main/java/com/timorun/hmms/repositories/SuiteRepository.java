package com.timorun.hmms.repositories;

import com.timorun.hmms.entities.Suite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SuiteRepository extends JpaRepository<Suite, Long> {

    // Basic CRUD is already included!
    // You can add custom finders like this:
//    List<Suite> findByCapacityGreaterThanEqual(Integer capacity);
}