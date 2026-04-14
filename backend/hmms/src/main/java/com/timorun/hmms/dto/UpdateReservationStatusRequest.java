package com.timorun.hmms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for updating reservation status.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateReservationStatusRequest {
    private String status; // New status value (e.g., "checked_in", "checked_out", "cancelled")
}
