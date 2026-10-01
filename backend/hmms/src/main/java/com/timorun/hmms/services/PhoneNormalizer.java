package com.timorun.hmms.services;

import com.timorun.hmms.util.PhoneNumbers;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Normalizes guest phone numbers to E.164 before they are saved.
 */
@Component
public class PhoneNormalizer {
    private final String defaultRegion;

    public PhoneNormalizer(@Value("${hmms.hotel.default-phone-region:ES}") String defaultRegion) {
        this.defaultRegion = defaultRegion;
    }

    /**
     * @return the number in E.164, or null when the input is blank
     * @throws IllegalArgumentException when the number can't be parsed as a valid phone number
     */
    public String normalize(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        return PhoneNumbers.toE164(phone, defaultRegion)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid phone number: " + phone.trim() + ". Include the country code, e.g. +34 612 345 678"));
    }
}
