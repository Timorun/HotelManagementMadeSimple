package com.timorun.hmms.ical;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Minimal iCalendar (RFC 5545) reading and writing for availability feeds.
 * Only all-day VEVENTs (UID, DTSTART, DTEND, SUMMARY) matter for booking.com/Airbnb
 * calendar sync, so this avoids a full iCal library.
 */
public final class IcalCalendar {
    private static final DateTimeFormatter BASIC_DATE = DateTimeFormatter.BASIC_ISO_DATE;
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);

    private IcalCalendar() {
    }

    /**
     * Parses all VEVENTs with a UID and a start date. Events without DTEND last one day.
     */
    public static List<IcalEvent> parse(String ics) {
        List<IcalEvent> events = new ArrayList<>();
        Map<String, String> current = null;

        for (String line : unfold(ics)) {
            if (line.equalsIgnoreCase("BEGIN:VEVENT")) {
                current = new HashMap<>();
            } else if (line.equalsIgnoreCase("END:VEVENT")) {
                if (current != null) {
                    toEvent(current).ifPresent(events::add);
                }
                current = null;
            } else if (current != null) {
                int colon = line.indexOf(':');
                if (colon > 0) {
                    // "DTSTART;VALUE=DATE:20261010" -> name "DTSTART"
                    String name = line.substring(0, colon).split(";", 2)[0].toUpperCase();
                    current.putIfAbsent(name, line.substring(colon + 1).trim());
                }
            }
        }
        return events;
    }

    private static java.util.Optional<IcalEvent> toEvent(Map<String, String> properties) {
        String uid = properties.get("UID");
        LocalDate start = parseDate(properties.get("DTSTART"));
        if (uid == null || uid.isBlank() || start == null) {
            return java.util.Optional.empty();
        }
        LocalDate end = parseDate(properties.get("DTEND"));
        if (end == null || !end.isAfter(start)) {
            end = start.plusDays(1);
        }
        return java.util.Optional.of(new IcalEvent(uid.trim(), start, end, unescape(properties.getOrDefault("SUMMARY", ""))));
    }

    // Accepts DATE (20261010) and DATE-TIME (20261010T140000Z) values; only the date is used.
    private static LocalDate parseDate(String value) {
        if (value == null || value.length() < 8) {
            return null;
        }
        try {
            return LocalDate.parse(value.substring(0, 8), BASIC_DATE);
        } catch (RuntimeException e) {
            return null;
        }
    }

    // RFC 5545 line folding: a line starting with a space or tab continues the previous one.
    private static List<String> unfold(String ics) {
        List<String> lines = new ArrayList<>();
        if (ics == null) {
            return lines;
        }
        for (String raw : ics.split("\r?\n")) {
            if (!lines.isEmpty() && (raw.startsWith(" ") || raw.startsWith("\t"))) {
                lines.set(lines.size() - 1, lines.get(lines.size() - 1) + raw.substring(1));
            } else if (!raw.isBlank()) {
                lines.add(raw.trim());
            }
        }
        return lines;
    }

    private static String unescape(String text) {
        return text.replace("\\n", "\n").replace("\\N", "\n").replace("\\,", ",").replace("\\;", ";").replace("\\\\", "\\");
    }

    private static String escape(String text) {
        return text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n");
    }

    /**
     * Writes an availability feed with one all-day event per blocked stay.
     */
    public static String write(String calendarName, List<IcalEvent> events, Instant now) {
        StringBuilder out = new StringBuilder();
        line(out, "BEGIN:VCALENDAR");
        line(out, "VERSION:2.0");
        line(out, "PRODID:-//HotelManagementMadeSimple//Availability//EN");
        line(out, "CALSCALE:GREGORIAN");
        line(out, "METHOD:PUBLISH");
        line(out, "X-WR-CALNAME:" + escape(calendarName));
        for (IcalEvent event : events) {
            line(out, "BEGIN:VEVENT");
            line(out, "UID:" + event.uid());
            line(out, "DTSTAMP:" + STAMP.format(now));
            line(out, "DTSTART;VALUE=DATE:" + BASIC_DATE.format(event.start()));
            line(out, "DTEND;VALUE=DATE:" + BASIC_DATE.format(event.end()));
            line(out, "SUMMARY:" + escape(event.summary()));
            line(out, "END:VEVENT");
        }
        line(out, "END:VCALENDAR");
        return out.toString();
    }

    private static void line(StringBuilder out, String text) {
        out.append(text).append("\r\n");
    }
}
