package com.timorun.hmms.controllers;

import com.timorun.hmms.dto.SuiteRequest;
import com.timorun.hmms.dto.SuiteResponse;
import com.timorun.hmms.services.SuiteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suites")
@CrossOrigin(origins = "*")
public class SuiteController {
    private final SuiteService suiteService;

    public SuiteController(SuiteService suiteService) {
        this.suiteService = suiteService;
    }

    /**
     * Create a new suite.
     * POST /api/suites
     */
    @PostMapping
    public ResponseEntity<SuiteResponse> createSuite(@RequestBody SuiteRequest request) {
        try {
            SuiteResponse response = suiteService.createSuite(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get a single suite by ID.
     * GET /api/suites/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<SuiteResponse> getSuite(@PathVariable Long id) {
        try {
            SuiteResponse response = suiteService.getSuite(id);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get all suites.
     * GET /api/suites
     */
    @GetMapping
    public ResponseEntity<List<SuiteResponse>> getAllSuites() {
        List<SuiteResponse> suites = suiteService.getAllSuites();
        return ResponseEntity.ok(suites);
    }

    /**
     * Get all active suites.
     * GET /api/suites/active
     */
    @GetMapping("/active")
    public ResponseEntity<List<SuiteResponse>> getActiveSuites() {
        List<SuiteResponse> suites = suiteService.getActiveSuites();
        return ResponseEntity.ok(suites);
    }

    /**
     * Update an existing suite.
     * PUT /api/suites/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<SuiteResponse> updateSuite(
            @PathVariable Long id,
            @RequestBody SuiteRequest request) {
        try {
            SuiteResponse response = suiteService.updateSuite(id, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Deactivate a suite (soft delete).
     * PATCH /api/suites/{id}/deactivate
     */
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<SuiteResponse> deactivateSuite(@PathVariable Long id) {
        try {
            SuiteResponse response = suiteService.deactivateSuite(id);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Reactivate a deactivated suite.
     * PATCH /api/suites/{id}/reactivate
     */
    @PatchMapping("/{id}/reactivate")
    public ResponseEntity<SuiteResponse> reactivateSuite(@PathVariable Long id) {
        try {
            SuiteResponse response = suiteService.reactivateSuite(id);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
