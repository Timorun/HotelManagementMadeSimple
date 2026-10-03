package com.timorun.hmms.services;

import com.timorun.hmms.dto.SuiteRequest;
import com.timorun.hmms.dto.SuiteResponse;
import com.timorun.hmms.entities.Suite;
import com.timorun.hmms.repositories.SuiteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SuiteService {
    private static final Pattern AMENITY_KEY = Pattern.compile("[a-z][a-z0-9_]{0,39}");
    private static final int MAX_AMENITIES = 30;
    private static final int MAX_PHOTOS = 30;

    private final SuiteRepository suiteRepository;

    public SuiteService(SuiteRepository suiteRepository) {
        this.suiteRepository = suiteRepository;
    }

    /**
     * Create a new suite.
     */
    @Transactional
    public SuiteResponse createSuite(SuiteRequest request) {
        validateSuiteRequest(request);
        
        Suite suite = new Suite();
        suite.setSuiteName(request.getSuiteName());
        suite.setCapacity(request.getCapacity());
        suite.setActive(request.getActive() != null ? request.getActive() : true);
        suite.setBookingIcalUrl(normalizeIcalUrl(request.getBookingIcalUrl()));
        applyDetails(suite, request);
        
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
    @Transactional
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
        applyDetails(suite, request);
        
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

    /**
     * Booking page details (descriptions, size, amenities, photos). Fields left null keep their value.
     */
    private static void applyDetails(Suite suite, SuiteRequest request) {
        if (request.getDescriptionEn() != null) {
            suite.setDescriptionEn(normalizeDescription(request.getDescriptionEn()));
        }
        if (request.getDescriptionEs() != null) {
            suite.setDescriptionEs(normalizeDescription(request.getDescriptionEs()));
        }
        if (request.getSizeM2() != null) {
            if (request.getSizeM2() < 0 || request.getSizeM2() > 1000) {
                throw new IllegalArgumentException("Size must be between 1 and 1000 m²");
            }
            suite.setSizeM2(request.getSizeM2() == 0 ? null : request.getSizeM2());
        }
        if (request.getAmenities() != null) {
            List<String> keys = request.getAmenities().stream()
                    .filter(key -> key != null && !key.isBlank())
                    .map(key -> key.trim().toLowerCase())
                    .distinct()
                    .toList();
            if (keys.size() > MAX_AMENITIES || keys.stream().anyMatch(key -> !AMENITY_KEY.matcher(key).matches())) {
                throw new IllegalArgumentException("Invalid amenities");
            }
            suite.setAmenities(keys.isEmpty() ? null : String.join(",", keys));
        }
        if (request.getPhotoUrls() != null) {
            List<String> urls = request.getPhotoUrls().stream()
                    .filter(url -> url != null && !url.isBlank())
                    .map(String::trim)
                    .distinct()
                    .toList();
            if (urls.size() > MAX_PHOTOS) {
                throw new IllegalArgumentException("A suite can have at most " + MAX_PHOTOS + " photos");
            }
            urls.forEach(SuiteService::validatePhotoUrl);
            suite.getPhotoUrls().clear();
            suite.getPhotoUrls().addAll(urls);
        }
    }

    // Images shipped with the frontend ("/suites/patio/01.webp") or https links; nothing else.
    private static void validatePhotoUrl(String url) {
        boolean frontendPath = url.startsWith("/") && !url.startsWith("//");
        if (url.length() > 500 || !(frontendPath || url.startsWith("https://")) || url.chars().anyMatch(Character::isWhitespace)) {
            throw new IllegalArgumentException("Photo links must start with / or https:// (" + url + ")");
        }
    }

    private static String normalizeDescription(String text) {
        String trimmed = text.trim();
        if (trimmed.length() > 4000) {
            throw new IllegalArgumentException("Descriptions can be at most 4000 characters");
        }
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Stored comma-separated amenity keys as a list. */
    public static List<String> amenityList(Suite suite) {
        if (suite.getAmenities() == null || suite.getAmenities().isBlank()) {
            return List.of();
        }
        return Arrays.stream(suite.getAmenities().split(",")).map(String::trim).filter(key -> !key.isEmpty()).toList();
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
                .descriptionEn(suite.getDescriptionEn())
                .descriptionEs(suite.getDescriptionEs())
                .sizeM2(suite.getSizeM2())
                .amenities(amenityList(suite))
                .photoUrls(List.copyOf(suite.getPhotoUrls()))
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
