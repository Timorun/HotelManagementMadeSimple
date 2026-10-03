package com.timorun.hmms.util;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;

import java.util.Optional;

/**
 * Phone number normalization to E.164 ("+34612345678"), the format WhatsApp
 * (wa.me links, without the "+") and most messaging tools expect.
 */
public final class PhoneNumbers {
    private static final PhoneNumberUtil UTIL = PhoneNumberUtil.getInstance();

    private PhoneNumbers() {
    }

    /**
     * Parses a phone number typed in any common format ("06 12 34 56 78", "+31 6-1234 5678",
     * "0034 612 345 678") and returns it in E.164, or empty if it isn't a valid number.
     *
     * @param defaultRegion region used when the number has no country code, e.g. "ES"
     */
    public static Optional<String> toE164(String input, String defaultRegion) {
        if (input == null || input.isBlank()) {
            return Optional.empty();
        }

        String cleaned = input.trim();
        // "0034..." style international prefix
        if (cleaned.startsWith("00")) {
            cleaned = "+" + cleaned.substring(2);
        }

        try {
            Phonenumber.PhoneNumber parsed = UTIL.parse(cleaned, defaultRegion);
            if (!UTIL.isValidNumber(parsed)) {
                return Optional.empty();
            }
            return Optional.of(UTIL.format(parsed, PhoneNumberUtil.PhoneNumberFormat.E164));
        } catch (NumberParseException e) {
            return Optional.empty();
        }
    }
}
