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

    // Find reservations that overlap with a specific date range for a nationality
    @Query("""
            SELECT r
            FROM Reservation r
            WHERE r.checkIn < :checkOut
              AND r.checkOut > :checkIn
              AND r.guest.nationality IS NOT NULL
              AND UPPER(r.guest.nationality.nationalityCode) = UPPER(:nationalityCode)
            """)
    List<Reservation> findByCheckInBeforeAndCheckOutAfterAndGuestNationalityNationalityCodeIgnoreCase(
            @Param("checkOut") LocalDate checkOut,
            @Param("checkIn") LocalDate checkIn,
            @Param("nationalityCode") String nationalityCode
    );

    // Find reservations starting in a period for a nationality
    @Query("""
            SELECT r
            FROM Reservation r
            WHERE r.checkIn BETWEEN :start AND :end
              AND r.guest.nationality IS NOT NULL
              AND UPPER(r.guest.nationality.nationalityCode) = UPPER(:nationalityCode)
            """)
    List<Reservation> findByCheckInBetweenAndGuestNationalityNationalityCodeIgnoreCase(
            @Param("start") LocalDate start,
            @Param("end") LocalDate end,
            @Param("nationalityCode") String nationalityCode
    );

    // Arrivals on a date: still expected (pending/confirmed) or already checked in,
    // so a guest stays in the list after being marked as arrived.
    @Query("""
            SELECT r FROM Reservation r
            WHERE r.checkIn = :date
              AND r.status IN (com.timorun.hmms.entities.ReservationStatus.PENDING,
                               com.timorun.hmms.entities.ReservationStatus.CONFIRMED,
                               com.timorun.hmms.entities.ReservationStatus.CHECKED_IN)
            ORDER BY r.suite.suiteName
            """)
    List<Reservation> findArrivalsOn(@Param("date") LocalDate date);

    // Departures on a date: still in house (confirmed/checked in) or already checked out.
    @Query("""
            SELECT r FROM Reservation r
            WHERE r.checkOut = :date
              AND r.status IN (com.timorun.hmms.entities.ReservationStatus.CONFIRMED,
                               com.timorun.hmms.entities.ReservationStatus.CHECKED_IN,
                               com.timorun.hmms.entities.ReservationStatus.CHECKED_OUT)
            ORDER BY r.suite.suiteName
            """)
    List<Reservation> findDeparturesOn(@Param("date") LocalDate date);

    // Find active reservations for a specific suite
    @Query("SELECT r FROM Reservation r WHERE r.suite.suiteId = :suiteId AND r.status != com.timorun.hmms.entities.ReservationStatus.CANCELLED")
    List<Reservation> findActiveBySuite(@Param("suiteId") Long suiteId);

    // Non-cancelled reservations of one suite overlapping [checkIn, checkOut), optionally excluding one reservation
    @Query("""
            SELECT r
            FROM Reservation r
            WHERE r.suite.suiteId = :suiteId
              AND r.checkIn < :checkOut
              AND r.checkOut > :checkIn
              AND r.status <> com.timorun.hmms.entities.ReservationStatus.CANCELLED
              AND (:excludeReservationId IS NULL OR r.reservationId <> :excludeReservationId)
            """)
    List<Reservation> findActiveOverlapping(
            @Param("suiteId") Long suiteId,
            @Param("checkIn") LocalDate checkIn,
            @Param("checkOut") LocalDate checkOut,
            @Param("excludeReservationId") Long excludeReservationId
    );

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

