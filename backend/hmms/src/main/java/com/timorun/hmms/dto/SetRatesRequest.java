package com.timorun.hmms.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Set (or clear) the nightly price of one or more suites for a range of dates.
 */
@Data
@NoArgsConstructor
public class SetRatesRequest {
    private List<Long> suiteIds;
    private LocalDate from;          // inclusive
    private LocalDate to;            // inclusive
    private List<Integer> weekdays;  // ISO days, 1 = Monday ... 7 = Sunday; empty or null = every day
    private BigDecimal price;        // null clears the prices
}
