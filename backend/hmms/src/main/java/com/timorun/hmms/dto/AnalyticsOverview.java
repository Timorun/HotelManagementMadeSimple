package com.timorun.hmms.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Analytics for a period, compared with the same dates a year earlier: totals, direct bookings vs
 * platforms, occupancy per weekday, and month by month for the year the period ends in.
 * Only confirmed, checked-in and checked-out stays count; revenue and commission are spread
 * evenly over the nights of a stay.
 */
public record AnalyticsOverview(
        LocalDate from,
        LocalDate to,
        LocalDate compareFrom,
        LocalDate compareTo,
        int suites,
        Totals current,
        Totals previous,
        List<ChannelRow> channels,
        List<WeekdayRow> weekdays,
        int year,
        List<MonthRow> months) {

    /** Revenue is what guests paid; commission what the platforms keep of it. */
    public record Totals(
            BigDecimal revenue,
            BigDecimal commission,
            BigDecimal revenueAfterCommission,
            int nightsSold,
            int nightsAvailable,
            double occupancy,
            BigDecimal averageNightlyRate,
            int bookings,
            int directNights,
            BigDecimal directRevenue,
            int platformNights,
            BigDecimal platformRevenue) {
    }

    public record ChannelRow(
            String channel,
            boolean platform,
            int bookings,
            int nights,
            BigDecimal revenue,
            BigDecimal commission,
            int previousNights,
            BigDecimal previousRevenue) {
    }

    /** ISO weekday of the night: 1 = Monday ... 7 = Sunday. */
    public record WeekdayRow(int weekday, int nightsSold, int directNights, int nightsAvailable,
                             int previousNightsSold, int previousNightsAvailable) {
    }

    /** "2026-03"; future months hold what is booked so far. */
    public record MonthRow(
            String month,
            int nightsSold,
            int nightsAvailable,
            BigDecimal revenue,
            int directNights,
            BigDecimal directRevenue,
            int previousNightsSold,
            int previousNightsAvailable,
            BigDecimal previousRevenue) {
    }
}
