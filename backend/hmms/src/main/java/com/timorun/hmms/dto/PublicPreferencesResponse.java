package com.timorun.hmms.dto;

/**
 * What a guest sees on their preferences page. Deliberately minimal: no contact details.
 */
public record PublicPreferencesResponse(
        String firstName,
        boolean marketingConsent,
        boolean deletionRequested,
        String hotelName) {
}
