package com.timorun.hmms.controllers;

import com.timorun.hmms.dto.ConfirmBookingRequest;
import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.services.BookingRequestService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Owner-side handling of pending booking requests ("solicitudes").
 */
@RestController
@RequestMapping("/api/booking-requests")
public class BookingRequestController {
    private final BookingRequestService bookingRequestService;

    public BookingRequestController(BookingRequestService bookingRequestService) {
        this.bookingRequestService = bookingRequestService;
    }

    /** GET /api/booking-requests */
    @GetMapping
    public List<ReservationResponse> pending() {
        return bookingRequestService.listPending();
    }

    /** GET /api/booking-requests/count */
    @GetMapping("/count")
    public Map<String, Long> count() {
        return Map.of("pending", bookingRequestService.countPending());
    }

    /** PATCH /api/booking-requests/{id}/confirm {"priceTotal": 450, "message": "..."} */
    @PatchMapping("/{id}/confirm")
    public ReservationResponse confirm(@PathVariable Long id, @RequestBody(required = false) ConfirmBookingRequest decision) {
        return bookingRequestService.confirm(id, decision);
    }

    /** PATCH /api/booking-requests/{id}/reject {"message": "..."} */
    @PatchMapping("/{id}/reject")
    public ReservationResponse reject(@PathVariable Long id, @RequestBody(required = false) ConfirmBookingRequest decision) {
        return bookingRequestService.reject(id, decision);
    }
}
