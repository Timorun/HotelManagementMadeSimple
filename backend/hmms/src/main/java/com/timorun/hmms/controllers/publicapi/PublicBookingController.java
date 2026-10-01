package com.timorun.hmms.controllers.publicapi;

import com.timorun.hmms.config.HotelSettings;
import com.timorun.hmms.dto.PublicBookingRequest;
import com.timorun.hmms.dto.PublicBookingResponse;
import com.timorun.hmms.dto.PublicSuiteAvailability;
import com.timorun.hmms.entities.Nationality;
import com.timorun.hmms.repositories.NationalityRepository;
import com.timorun.hmms.security.PublicRateLimiter;
import com.timorun.hmms.services.BookingRequestService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Unauthenticated endpoints for the public booking page.
 */
@RestController
@RequestMapping("/api/public")
public class PublicBookingController {
    private final BookingRequestService bookingRequestService;
    private final PublicRateLimiter rateLimiter;
    private final HotelSettings settings;
    private final NationalityRepository nationalityRepository;

    public PublicBookingController(BookingRequestService bookingRequestService, PublicRateLimiter rateLimiter,
                                   HotelSettings settings, NationalityRepository nationalityRepository) {
        this.bookingRequestService = bookingRequestService;
        this.rateLimiter = rateLimiter;
        this.settings = settings;
        this.nationalityRepository = nationalityRepository;
    }

    /**
     * Countries for the nationality field.
     * GET /api/public/nationalities
     */
    @GetMapping("/nationalities")
    public List<Nationality> nationalities() {
        return nationalityRepository.findAll();
    }

    /**
     * GET /api/public/hotel
     */
    @GetMapping("/hotel")
    public Map<String, String> hotel() {
        return Map.of("name", settings.getHotelName());
    }

    /**
     * Suites that can be requested for the stay.
     * GET /api/public/availability?checkIn=2026-07-01&checkOut=2026-07-04&guests=2
     */
    @GetMapping("/availability")
    public List<PublicSuiteAvailability> availability(
            @RequestParam LocalDate checkIn,
            @RequestParam LocalDate checkOut,
            @RequestParam(defaultValue = "1") int guests) {
        return bookingRequestService.findAvailableSuites(checkIn, checkOut, guests);
    }

    /**
     * POST /api/public/booking-requests
     */
    @PostMapping("/booking-requests")
    public ResponseEntity<PublicBookingResponse> submit(@RequestBody PublicBookingRequest request, HttpServletRequest httpRequest) {
        rateLimiter.check(httpRequest, "booking-request");
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingRequestService.submitRequest(request));
    }
}
