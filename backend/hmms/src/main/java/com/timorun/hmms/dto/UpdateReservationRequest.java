package com.timorun.hmms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for updating an existing reservation.
 * Can update guest link, dates, pricing, channel, and notes.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateReservationRequest {
    private Long suiteId;
    private Long guestId;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer numGuests;
    private BigDecimal priceTotal;
    private String channel;
    private String notes;
}
