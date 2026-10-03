package com.timorun.hmms.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory sliding-window limit for public (unauthenticated) write endpoints,
 * to keep bots from spamming booking requests or preference emails.
 */
@Component
public class PublicRateLimiter {
    static final int MAX_REQUESTS = 10;
    static final Duration WINDOW = Duration.ofMinutes(10);

    private final Map<String, Deque<Instant>> hits = new ConcurrentHashMap<>();

    public void check(HttpServletRequest request, String action) {
        String key = action + "|" + clientIp(request);
        Instant now = Instant.now();
        Deque<Instant> window = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && window.peekFirst().isBefore(now.minus(WINDOW))) {
                window.pollFirst();
            }
            if (window.size() >= MAX_REQUESTS) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests, please try again later");
            }
            window.addLast(now);
        }
    }

    @Scheduled(fixedDelay = 15 * 60 * 1000)
    void evictIdle() {
        Instant cutoff = Instant.now().minus(WINDOW);
        hits.entrySet().removeIf(entry -> {
            synchronized (entry.getValue()) {
                return entry.getValue().isEmpty() || entry.getValue().peekLast().isBefore(cutoff);
            }
        });
    }

    private static String clientIp(HttpServletRequest request) {
        // Behind a hosting proxy the client address is the first X-Forwarded-For entry
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
