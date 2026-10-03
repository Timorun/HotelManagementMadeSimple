package com.timorun.hmms.ical;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class IcalCalendarTest {

    // Shape of a booking.com export, including a folded line and a DATE-TIME value
    private static final String BOOKING_FEED = String.join("\r\n",
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Booking.com//NONSGML//EN",
            "BEGIN:VEVENT",
            "UID:a1b2c3@booking.com",
            "DTSTART;VALUE=DATE:20261110",
            "DTEND;VALUE=DATE:20261113",
            "SUMMARY:CLOSED - Not",
            "  available",
            "END:VEVENT",
            "BEGIN:VEVENT",
            "UID:d4e5f6@booking.com",
            "DTSTART:20261201T140000Z",
            "DTEND:20261204T100000Z",
            "END:VEVENT",
            "BEGIN:VEVENT",
            "SUMMARY:no uid, ignored",
            "DTSTART;VALUE=DATE:20261201",
            "END:VEVENT",
            "END:VCALENDAR");

    @Test
    void parsesAllDayAndDateTimeEvents() {
        List<IcalEvent> events = IcalCalendar.parse(BOOKING_FEED);

        assertThat(events).containsExactly(
                new IcalEvent("a1b2c3@booking.com", LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 13), "CLOSED - Not available"),
                new IcalEvent("d4e5f6@booking.com", LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 4), ""));
    }

    @Test
    void writtenFeedParsesBack() {
        List<IcalEvent> events = List.of(new IcalEvent("hmms-1@x", LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 8), "Reserved"));
        String ics = IcalCalendar.write("Suite 1ºA, first floor", events, Instant.parse("2026-10-01T00:00:00Z"));

        assertThat(ics).contains("DTSTART;VALUE=DATE:20261005\r\n").contains("X-WR-CALNAME:Suite 1ºA\\, first floor");
        assertThat(IcalCalendar.parse(ics)).containsExactlyElementsOf(events);
    }
}
