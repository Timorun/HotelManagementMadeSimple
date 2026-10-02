package com.timorun.hmms.services;

import com.timorun.hmms.IntegrationTest;
import com.timorun.hmms.dto.PublicSuiteAvailability;
import com.timorun.hmms.dto.SuiteRequest;
import com.timorun.hmms.dto.SuiteResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SuiteServiceTest extends IntegrationTest {

    @Autowired
    private SuiteService suiteService;

    @Autowired
    private BookingRequestService bookingRequestService;

    private SuiteRequest basics(String name, int capacity) {
        SuiteRequest request = new SuiteRequest();
        request.setSuiteName(name);
        request.setCapacity(capacity);
        request.setActive(true);
        return request;
    }

    @Test
    void seededSuitesHaveTheWebsiteContent() {
        // Filled by V3__suite_content.sql from carmensuites.com
        List<String> websiteSuites = List.of("Suite 0ºA", "Suite 1ºA", "Suite 1ºB", "Suite 2ºA", "Suite 2ºB");
        List<SuiteResponse> suites = suiteService.getAllSuites().stream()
                .filter(suite -> websiteSuites.contains(suite.getSuiteName()))
                .toList();

        assertThat(suites).extracting(SuiteResponse::getSuiteName).containsExactlyInAnyOrderElementsOf(websiteSuites);
        assertThat(suites).allSatisfy(suite -> {
            assertThat(suite.getDescriptionEn()).isNotBlank();
            assertThat(suite.getDescriptionEs()).isNotBlank();
            assertThat(suite.getSizeM2()).isIn(45, 48);
            assertThat(suite.getAmenities()).contains("wifi", "elevator", "air_conditioning", "kitchen", "no_pets");
            assertThat(suite.getPhotoUrls()).hasSizeBetween(17, 28).allMatch(url -> url.matches("/suites/\\d+\\.webp"));
        });
        SuiteResponse patioSuite = suites.stream().filter(suite -> suite.getSuiteName().equals("Suite 0ºA")).findFirst().orElseThrow();
        assertThat(patioSuite.getAmenities()).contains("patio", "accessible", "twin_beds", "extra_bed");
        assertThat(patioSuite.getPhotoUrls()).first().isEqualTo("/suites/57.webp");
    }

    @Test
    void detailsAreSavedAndKeptWhenOnlyBasicsAreUpdated() {
        SuiteRequest request = basics("Patio", 3);
        request.setDescriptionEn("  Bright suite with a private patio.  ");
        request.setDescriptionEs("Suite luminosa con patio privado.");
        request.setSizeM2(45);
        request.setAmenities(List.of("double_bed", "WIFI", "wifi", " kitchen "));
        request.setPhotoUrls(List.of("/suites/patio/01.webp", "https://example.com/patio-2.jpg"));

        SuiteResponse saved = suiteService.updateSuite(1L, request);
        assertThat(saved.getDescriptionEn()).isEqualTo("Bright suite with a private patio.");
        assertThat(saved.getSizeM2()).isEqualTo(45);
        assertThat(saved.getAmenities()).containsExactly("double_bed", "wifi", "kitchen");
        assertThat(saved.getPhotoUrls()).containsExactly("/suites/patio/01.webp", "https://example.com/patio-2.jpg");

        // Saving only name/capacity (Settings row, calendar sync) keeps the details
        SuiteResponse renamed = suiteService.updateSuite(1L, basics("Patio Suite", 3));
        assertThat(renamed.getSuiteName()).isEqualTo("Patio Suite");
        assertThat(renamed.getDescriptionEs()).isEqualTo("Suite luminosa con patio privado.");
        assertThat(renamed.getPhotoUrls()).hasSize(2);

        // Reorder and remove photos, clear the size
        SuiteRequest reorder = basics("Patio Suite", 3);
        reorder.setPhotoUrls(List.of("https://example.com/patio-2.jpg"));
        reorder.setSizeM2(0);
        SuiteResponse reordered = suiteService.updateSuite(1L, reorder);
        assertThat(reordered.getPhotoUrls()).containsExactly("https://example.com/patio-2.jpg");
        assertThat(reordered.getSizeM2()).isNull();
    }

    @Test
    void rejectsUnsafePhotoLinksAndInvalidAmenities() {
        for (String url : List.of("javascript:alert(1)", "//evil.example/x.jpg", "http://plain.example/x.jpg", "/suites/a b.webp")) {
            SuiteRequest request = basics("Patio", 3);
            request.setPhotoUrls(List.of(url));
            assertThatThrownBy(() -> suiteService.updateSuite(1L, request))
                    .as(url)
                    .isInstanceOf(IllegalArgumentException.class);
        }

        SuiteRequest amenities = basics("Patio", 3);
        amenities.setAmenities(List.of("Sea view!"));
        assertThatThrownBy(() -> suiteService.updateSuite(1L, amenities)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void publicAvailabilityIncludesDetailsAndPhotos() {
        SuiteRequest request = basics("Suite 1ºA", 2);
        request.setDescriptionEn("Cosy suite on the first floor.");
        request.setAmenities(List.of("double_bed", "air_conditioning"));
        request.setPhotoUrls(List.of("/suites/1a/01.webp", "/suites/1a/02.webp"));
        suiteService.updateSuite(2L, request);

        LocalDate checkIn = LocalDate.now().plusMonths(5);
        PublicSuiteAvailability suite = bookingRequestService.findAvailableSuites(checkIn, checkIn.plusDays(2), 2).stream()
                .filter(available -> available.suiteId().equals(2L))
                .findFirst()
                .orElseThrow();

        assertThat(suite.descriptionEn()).isEqualTo("Cosy suite on the first floor.");
        assertThat(suite.amenities()).containsExactly("double_bed", "air_conditioning");
        assertThat(suite.photoUrls()).containsExactly("/suites/1a/01.webp", "/suites/1a/02.webp");
    }
}
