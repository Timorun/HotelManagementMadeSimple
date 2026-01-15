package com.timorun.hmms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for returning guest details.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuestResponse {
    private Long guestId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String nationalityCode;
    private String nationalityName;
    private String notes;
    private Boolean marketingConsent;
    private LocalDateTime createdAt;
    private Integer reservationCount; // Number of reservations for this guest
}
