package com.timorun.hmms.services;

import com.timorun.hmms.dto.SuiteRequest;
import com.timorun.hmms.dto.SuiteResponse;
import com.timorun.hmms.entities.Suite;
import com.timorun.hmms.repositories.SuiteRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SuiteService {
    private final SuiteRepository suiteRepository;

    public SuiteService(SuiteRepository suiteRepository) {
        this.suiteRepository = suiteRepository;
    }

    /**
     * Create a new suite.
     */
    public SuiteResponse createSuite(SuiteRequest request) {
        validateSuiteRequest(request);
        
        Suite suite = new Suite();
        suite.setSuiteName(request.getSuiteName());
        suite.setCapacity(request.getCapacity());
        suite.setActive(request.getActive() != null ? request.getActive() : true);
        suite.setBookingIcalUrl(normalizeIcalUrl(request.getBookingIcalUrl()));
        
        Suite saved = suiteRepository.save(suite);
        return toResponse(saved);
    }

    /**
     * Get a single suite by ID.
     */
    public SuiteResponse getSuite(Long suiteId) {
        Suite suite = suiteRepository.findById(suiteId)
                .orElseThrow(() -> new IllegalArgumentException("Suite not found with ID: " + suiteId));
        return toResponse(suite);
    }

    /**
     * Get all suites.
     */
    public List<SuiteResponse> getAllSuites() {
        return suiteRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all active suites.
     */
    public List<SuiteResponse> getActiveSuites() {
        return suiteRepository.findAll()
                .stream()
                .filter(Suite::getActive)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Update an existing suite.
     */
    public SuiteResponse updateSuite(Long suiteId, SuiteRequest request) {
        validateSuiteRequest(request);
        
        Suite suite = suiteRepository.findById(suiteId)
                .orElseThrow(() -> new IllegalArgumentException("Suite not found with ID: " + suiteId));
        
        suite.setSuiteName(request.getSuiteName());
        suite.setCapacity(request.getCapacity());
        suite.setActive(request.getActive() != null ? request.getActive() : suite.getActive());
        if (request.getBookingIcalUrl() != null) {
            suite.setBookingIcalUrl(normalizeIcalUrl(request.getBookingIcalUrl()));
            suite.setIcalLastSyncError(null);
        }
        
        Suite updated = suiteRepository.save(suite);
        return toResponse(updated);
    }

    /**
     * Deactivate a suite (soft delete).
     */
    public SuiteResponse deactivateSuite(Long suiteId) {
        Suite suite = suiteRepository.findById(suiteId)
                .orElseThrow(() -> new IllegalArgumentException("Suite not found with ID: " + suiteId));
        
        if (!suite.getActive()) {
            throw new IllegalArgumentException("Suite is already deactivated");
        }
        
        suite.setActive(false);
        Suite updated = suiteRepository.save(suite);
        return toResponse(updated);
    }

    /**
     * Reactivate a deactivated suite.
     */
    public SuiteResponse reactivateSuite(Long suiteId) {
        Suite suite = suiteRepository.findById(suiteId)
                .orElseThrow(() -> new IllegalArgumentException("Suite not found with ID: " + suiteId));
        
        if (suite.getActive()) {
            throw new IllegalArgumentException("Suite is already active");
        }
        
        suite.setActive(true);
        Suite updated = suiteRepository.save(suite);
        return toResponse(updated);
    }

    // ===== PRIVATE HELPER METHODS =====

    private void validateSuiteRequest(SuiteRequest request) {
        if (request.getSuiteName() == null || request.getSuiteName().isBlank()) {
            throw new IllegalArgumentException("Suite name is required");
        }
        if (request.getCapacity() == null || request.getCapacity() <= 0) {
            throw new IllegalArgumentException("Capacity must be greater than 0");
        }
    }

    private static String normalizeIcalUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String trimmed = url.trim();
        if (trimmed.startsWith("webcal://")) {
            trimmed = "https://" + trimmed.substring("webcal://".length());
        }
        if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://")) {
            throw new IllegalArgumentException("The calendar URL must start with https://");
        }
        return trimmed;
    }

    private SuiteResponse toResponse(Suite suite) {
        return SuiteResponse.builder()
                .suiteId(suite.getSuiteId())
                .suiteName(suite.getSuiteName())
                .capacity(suite.getCapacity())
                .active(suite.getActive())
                .bookingIcalUrl(suite.getBookingIcalUrl())
                .icalExportUrl(icalExportUrl(suite))
                .icalLastSyncAt(suite.getIcalLastSyncAt())
                .icalLastSyncError(suite.getIcalLastSyncError())
                .build();
    }

    // Absolute URL of the suite's feed, based on the current request (honours X-Forwarded-* behind a proxy)
    private static String icalExportUrl(Suite suite) {
        if (suite.getIcalExportToken() == null || RequestContextHolder.getRequestAttributes() == null) {
            return null;
        }
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/public/ical/{token}.ics")
                .buildAndExpand(suite.getIcalExportToken())
                .toUriString();
    }
}
