package com.timorun.hmms.controllers;

import com.timorun.hmms.dto.AuthUserResponse;
import com.timorun.hmms.dto.ErrorResponse;
import com.timorun.hmms.dto.LoginRequest;
import com.timorun.hmms.dto.LoginResponse;
import com.timorun.hmms.security.TokenSession;
import com.timorun.hmms.services.AuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String token = extractToken(authorization);
        if (token == null) {
            return ResponseEntity.status(401).body(new ErrorResponse("Unauthorized"));
        }

        return authService.validateToken(token)
                .<ResponseEntity<?>>map(session -> ResponseEntity.ok(toResponse(session)))
                .orElseGet(() -> ResponseEntity.status(401).body(new ErrorResponse("Unauthorized")));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        String token = extractToken(authorization);
        authService.logout(token);
        return ResponseEntity.noContent().build();
    }

    private String extractToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        return authorization.substring(7);
    }

    private AuthUserResponse toResponse(TokenSession session) {
        return AuthUserResponse.builder()
                .userId(session.userId())
                .username(session.username())
                .email(session.email())
                .build();
    }
}
