package com.timorun.hmms.controllers;

import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.dto.RoomCleaningResponse;
import com.timorun.hmms.services.OperationalViewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/operations")
public class OperationalViewController {
    private final OperationalViewService operationalViewService;

    public OperationalViewController(OperationalViewService operationalViewService) {
        this.operationalViewService = operationalViewService;
    }

    /**
     * Get all arrivals for today.
     * GET /api/operations/arrivals/today
     */
    @GetMapping("/arrivals/today")
    public ResponseEntity<List<ReservationResponse>> getArrivalsToday() {
        List<ReservationResponse> arrivals = operationalViewService.getArrivalsToday();
        return ResponseEntity.ok(arrivals);
    }

    /**
     * Get arrivals for a specific date.
     * GET /api/operations/arrivals?date=2026-01-15
     */
    @GetMapping("/arrivals")
    public ResponseEntity<List<ReservationResponse>> getArrivals(@RequestParam LocalDate date) {
        List<ReservationResponse> arrivals = operationalViewService.getArrivals(date);
        return ResponseEntity.ok(arrivals);
    }

    /**
     * Get all departures for today.
     * GET /api/operations/departures/today
     */
    @GetMapping("/departures/today")
    public ResponseEntity<List<ReservationResponse>> getDeparturesToday() {
        List<ReservationResponse> departures = operationalViewService.getDeparturesToday();
        return ResponseEntity.ok(departures);
    }

    /**
     * Get departures for a specific date.
     * GET /api/operations/departures?date=2026-01-15
     */
    @GetMapping("/departures")
    public ResponseEntity<List<ReservationResponse>> getDepartures(@RequestParam LocalDate date) {
        List<ReservationResponse> departures = operationalViewService.getDepartures(date);
        return ResponseEntity.ok(departures);
    }

    /**
     * Get rooms to clean (rooms with departures today or past checkouts not marked as cleaned).
     * GET /api/operations/rooms-to-clean
     */
    @GetMapping("/rooms-to-clean")
    public ResponseEntity<List<RoomCleaningResponse>> getRoomsToClean() {
        List<RoomCleaningResponse> rooms = operationalViewService.getRoomsToClean();
        return ResponseEntity.ok(rooms);
    }

    /**
     * Get current occupancy status.
     * GET /api/operations/occupancy?date=2026-01-15
     */
    @GetMapping("/occupancy")
    public ResponseEntity<List<ReservationResponse>> getCurrentOccupancy(@RequestParam(required = false) LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        List<ReservationResponse> occupied = operationalViewService.getOccupancyForDate(targetDate);
        return ResponseEntity.ok(occupied);
    }

    /**
     * Get calendar data for a date range (for calendar view).
     * GET /api/operations/calendar?from=2026-01-01&to=2026-01-31
     */
    @GetMapping("/calendar")
    public ResponseEntity<List<ReservationResponse>> getCalendarData(
            @RequestParam LocalDate from,
            @RequestParam LocalDate to) {
        List<ReservationResponse> reservations = operationalViewService.getCalendarData(from, to);
        return ResponseEntity.ok(reservations);
    }
}
