package com.timorun.hmms.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Commission % of a platform for bookings made from validFrom on. The first rate of a platform
 * has validFrom 2000-01-01: it applies to every booking before a later rate.
 */
public record CommissionRateDto(String channel, LocalDate validFrom, BigDecimal rate) {
}
