package com.timorun.hmms.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Returned to the guest after submitting a booking request.
 */
public record PublicBookingResponse(Long reference, String suiteName, LocalDate checkIn, LocalDate checkOut, String status,
                                    BigDecimal priceTotal) {
}
