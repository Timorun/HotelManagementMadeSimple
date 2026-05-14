package com.timorun.hmms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

/**
 * DTO for analytics report over an arbitrary date range.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsReportResponse {
    private LocalDate fromDate;
    private LocalDate toDate;

    private BigDecimal totalRevenue;
    private Double occupancyPercentage;
    private BigDecimal averageDailyRate;
    private BigDecimal revenuePerAvailableNight;

    private Integer totalReservations;
    private Integer totalNights;
    private Integer availableNights;

    private Double averageLengthOfStay;
    private Double cancellationRate;
    private Integer cancelledReservations;
    private Integer reservationsStartingInPeriod;

    private Map<String, BigDecimal> revenueByChannel;
}
