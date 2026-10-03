package com.timorun.hmms.controllers;

import com.timorun.hmms.config.HotelSettings;
import com.timorun.hmms.dto.PaymentSettings;
import com.timorun.hmms.services.PaymentSettingsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Settings page: read-only hotel configuration (from environment variables) and the payment
 * details the owner edits in the app.
 */
@RestController
@RequestMapping("/api/settings")
public class SettingsController {
    private final HotelSettings settings;
    private final PaymentSettingsService paymentSettingsService;

    public SettingsController(HotelSettings settings, PaymentSettingsService paymentSettingsService) {
        this.settings = settings;
        this.paymentSettingsService = paymentSettingsService;
    }

    @GetMapping
    public Map<String, Object> get() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("hotelName", settings.getHotelName());
        body.put("ownerEmail", settings.getOwnerEmail());
        body.put("mailEnabled", settings.isMailEnabled());
        body.put("mailFrom", settings.getMailFrom());
        body.put("defaultPhoneRegion", settings.getDefaultPhoneRegion());
        body.put("publicBaseUrl", settings.getPublicBaseUrl());
        body.put("bookingPageUrl", settings.publicUrl("/book"));
        body.put("preferencesPageUrl", settings.publicUrl("/preferences"));
        return body;
    }

    /** GET /api/settings/payment */
    @GetMapping("/payment")
    public PaymentSettings getPayment() {
        return paymentSettingsService.get();
    }

    /** PUT /api/settings/payment {"iban": "...", "accountHolder": "...", "bizumPhone": "...", "deadlineDays": 3} */
    @PutMapping("/payment")
    public PaymentSettings updatePayment(@RequestBody PaymentSettings request) {
        return paymentSettingsService.update(request);
    }
}
