package com.timorun.hmms.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Hotel-wide settings from configuration (environment variables in production).
 */
@Getter
@Component
public class HotelSettings {
    private final String hotelName;
    private final String ownerEmail;
    private final String defaultPhoneRegion;
    private final boolean mailEnabled;
    private final String mailFrom;
    private final String publicBaseUrl;

    public HotelSettings(
            @Value("${hmms.hotel.name:Carmen Suites}") String hotelName,
            @Value("${hmms.hotel.owner-email:}") String ownerEmail,
            @Value("${hmms.hotel.default-phone-region:ES}") String defaultPhoneRegion,
            @Value("${hmms.mail.enabled:false}") boolean mailEnabled,
            @Value("${hmms.mail.from:no-reply@localhost}") String mailFrom,
            @Value("${hmms.public.base-url:http://localhost:5173}") String publicBaseUrl) {
        this.hotelName = hotelName;
        this.ownerEmail = ownerEmail;
        this.defaultPhoneRegion = defaultPhoneRegion;
        this.mailEnabled = mailEnabled;
        this.mailFrom = mailFrom;
        this.publicBaseUrl = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
    }

    /** Absolute frontend URL for a path such as "/requests". */
    public String publicUrl(String path) {
        return publicBaseUrl + path;
    }
}
