package com.timorun.hmms.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Rows from a booking.com reservations export (parsed in the browser), to match
 * against existing reservations or create new ones.
 */
@Data
@NoArgsConstructor
public class BookingImportRequest {
    private boolean dryRun = true;
    private List<Row> rows = List.of();

    @Data
    @NoArgsConstructor
    public static class Row {
        private String bookingNumber;
        private String guestName;
        private String bookerName;
        private String phone;
        private String country;     // ISO code, e.g. "es"
        private LocalDate checkIn;
        private LocalDate checkOut;
        private Integer people;
        private BigDecimal price;
        private String status;      // "ok", "cancelled_by_guest", "no_show", ...
        private Long suiteId;       // chosen by the user from the export's unit type
        private String remarks;
    }
}
