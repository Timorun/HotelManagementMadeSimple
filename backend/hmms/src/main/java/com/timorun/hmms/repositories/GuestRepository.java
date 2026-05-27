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

    // Search guests by first or last name (case-insensitive, partial match)
    // This is a Spring Data JPA derived query method:
    // Containing → SQL LIKE '%query%' (partial match).
    // IgnoreCase → case-insensitive match.
    // Or → matches if either the first name OR the last name contains the query.
    List<Guest> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(String firstName, String lastName);

    List<Guest> findByFirstNameIgnoreCaseAndLastNameIgnoreCaseAndAnonymizedAtIsNull(String firstName, String lastName);
}