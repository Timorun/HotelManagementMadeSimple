package com.timorun.hmms.services;

import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.dto.RoomCleaningResponse;
import com.timorun.hmms.entities.Reservation;
import com.timorun.hmms.entities.ReservationStatus;
import com.timorun.hmms.repositories.ReservationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OperationalViewService {
    private final ReservationRepository reservationRepository;

    public OperationalViewService(ReservationRepository reservationRepository) {
        this.reservationRepository = reservationRepository;
    }

    /**
     * Get all arrivals for today.
     */
    public List<ReservationResponse> getArrivalsToday() {
        return getArrivals(LocalDate.now());
    }

    /**
     * Get arrivals for a specific date.
     */
    public List<ReservationResponse> getArrivals(LocalDate date) {
        return reservationRepository.findArrivalsToday(date)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all departures for today.
     */
    public List<ReservationResponse> getDeparturesToday() {
        return getDepartures(LocalDate.now());
    }

    /**
     * Get departures for a specific date.
     */
    public List<ReservationResponse> getDepartures(LocalDate date) {
        return reservationRepository.findDeparturestoday(date)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get rooms that need cleaning.
     * This includes:
     * - Rooms with checkout today
     * - Rooms that need turnover (checkout completed, new arrival coming)
     */
    public List<RoomCleaningResponse> getRoomsToClean() {
        LocalDate today = LocalDate.now();
        List<Reservation> departuresToday = reservationRepository.findDeparturestoday(today);
        List<Reservation> arrivalsToday = reservationRepository.findArrivalsToday(today);

        return departuresToday.stream()
                .map(departure -> {
                    // Check if there's an arrival today for the same suite
                    Reservation nextArrival = arrivalsToday.stream()
                            .filter(arr -> arr.getSuite().getSuiteId().equals(departure.getSuite().getSuiteId()))
                            .findFirst()
                            .orElse(null);

                    String status;
                    LocalDate nextCheckIn = null;
                    
                    if (nextArrival != null) {
                        status = "needs_turnover"; // Quick clean needed
                        nextCheckIn = nextArrival.getCheckIn();
                    } else {
                        status = "checkout_today"; // Standard clean
                    }

                    return RoomCleaningResponse.builder()
                            .suiteId(departure.getSuite().getSuiteId())
                            .suiteName(departure.getSuite().getSuiteName())
                            .reservationId(departure.getReservationId())
                            .guestName(departure.getGuest().getFirstName() + " " + departure.getGuest().getLastName())
                            .checkOut(departure.getCheckOut())
                            .status(status)
                            .nextCheckIn(nextCheckIn)
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Get current occupancy for a specific date (which rooms are occupied).
     */
    public List<ReservationResponse> getOccupancyForDate(LocalDate date) {
        // Find reservations where checkIn <= date AND checkOut > date
        LocalDate dayAfter = date.plusDays(1);
        return reservationRepository.findByCheckInBeforeAndCheckOutAfter(dayAfter, date)
                .stream()
                .filter(r -> r.getStatus() == ReservationStatus.CONFIRMED || r.getStatus() == ReservationStatus.CHECKED_IN)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get calendar data for date range.
     * This returns all reservations that overlap with the given date range.
     */
    public List<ReservationResponse> getCalendarData(LocalDate from, LocalDate to) {
        return reservationRepository.findByCheckInBeforeAndCheckOutAfter(to.plusDays(1), from)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ===== PRIVATE HELPER METHODS =====

    private ReservationResponse toResponse(Reservation reservation) {
        return ReservationResponse.builder()
                .reservationId(reservation.getReservationId())
                .suiteId(reservation.getSuite().getSuiteId())
                .suiteName(reservation.getSuite().getSuiteName())
                .guestId(reservation.getGuest().getGuestId())
                .guestName(reservation.getGuest().getFirstName() + " " + reservation.getGuest().getLastName())
                .email(reservation.getGuest().getEmail())
                .checkIn(reservation.getCheckIn())
                .checkOut(reservation.getCheckOut())
                .numGuests(reservation.getNumGuests())
                .priceTotal(reservation.getPriceTotal())
                .channel(reservation.getChannel())
                .status(reservation.getStatus().getValue())
                .statusLabel(reservation.getStatus().getLabel())
                .statusColor(reservation.getStatus().getColor())
                .createdAt(reservation.getCreatedAt())
                .build();
    }
}
