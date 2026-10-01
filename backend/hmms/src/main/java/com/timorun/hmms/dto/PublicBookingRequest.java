package com.timorun.hmms.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Booking request submitted from the public booking page.
 */
@Data
@NoArgsConstructor
public class PublicBookingRequest {
    private Long suiteId;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer numGuests;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String nationalityCode;
    private String notes;
    private String language; // "en" | "es"
    private Boolean marketingConsent;
    private Boolean privacyAccepted;
    // Honeypot: hidden in the form, so only bots fill it in
    private String website;
}
