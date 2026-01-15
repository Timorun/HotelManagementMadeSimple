package com.timorun.hmms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for creating or updating a guest.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GuestRequest {
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String nationalityCode;
    private String notes;
    private Boolean marketingConsent;
}
