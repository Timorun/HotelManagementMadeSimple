package com.timorun.hmms.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Owner's decision on a booking request: accept (price and payment deadline), mark as paid,
 * extend the payment deadline, or reject/cancel.
 */
@Data
@NoArgsConstructor
public class BookingRequestDecision {
    private BigDecimal priceTotal;     // accept: defaults to the price the guest was quoted
    private LocalDate paymentDueDate;  // accept (optional) and extend deadline (required)
    private String message;            // optional note included in the email to the guest
    private Boolean notifyGuest = true;
}
