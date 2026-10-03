package com.timorun.hmms.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Price of one night in a suite on a date. */
public record RateResponse(Long suiteId, LocalDate date, BigDecimal price) {
}
