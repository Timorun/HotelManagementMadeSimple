package com.timorun.hmms.security;

import java.time.Instant;

public record TokenSession(
        Long userId,
        String username,
        String email,
        Instant expiresAt
) {
    public boolean isExpired() {
        return !expiresAt.isAfter(Instant.now());
    }
}
