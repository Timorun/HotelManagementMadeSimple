package com.timorun.hmms.controllers;

import com.timorun.hmms.dto.CreateReservationRequest;
import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.dto.UpdateReservationRequest;
import com.timorun.hmms.services.ReservationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reservations")
@CrossOrigin(origins = "*")
public class ReservationController {
    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    /**
     * Create a new reservation.
     * POST /api/reservations
     */
    @PostMapping
    public ResponseEntity<ReservationResponse> createReservation(@RequestBody CreateReservationRequest request) {
        try {
            ReservationResponse response = reservationService.createReservation(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get a single reservation by ID.
     * GET /api/reservations/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ReservationResponse> getReservation(@PathVariable Long id) {
        try {
            ReservationResponse response = reservationService.getReservation(id);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * List reservations in a date range.
     * GET /api/reservations?from=2024-01-01&to=2024-01-31
     */
    @GetMapping
    public ResponseEntity<List<ReservationResponse>> listReservations(
            @RequestParam LocalDate from,
            @RequestParam LocalDate to) {
        List<ReservationResponse> reservations = reservationService.listReservations(from, to);
        return ResponseEntity.ok(reservations);
    }

    /**
     * Get all reservations for a specific guest.
     * GET /api/reservations/guest/{guestId}
     */
    @GetMapping("/guest/{guestId}")
    public ResponseEntity<List<ReservationResponse>> getGuestReservations(@PathVariable Long guestId) {
        List<ReservationResponse> reservations = reservationService.getGuestReservations(guestId);
        return ResponseEntity.ok(reservations);
    }

    /**
     * Update an existing reservation.
     * PUT /api/reservations/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ReservationResponse> updateReservation(
            @PathVariable Long id,
            @RequestBody UpdateReservationRequest request) {
        try {
            ReservationResponse response = reservationService.updateReservation(id, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Cancel a reservation (soft delete - status = 'cancelled').
     * PATCH /api/reservations/{id}/cancel
     */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ReservationResponse> cancelReservation(@PathVariable Long id) {
        try {
            ReservationResponse response = reservationService.cancelReservation(id);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
