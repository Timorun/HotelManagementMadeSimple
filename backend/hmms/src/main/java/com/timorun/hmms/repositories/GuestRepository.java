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

    // Case-insensitive email lookup that skips anonymized guests (an email can repeat across guests)
    List<Guest> findByEmailIgnoreCaseAndAnonymizedAtIsNull(String email);

    List<Guest> findByAnonymizedAtIsNull();

    List<Guest> findByFirstNameIgnoreCaseAndLastNameIgnoreCaseAndAnonymizedAtIsNull(String firstName, String lastName);
}
