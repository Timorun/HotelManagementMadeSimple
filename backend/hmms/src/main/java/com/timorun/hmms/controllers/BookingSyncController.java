package com.timorun.hmms.controllers;

import com.timorun.hmms.dto.BookingImportRequest;
import com.timorun.hmms.dto.BookingImportResult;
import com.timorun.hmms.dto.IcalSyncResult;
import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.repositories.ReservationRepository;
import com.timorun.hmms.services.BookingIcalSyncService;
import com.timorun.hmms.services.BookingImportService;
import com.timorun.hmms.services.ReservationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * Booking.com calendar sync and reservations-export import.
 */
@RestController
@RequestMapping("/api/booking-sync")
public class BookingSyncController {
    private final BookingIcalSyncService icalSyncService;
    private final BookingImportService importService;
    private final ReservationRepository reservationRepository;
    private final ReservationService reservationService;

    public BookingSyncController(BookingIcalSyncService icalSyncService, BookingImportService importService,
                                 ReservationRepository reservationRepository, ReservationService reservationService) {
        this.icalSyncService = icalSyncService;
        this.importService = importService;
        this.reservationRepository = reservationRepository;
        this.reservationService = reservationService;
    }

    /** POST /api/booking-sync/ical — sync every suite that has a booking.com calendar URL */
    @PostMapping("/ical")
    public List<IcalSyncResult> syncAll() {
        return icalSyncService.syncAll();
    }

    /** POST /api/booking-sync/ical/{suiteId} */
    @PostMapping("/ical/{suiteId}")
    public IcalSyncResult syncSuite(@PathVariable Long suiteId) {
        return icalSyncService.syncSuite(suiteId);
    }

    /** Upcoming imported stays that overlap another reservation. GET /api/booking-sync/conflicts */
    @GetMapping("/conflicts")
    public List<ReservationResponse> conflicts() {
        return reservationRepository.findBySyncConflictTrueAndCheckOutAfter(LocalDate.now().minusDays(1)).stream()
                .map(reservationService::toResponse)
                .toList();
    }

    /** POST /api/booking-sync/import {"dryRun": true, "rows": [...]} */
    @PostMapping("/import")
    public BookingImportResult importExport(@RequestBody BookingImportRequest request) {
        return importService.importRows(request);
    }
}
