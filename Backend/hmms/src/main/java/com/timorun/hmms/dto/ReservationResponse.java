package com.timorun.hmms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for returning reservation details in API responses.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReservationResponse {
    private Long reservationId;
    private Long suiteId;
    private String suiteName;
    private Long guestId;
    private String guestName;
    private String guestDisplayName;
    private Boolean guestAnonymized;
    private String email;
    private String phone;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer numGuests;
    private BigDecimal priceTotal;
    private String channel;
    private String status; // confirmed | checked_in | checked_out | pending | no_show | cancelled
    private String statusLabel; // Human-readable label
    private String statusColor; // Hex color for UI
    private LocalDateTime createdAt;
}
