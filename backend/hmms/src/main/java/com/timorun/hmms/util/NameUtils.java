package com.timorun.hmms.util;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Helpers for guest names, which often contain two last names ("García López")
 * and accents that people don't always type when searching.
 */
public final class NameUtils {
    private NameUtils() {
    }

    /** Trims and collapses internal whitespace. Returns null for null/blank input. */
    public static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String collapsed = value.trim().replaceAll("\\s+", " ");
        return collapsed.isEmpty() ? null : collapsed;
    }

    /** Lowercases and strips accents so "José" and "jose" compare equal. */
    public static String fold(String value) {
        if (value == null) {
            return "";
        }
        String decomposed = Normalizer.normalize(value, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }

    /** Splits a search query into folded tokens. */
    public static List<String> searchTokens(String query) {
        String normalized = normalize(query);
        if (normalized == null) {
            return List.of();
        }
        return Arrays.stream(fold(normalized).split(" ")).toList();
    }

    /**
     * Splits a full name into first name and last name(s): the first word is the first name,
     * the rest the last names ("María García López" -> "María", "García López").
     * A single word gets "-" as last name, since a last name is required.
     */
    public static String[] splitFullName(String fullName) {
        String normalized = normalize(fullName);
        if (normalized == null) {
            return new String[]{null, null};
        }
        int space = normalized.indexOf(' ');
        if (space < 0) {
            return new String[]{normalized, "-"};
        }
        return new String[]{normalized.substring(0, space), normalized.substring(space + 1)};
    }

    /** Trims an email and returns null when blank. */
    public static String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return email.trim();
    }
}
