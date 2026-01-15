package com.timorun.hmms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO for room cleaning operations.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomCleaningResponse {
    private Long suiteId;
    private String suiteName;
    private Long reservationId;
    private String guestName;
    private LocalDate checkOut;
    private String status; // "checkout_today", "needs_turnover", "occupied_tonight"
    private LocalDate nextCheckIn; // If there's an arrival later today
}
