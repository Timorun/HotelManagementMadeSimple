package com.timorun.hmms.repositories;

import com.timorun.hmms.entities.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByCheckInBetween(
            LocalDate start,
            LocalDate end
    );

    // Find all reservations for a specific guest
    List<Reservation> findByGuestGuestId(Long guestId);

    // Find reservations that overlap with a specific date range
    List<Reservation> findByCheckInBeforeAndCheckOutAfter(LocalDate checkOut, LocalDate checkIn);
}
}

