package com.timorun.hmms.controllers;

import com.timorun.hmms.config.HotelSettings;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Read-only view of the hotel configuration for the settings page.
 */
@RestController
@RequestMapping("/api/settings")
public class SettingsController {
    private final HotelSettings settings;

    public SettingsController(HotelSettings settings) {
        this.settings = settings;
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
}
