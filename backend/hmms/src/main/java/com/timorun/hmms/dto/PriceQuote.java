package com.timorun.hmms.dto;

import java.math.BigDecimal;

/**
 * Price of a stay: the sum of its nights. total is null when a night has no price yet
 * ("price on request").
 */
public record PriceQuote(BigDecimal total, int nights) {
}
