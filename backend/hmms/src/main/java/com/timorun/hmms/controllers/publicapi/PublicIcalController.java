package com.timorun.hmms.controllers.publicapi;

import com.timorun.hmms.services.BookingIcalSyncService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Per-suite availability feed for booking.com (Calendar sync -> import calendar).
 */
@RestController
@RequestMapping("/api/public/ical")
public class PublicIcalController {
    private static final MediaType TEXT_CALENDAR = MediaType.parseMediaType("text/calendar;charset=UTF-8");

    private final BookingIcalSyncService icalSyncService;

    public PublicIcalController(BookingIcalSyncService icalSyncService) {
        this.icalSyncService = icalSyncService;
    }

    /** GET /api/public/ical/{token}.ics */
    @GetMapping("/{token}.ics")
    public ResponseEntity<String> feed(@PathVariable String token) {
        try {
            return ResponseEntity.ok()
                    .contentType(TEXT_CALENDAR)
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                    .body(icalSyncService.exportFeed(token));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
