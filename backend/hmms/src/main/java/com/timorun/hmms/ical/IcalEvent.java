package com.timorun.hmms.ical;

import java.time.LocalDate;

/**
 * An all-day calendar event: a blocked stay from checkIn (inclusive) to checkOut (exclusive),
 * which is exactly how booking.com and Airbnb export reservations.
 */
public record IcalEvent(String uid, LocalDate start, LocalDate end, String summary) {
}
