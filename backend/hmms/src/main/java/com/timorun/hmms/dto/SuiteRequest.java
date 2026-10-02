package com.timorun.hmms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for creating or updating a suite.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SuiteRequest {
    private String suiteName;
    private Integer capacity;
    private Boolean active;
    private String bookingIcalUrl; // null keeps the current value on update; "" clears it

    // Booking page details. For all of these, null keeps the current value on update.
    private String descriptionEn;     // "" clears it
    private String descriptionEs;     // "" clears it
    private Integer sizeM2;           // 0 clears it
    private List<String> amenities;   // amenity keys, e.g. ["double_bed", "wifi"]; [] clears them
    private List<String> photoUrls;   // in display order; [] removes all photos
}
