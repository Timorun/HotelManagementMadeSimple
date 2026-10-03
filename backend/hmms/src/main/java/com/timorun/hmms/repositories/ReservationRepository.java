package com.timorun.hmms.repositories;

import com.timorun.hmms.entities.Reservation;
import com.timorun.hmms.entities.ReservationStatus;
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

    // Arrivals on a date: still expected (pending/awaiting payment/confirmed) or already checked
    // in, so a guest stays in the list after being marked as arrived.
    @Query("""
            SELECT r FROM Reservation r
            WHERE r.checkIn = :date
              AND r.status IN (com.timorun.hmms.entities.ReservationStatus.PENDING,
                               com.timorun.hmms.entities.ReservationStatus.AWAITING_PAYMENT,
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

    long countByStatus(ReservationStatus status);

    Optional<Reservation> findByExternalUid(String externalUid);

    Optional<Reservation> findFirstByExternalRef(String externalRef);

    // Calendar-imported stays of a suite that haven't ended yet
    @Query("""
            SELECT r FROM Reservation r
            WHERE r.suite.suiteId = :suiteId
              AND r.externalUid IS NOT NULL
              AND r.checkOut > :today
            """)
    List<Reservation> findUpcomingImported(@Param("suiteId") Long suiteId, @Param("today") LocalDate today);

    // Stays to publish in a suite's own iCal feed: not cancelled, not ended, not imported from booking.com
    @Query("""
            SELECT r FROM Reservation r
            WHERE r.suite.suiteId = :suiteId
              AND r.externalUid IS NULL
              AND r.checkOut > :from
              AND r.status NOT IN (com.timorun.hmms.entities.ReservationStatus.CANCELLED,
                                   com.timorun.hmms.entities.ReservationStatus.NO_SHOW)
            ORDER BY r.checkIn
            """)
    List<Reservation> findForIcalExport(@Param("suiteId") Long suiteId, @Param("from") LocalDate from);

    // Reservations flagged as overlapping after a calendar import
    List<Reservation> findBySyncConflictTrueAndCheckOutAfter(LocalDate date);

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

