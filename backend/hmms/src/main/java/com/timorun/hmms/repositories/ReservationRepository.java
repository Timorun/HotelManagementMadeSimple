package com.timorun.hmms.repositories;

import com.timorun.hmms.entities.Reservation;
import com.timorun.hmms.entities.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    // Find reservations for today (check-in today)
    @Query("SELECT r FROM Reservation r WHERE r.checkIn = :today AND r.status = com.timorun.hmms.entities.ReservationStatus.CONFIRMED")
    List<Reservation> findArrivalsToday(@Param("today") LocalDate today);

    // Find reservations with check-out today
    @Query("SELECT r FROM Reservation r WHERE r.checkOut = :today AND r.status IN (com.timorun.hmms.entities.ReservationStatus.CONFIRMED, com.timorun.hmms.entities.ReservationStatus.CHECKED_IN)")
    List<Reservation> findDeparturestoday(@Param("today") LocalDate today);

    // Find active reservations for a specific suite
    @Query("SELECT r FROM Reservation r WHERE r.suite.suiteId = :suiteId AND r.status != com.timorun.hmms.entities.ReservationStatus.CANCELLED")
    List<Reservation> findActiveBySuite(@Param("suiteId") Long suiteId);

    // Find all reservations with specific status
    List<Reservation> findByStatus(ReservationStatus status);

    @Query("""
            SELECT CASE WHEN COUNT(r) > 0 THEN TRUE ELSE FALSE END
            FROM Reservation r
            WHERE r.suite.suiteId = :suiteId
              AND r.guest.guestId = :guestId
              AND r.checkIn = :checkIn
              AND r.checkOut = :checkOut
              AND r.status <> :status
            """)
    boolean existsDuplicateReservation(
            @Param("suiteId") Long suiteId,
            @Param("guestId") Long guestId,
            @Param("checkIn") LocalDate checkIn,
            @Param("checkOut") LocalDate checkOut,
            @Param("status") ReservationStatus status
    );
}

