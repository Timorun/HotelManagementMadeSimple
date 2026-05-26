package com.timorun.hmms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * DTO for advanced analytics report over an arbitrary date range.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsReportResponse {
    private LocalDate fromDate;
    private LocalDate toDate;
    private Integer daysInPeriod;
    private String currency;
    private LocalDate comparisonFromDate;
    private LocalDate comparisonToDate;
    private String comparisonMode;

    private SummaryMetrics summary;
    private SummaryMetrics previousPeriodSummary;
    private DeltaMetrics deltas;

    private List<DailyTrendPoint> dailyTrend;
    private List<ChannelPerformance> channelPerformance;
    private List<StatusBreakdown> reservationStatusBreakdown;
    private List<DayHighlight> topRevenueDays;
    private List<String> insights;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SummaryMetrics {
        private BigDecimal totalRevenue;
        private Double occupancyPercentage;
        private BigDecimal averageDailyRate;
        private BigDecimal revenuePerAvailableNight;

        private Integer occupiedNights;
        private Integer availableNights;

        private Integer reservationsOverlappingPeriod;
        private Integer reservationsStartingInPeriod;
        private Integer cancelledReservations;

        private Double cancellationRate;
        private Double averageLengthOfStay;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DeltaMetrics {
        private Double revenueChangePercentage;
        private Double occupancyChangePercentagePoints;
        private Double averageDailyRateChangePercentage;
        private Double revParChangePercentage;
        private Double cancellationRateChangePercentagePoints;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyTrendPoint {
        private LocalDate date;
        private Integer occupiedNights;
        private Integer availableNights;
        private Double occupancyPercentage;

        private BigDecimal revenue;
        private BigDecimal averageDailyRate;
        private BigDecimal revenuePerAvailableNight;

        private Integer arrivals;
        private Integer departures;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChannelPerformance {
        private String channel;
        private BigDecimal revenue;
        private Integer reservations;
        private Integer occupiedNights;
        private Double revenueSharePercentage;
        private BigDecimal averageBookingValue;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StatusBreakdown {
        private String status;
        private Integer count;
        private Double sharePercentage;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DayHighlight {
        private LocalDate date;
        private BigDecimal revenue;
        private Double occupancyPercentage;
        private String note;
    }
}
