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
    private String guestNotes;
    private Boolean guestMarketingConsent;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer numGuests;
    private BigDecimal priceTotal;
    private String channel;
    private String notes;
    private String status; // pending | awaiting_payment | confirmed | checked_in | checked_out | no_show | cancelled
    private String statusLabel; // Human-readable label
    private String statusColor; // Hex color for UI
    private LocalDateTime createdAt;
    private String externalRef;    // booking.com reservation number
    private Boolean importedFromCalendar;
    private Boolean syncConflict;
    private LocalDate paymentDueDate; // accepted booking requests: pay by this date
    private LocalDateTime paidAt;
    private Boolean paymentOverdue;   // awaiting payment and the due date has passed
}
