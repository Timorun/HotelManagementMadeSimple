package com.timorun.hmms.services;

import com.timorun.hmms.dto.ReservationResponse;
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
                .phone(reservation.getGuest().getPhone())
                .guestNotes(reservation.getGuest().getNotes())
                .checkIn(reservation.getCheckIn())
                .checkOut(reservation.getCheckOut())
                .numGuests(reservation.getNumGuests())
                .priceTotal(reservation.getPriceTotal())
                .channel(reservation.getChannel())
                .notes(reservation.getNotes())
                .status(reservation.getStatus().getValue())
                .statusLabel(reservation.getStatus().getLabel())
                .statusColor(reservation.getStatus().getColor())
                .createdAt(reservation.getCreatedAt())
                .build();
    }
}
