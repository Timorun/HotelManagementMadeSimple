package com.timorun.hmms.controllers;

import com.timorun.hmms.dto.AuthUserResponse;
import com.timorun.hmms.dto.ErrorResponse;
import com.timorun.hmms.dto.LoginRequest;
import com.timorun.hmms.dto.LoginResponse;
import com.timorun.hmms.security.TokenSession;
import com.timorun.hmms.services.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final String authCookieName;
    private final boolean authCookieSecure;
    private final String authCookieSameSite;

    public AuthController(
            AuthService authService,
            @Value("${hmms.auth.cookie-name:HMMS_AUTH}") String authCookieName,
            @Value("${hmms.auth.cookie-secure:false}") boolean authCookieSecure,
            @Value("${hmms.auth.cookie-same-site:Lax}") String authCookieSameSite
    ) {
        this.authService = authService;
        this.authCookieName = authCookieName;
        this.authCookieSecure = authCookieSecure;
        this.authCookieSameSite = authCookieSameSite;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, buildAuthCookie(response.getToken(), response.getExpiresInSeconds()))
                    .body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest request
    ) {
        String token = extractToken(authorization, request);
        if (token == null) {
            return ResponseEntity.status(401).body(new ErrorResponse("Unauthorized"));
        }

        return authService.validateToken(token)
                .<ResponseEntity<?>>map(session -> ResponseEntity.ok(toResponse(session)))
                .orElseGet(() -> ResponseEntity.status(401).body(new ErrorResponse("Unauthorized")));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletRequest request
    ) {
        String token = extractToken(authorization, request);
        authService.logout(token);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearAuthCookie())
                .build();
    }

    private String extractToken(String authorization, HttpServletRequest request) {
        String fromHeader = extractFromAuthorizationHeader(authorization);
        if (fromHeader != null) {
            return fromHeader;
        }
        return extractFromCookie(request);
    }

    private String extractFromAuthorizationHeader(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        return authorization.substring(7);
    }

    private String extractFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (authCookieName.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private String buildAuthCookie(String token, long maxAgeSeconds) {
        return ResponseCookie.from(authCookieName, token)
                .httpOnly(true)
                .secure(authCookieSecure)
                .sameSite(authCookieSameSite)
                .path("/api")
                .maxAge(maxAgeSeconds)
                .build()
                .toString();
    }

    private String clearAuthCookie() {
        return ResponseCookie.from(authCookieName, "")
                .httpOnly(true)
                .secure(authCookieSecure)
                .sameSite(authCookieSameSite)
                .path("/api")
                .maxAge(0)
                .build()
                .toString();
    }

    private AuthUserResponse toResponse(TokenSession session) {
        return AuthUserResponse.builder()
                .userId(session.userId())
                .username(session.username())
                .email(session.email())
                .build();
    }
}
