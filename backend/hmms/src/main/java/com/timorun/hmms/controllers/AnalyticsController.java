package com.timorun.hmms.controllers;

import com.timorun.hmms.dto.AnalyticsOutlook;
import com.timorun.hmms.dto.AnalyticsOverview;
import com.timorun.hmms.services.AnalyticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Analytics page: a period compared with the same dates last year, and what is booked from today on.
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    /** GET /api/analytics/overview?from=2026-01-01&to=2026-12-31 */
    @GetMapping("/overview")
    public AnalyticsOverview overview(@RequestParam LocalDate from, @RequestParam LocalDate to) {
        return analyticsService.overview(from, to);
    }

    /** GET /api/analytics/outlook */
    @GetMapping("/outlook")
    public AnalyticsOutlook outlook() {
        return analyticsService.outlook();
    }
}
