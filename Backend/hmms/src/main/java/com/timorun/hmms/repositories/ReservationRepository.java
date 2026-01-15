package com.timorun.hmms.repositories;

import com.timorun.hmms.entities.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

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

    // Find reservations for today (check-in today)
    @Query("SELECT r FROM Reservation r WHERE r.checkIn = :today AND r.status = 'confirmed'")
    List<Reservation> findArrivalsToday(@Param("today") LocalDate today);

    // Find reservations with check-out today
    @Query("SELECT r FROM Reservation r WHERE r.checkOut = :today AND r.status IN ('confirmed', 'completed')")
    List<Reservation> findDeparturestoday(@Param("today") LocalDate today);

    // Find active reservations for a specific suite
    @Query("SELECT r FROM Reservation r WHERE r.suite.suiteId = :suiteId AND r.status != 'cancelled'")
    List<Reservation> findActiveBySuite(@Param("suiteId") Long suiteId);

    // Find all reservations with specific status
    List<Reservation> findByStatus(String status);
}

