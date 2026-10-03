package com.timorun.hmms.services;

import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.entities.ReservationStatus;
import com.timorun.hmms.repositories.ReservationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OperationalViewService {
    private final ReservationRepository reservationRepository;
    private final ReservationService reservationService;

    public OperationalViewService(ReservationRepository reservationRepository, ReservationService reservationService) {
        this.reservationRepository = reservationRepository;
        this.reservationService = reservationService;
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
        return reservationRepository.findArrivalsOn(date)
                .stream()
                .map(reservationService::toResponse)
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
        return reservationRepository.findDeparturesOn(date)
                .stream()
                .map(reservationService::toResponse)
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
                .map(reservationService::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get calendar data for date range.
     * This returns all reservations that overlap with the given date range.
     */
    public List<ReservationResponse> getCalendarData(LocalDate from, LocalDate to) {
        return reservationRepository.findByCheckInBeforeAndCheckOutAfter(to.plusDays(1), from)
                .stream()
                .map(reservationService::toResponse)
                .collect(Collectors.toList());
    }

}
