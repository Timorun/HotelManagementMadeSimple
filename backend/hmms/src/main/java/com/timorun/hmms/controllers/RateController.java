package com.timorun.hmms.controllers;

import com.timorun.hmms.dto.PriceQuote;
import com.timorun.hmms.dto.RateResponse;
import com.timorun.hmms.dto.SetRatesRequest;
import com.timorun.hmms.services.RateService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Nightly prices per suite and date (the price calendar).
 */
@RestController
@RequestMapping("/api/rates")
public class RateController {
    private final RateService rateService;

    public RateController(RateService rateService) {
        this.rateService = rateService;
    }

    /** GET /api/rates?from=2026-10-01&to=2026-10-31 */
    @GetMapping
    public List<RateResponse> list(@RequestParam LocalDate from, @RequestParam LocalDate to) {
        return rateService.listRates(from, to);
    }

    /** PUT /api/rates {"suiteIds": [1, 2], "from": "...", "to": "...", "weekdays": [5, 6], "price": 140} */
    @PutMapping
    public Map<String, Integer> set(@RequestBody SetRatesRequest request) {
        return Map.of("nights", rateService.setRates(request));
    }

    /** GET /api/rates/quote?suiteId=1&checkIn=...&checkOut=... */
    @GetMapping("/quote")
    public PriceQuote quote(@RequestParam Long suiteId, @RequestParam LocalDate checkIn, @RequestParam LocalDate checkOut) {
        return rateService.quote(suiteId, checkIn, checkOut);
    }
}
