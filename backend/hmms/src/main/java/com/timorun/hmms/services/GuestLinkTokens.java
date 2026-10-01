package com.timorun.hmms.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.Optional;

/**
 * Signed, expiring tokens for guest-facing links (communication preferences), so guests
 * can manage their data without an account. Format: base64url("guestId:expiresEpochSeconds").signature
 */
@Component
public class GuestLinkTokens {
    // Links mailed on request from the public preferences page
    public static final Duration MAGIC_LINK_VALIDITY = Duration.ofDays(7);
    // Links embedded in booking emails and WhatsApp messages
    public static final Duration EMBEDDED_LINK_VALIDITY = Duration.ofDays(90);

    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final byte[] secret;
    private final Clock clock;

    @Autowired
    public GuestLinkTokens(@Value("${hmms.public.token-secret:dev-only-secret-change-me}") String secret) {
        this(secret, Clock.systemUTC());
    }

    GuestLinkTokens(String secret, Clock clock) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.clock = clock;
    }

    public String create(Long guestId, Duration validity) {
        long expires = clock.instant().plus(validity).getEpochSecond();
        String payload = ENCODER.encodeToString((guestId + ":" + expires).getBytes(StandardCharsets.UTF_8));
        return payload + "." + sign(payload);
    }

    /** @return the guest id when the token is authentic and not expired */
    public Optional<Long> verify(String token) {
        if (token == null) {
            return Optional.empty();
        }
        int dot = token.indexOf('.');
        if (dot <= 0) {
            return Optional.empty();
        }
        String payload = token.substring(0, dot);
        String signature = token.substring(dot + 1);
        if (!MessageDigest.isEqual(sign(payload).getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8))) {
            return Optional.empty();
        }
        try {
            String[] parts = new String(DECODER.decode(payload), StandardCharsets.UTF_8).split(":");
            long guestId = Long.parseLong(parts[0]);
            long expires = Long.parseLong(parts[1]);
            if (clock.instant().getEpochSecond() > expires) {
                return Optional.empty();
            }
            return Optional.of(guestId);
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return ENCODER.encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to sign token", e);
        }
    }
}
