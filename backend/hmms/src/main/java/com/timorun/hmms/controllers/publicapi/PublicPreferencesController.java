package com.timorun.hmms.controllers.publicapi;

import com.timorun.hmms.dto.PublicPreferencesResponse;
import com.timorun.hmms.security.PublicRateLimiter;
import com.timorun.hmms.services.GuestPreferencesService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Unauthenticated endpoints behind the guest "manage your preferences" links.
 */
@RestController
@RequestMapping("/api/public/preferences")
public class PublicPreferencesController {
    private final GuestPreferencesService preferencesService;
    private final PublicRateLimiter rateLimiter;

    public PublicPreferencesController(GuestPreferencesService preferencesService, PublicRateLimiter rateLimiter) {
        this.preferencesService = preferencesService;
        this.rateLimiter = rateLimiter;
    }

    /**
     * Mails a preferences link to the address if it belongs to a guest.
     * POST /api/public/preferences/request-link {"email": "..."}
     */
    @PostMapping("/request-link")
    public ResponseEntity<Void> requestLink(@RequestBody Map<String, String> body, HttpServletRequest request) {
        rateLimiter.check(request, "preferences-link");
        preferencesService.sendPreferencesLink(body.get("email"));
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{token}")
    public PublicPreferencesResponse get(@PathVariable String token) {
        return preferencesService.getPreferences(token);
    }

    @PostMapping("/{token}/opt-out")
    public PublicPreferencesResponse optOut(@PathVariable String token) {
        return preferencesService.optOut(token);
    }

    @PostMapping("/{token}/delete-request")
    public PublicPreferencesResponse requestDeletion(@PathVariable String token) {
        return preferencesService.requestDeletion(token);
    }
}
