package com.timorun.hmms.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Owner's decision on a pending booking request.
 */
@Data
@NoArgsConstructor
public class ConfirmBookingRequest {
    private BigDecimal priceTotal; // confirm only
    private String message;        // optional note included in the email to the guest
    private Boolean notifyGuest = true;
}
