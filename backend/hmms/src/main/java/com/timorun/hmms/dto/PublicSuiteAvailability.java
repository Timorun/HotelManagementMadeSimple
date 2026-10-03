package com.timorun.hmms.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * A suite that can be requested for the searched dates, with what the booking page shows about it.
 */
public record PublicSuiteAvailability(
        Long suiteId,
        String suiteName,
        Integer capacity,
        Integer sizeM2,
        String descriptionEn,
        String descriptionEs,
        List<String> amenities,
        List<String> photoUrls,
        BigDecimal priceTotal,  // the whole stay; null when a night has no price yet ("price on request")
        int nights) {
}
