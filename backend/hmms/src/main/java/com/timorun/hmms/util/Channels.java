package com.timorun.hmms.util;

import java.util.Locale;
import java.util.Set;

/**
 * Booking channels. What matters is whether a booking came direct (no commission) or through
 * an outside platform such as booking.com. Bookings from the own website, by phone or at the
 * door are all direct.
 */
public final class Channels {
    public static final String DIRECT = "direct";
    public static final String BOOKING_COM = "booking.com";
    public static final String OTHER = "other";

    private static final Set<String> DIRECT_ALIASES = Set.of("website", "phone", "walk in", "walk_in", "walk-in", "email");

    private Channels() {
    }

    /** Lowercase channel name; old direct sources become "direct", a missing channel "other". */
    public static String normalize(String channel) {
        if (channel == null || channel.isBlank()) {
            return OTHER;
        }
        String value = channel.trim().toLowerCase(Locale.ROOT);
        return DIRECT_ALIASES.contains(value) ? DIRECT : value;
    }

    public static boolean isDirect(String channel) {
        return DIRECT.equals(normalize(channel));
    }
}
