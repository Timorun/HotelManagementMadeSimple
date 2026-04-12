package com.timorun.hmms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.YearMonth;

/**
 * DTO for monthly analytics dashboard.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyAnalyticsResponse {
    private YearMonth month;
    
    // Current month stats
    private BigDecimal totalRevenue;
    private Double occupancyPercentage;
    private BigDecimal averagePricePerNight;
    private Integer totalReservations;
    private Integer totalNights;
    
    // Previous month stats (for comparison)
    private BigDecimal previousMonthRevenue;
    private Double previousMonthOccupancy;
    private BigDecimal previousMonthAvgPrice;
    
    // Comparisons (percentage change)
    private Double revenueChange; // % change from previous month
    private Double occupancyChange; // percentage points change
    private Double avgPriceChange; // % change from previous month
}
