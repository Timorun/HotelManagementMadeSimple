package com.timorun.hmms.controllers;

import com.timorun.hmms.dto.GuestRequest;
import com.timorun.hmms.dto.GuestResponse;
import com.timorun.hmms.dto.ErrorResponse;
import com.timorun.hmms.services.GuestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/guests")
public class GuestController {
    private final GuestService guestService;

    public GuestController(GuestService guestService) {
        this.guestService = guestService;
    }

    /**
     * Create a new guest.
     * POST /api/guests
     */
    @PostMapping
    public ResponseEntity<?> createGuest(@RequestBody GuestRequest request) {
        try {
            GuestResponse response = guestService.createGuest(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Get a single guest by ID.
     * GET /api/guests/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<GuestResponse> getGuest(@PathVariable Long id) {
        try {
            GuestResponse response = guestService.getGuest(id);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get all guests.
     * GET /api/guests
     */
    @GetMapping
    public ResponseEntity<List<GuestResponse>> getAllGuests() {
        List<GuestResponse> guests = guestService.getAllGuests();
        return ResponseEntity.ok(guests);
    }

    /**
     * Search guests by first or last name.
     * GET /api/guests/search?q=doe
     */
    @GetMapping("/search")
    public ResponseEntity<List<GuestResponse>> searchGuests( @RequestParam(required = false) String q ) {
        if(q == null || q.isBlank())
        {
            return ResponseEntity.ok().build();
        }

        List<GuestResponse> guests = guestService.searchByName(q);
        return ResponseEntity.ok(guests);
    }

    /**
     * Find guest by email.
     * GET /api/guests/email?email=john@example.com
     */
    @GetMapping("/email")
    public ResponseEntity<GuestResponse> findByEmail(@RequestParam String email) {
        try {
            GuestResponse response = guestService.findByEmail(email);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Update an existing guest.
     * PUT /api/guests/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateGuest(
            @PathVariable Long id,
            @RequestBody GuestRequest request) {
        try {
            GuestResponse response = guestService.updateGuest(id, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Anonymize a guest (GDPR-compliant deletion).
     * PATCH /api/guests/{id}/anonymize
     */
    @PatchMapping("/{id}/anonymize")
    public ResponseEntity<GuestResponse> anonymizeGuest(@PathVariable Long id) {
        try {
            GuestResponse response = guestService.anonymizeGuest(id);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
