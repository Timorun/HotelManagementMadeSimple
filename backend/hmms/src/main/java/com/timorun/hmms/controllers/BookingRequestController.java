package com.timorun.hmms.controllers;

import com.timorun.hmms.dto.BookingRequestDecision;
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
 * Owner-side handling of booking requests ("solicitudes"): new requests, and accepted ones
 * waiting for payment.
 */
@RestController
@RequestMapping("/api/booking-requests")
public class BookingRequestController {
    private final BookingRequestService bookingRequestService;

    public BookingRequestController(BookingRequestService bookingRequestService) {
        this.bookingRequestService = bookingRequestService;
    }

    /** GET /api/booking-requests: new requests */
    @GetMapping
    public List<ReservationResponse> pending() {
        return bookingRequestService.listPending();
    }

    /** GET /api/booking-requests/awaiting-payment */
    @GetMapping("/awaiting-payment")
    public List<ReservationResponse> awaitingPayment() {
        return bookingRequestService.listAwaitingPayment();
    }

    /** GET /api/booking-requests/count: {"pending": 2, "awaitingPayment": 1, "overdue": 0} */
    @GetMapping("/count")
    public Map<String, Long> count() {
        return bookingRequestService.counts();
    }

    /** PATCH /api/booking-requests/{id}/accept {"priceTotal": 450, "paymentDueDate": "...", "message": "..."} */
    @PatchMapping("/{id}/accept")
    public ReservationResponse accept(@PathVariable Long id, @RequestBody(required = false) BookingRequestDecision decision) {
        return bookingRequestService.accept(id, decision);
    }

    /** PATCH /api/booking-requests/{id}/paid {"message": "..."} */
    @PatchMapping("/{id}/paid")
    public ReservationResponse markPaid(@PathVariable Long id, @RequestBody(required = false) BookingRequestDecision decision) {
        return bookingRequestService.markPaid(id, decision);
    }

    /** PATCH /api/booking-requests/{id}/payment-deadline {"paymentDueDate": "...", "notifyGuest": true} */
    @PatchMapping("/{id}/payment-deadline")
    public ReservationResponse extendPaymentDeadline(@PathVariable Long id, @RequestBody BookingRequestDecision decision) {
        return bookingRequestService.extendPaymentDeadline(id, decision);
    }

    /** PATCH /api/booking-requests/{id}/reject {"message": "..."}: rejects a new request or cancels an unpaid one */
    @PatchMapping("/{id}/reject")
    public ReservationResponse reject(@PathVariable Long id, @RequestBody(required = false) BookingRequestDecision decision) {
        return bookingRequestService.reject(id, decision);
    }
}
