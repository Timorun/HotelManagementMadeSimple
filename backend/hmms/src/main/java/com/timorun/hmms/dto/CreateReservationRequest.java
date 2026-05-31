package com.timorun.hmms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for creating a new reservation.
 * Can either link to existing guest or create new one.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateReservationRequest {
    private Long suiteId;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer numGuests;
    private BigDecimal priceTotal;
    private String channel; // e.g., "direct", "booking.com", "airbnb"
    
    // Guest details - either guestId OR guest info to create new
    private Long guestId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String nationalityCode;
    // Reservation notes for this stay.
    private String notes;
}
