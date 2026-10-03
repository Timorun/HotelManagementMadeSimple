package com.timorun.hmms.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * What is booked from today on: the next 30 and 90 days, and every suite's nights for the next
 * two weeks, with the price of the nights that are still empty.
 */
public record AnalyticsOutlook(LocalDate today, Window next30, Window next90, List<LocalDate> days, List<SuiteNights> suites) {

    /** Booked = confirmed or checked in; awaiting payment is counted separately. Revenue of booked nights only. */
    public record Window(int days, int nightsAvailable, int nightsBooked, int nightsAwaitingPayment, BigDecimal revenue) {
    }

    public record SuiteNights(Long suiteId, String suiteName, List<Night> nights) {
    }

    /** state: "direct", "platform", "awaiting_payment", "pending" or "empty"; price only for empty nights. */
    public record Night(LocalDate date, String state, BigDecimal price) {
    }
}
