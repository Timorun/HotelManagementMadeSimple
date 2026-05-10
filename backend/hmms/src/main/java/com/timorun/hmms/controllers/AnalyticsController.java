package com.timorun.hmms.controllers;

import com.timorun.hmms.dto.MonthlyAnalyticsResponse;
import com.timorun.hmms.services.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    /**
     * Get monthly analytics for current month.
     * GET /api/analytics/monthly
     */
    @GetMapping("/monthly")
    public ResponseEntity<MonthlyAnalyticsResponse> getCurrentMonthAnalytics() {
        YearMonth currentMonth = YearMonth.now();
        MonthlyAnalyticsResponse analytics = analyticsService.getMonthlyAnalytics(currentMonth);
        return ResponseEntity.ok(analytics);
    }

    /**
     * Get monthly analytics for a specific month.
     * GET /api/analytics/monthly?month=2026-01
     */
    @GetMapping("/monthly/{month}")
    public ResponseEntity<MonthlyAnalyticsResponse> getMonthlyAnalytics(@PathVariable String month) {
        try {
            YearMonth yearMonth = YearMonth.parse(month);
            MonthlyAnalyticsResponse analytics = analyticsService.getMonthlyAnalytics(yearMonth);
            return ResponseEntity.ok(analytics);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
