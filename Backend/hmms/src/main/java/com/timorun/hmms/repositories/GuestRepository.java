package com.timorun.hmms.repositories;

import com.timorun.hmms.entities.Guest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GuestRepository extends JpaRepository<Guest, Long> {
    // Find a guest by their email
    Optional<Guest> findByEmail(String email);

    // Find all guests by last name (case-insensitive)
    List<Guest> findByLastNameIgnoreCase(String lastName);
}