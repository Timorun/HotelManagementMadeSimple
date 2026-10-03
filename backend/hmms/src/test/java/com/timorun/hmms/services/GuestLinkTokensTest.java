package com.timorun.hmms.services;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class GuestLinkTokensTest {
    private final Instant now = Instant.parse("2026-10-01T10:00:00Z");

    @Test
    void roundTripsAndRejectsTamperingAndExpiry() {
        GuestLinkTokens tokens = new GuestLinkTokens("secret", Clock.fixed(now, ZoneOffset.UTC));
        String token = tokens.create(42L, Duration.ofDays(7));

        assertThat(tokens.verify(token)).contains(42L);
        assertThat(new GuestLinkTokens("other-secret", Clock.fixed(now, ZoneOffset.UTC)).verify(token)).isEmpty();
        assertThat(tokens.verify(token.replaceFirst("^.", "A"))).isEmpty();
        assertThat(tokens.verify("garbage")).isEmpty();

        GuestLinkTokens later = new GuestLinkTokens("secret", Clock.fixed(now.plus(Duration.ofDays(8)), ZoneOffset.UTC));
        assertThat(later.verify(token)).isEmpty();
    }
}
