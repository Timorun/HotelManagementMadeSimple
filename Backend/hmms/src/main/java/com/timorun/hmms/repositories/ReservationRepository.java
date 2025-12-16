package com.timorun.hmms.repositories;

import com.timorun.hmms.entities.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByCheckInBetween(
            LocalDate start,
            LocalDate end
    );
}

