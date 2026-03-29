package com.timorun.hmms.services;

import com.timorun.hmms.dto.LoginRequest;
import com.timorun.hmms.dto.LoginResponse;
import com.timorun.hmms.entities.AppUser;
import com.timorun.hmms.repositories.AppUserRepository;
import com.timorun.hmms.security.TokenSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, TokenSession> sessions = new ConcurrentHashMap<>();
    private final long tokenTtlSeconds;

    public AuthService(
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder,
            @Value("${hmms.auth.token-ttl-seconds:43200}") long tokenTtlSeconds
    ) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenTtlSeconds = tokenTtlSeconds;
    }

    public LoginResponse login(LoginRequest request) {
        if (request == null || isBlank(request.getUsernameOrEmail()) || isBlank(request.getPassword())) {
            throw new IllegalArgumentException("Username/email and password are required");
        }

        String identity = request.getUsernameOrEmail().trim();
        Optional<AppUser> userByUsername = appUserRepository.findByUsername(identity);
        Optional<AppUser> userByEmail = appUserRepository.findByEmail(identity);

        AppUser user = userByUsername.or(() -> userByEmail)
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        String stored = user.getPasswordHash();
        boolean valid = passwordEncoder.matches(request.getPassword(), stored)
                || request.getPassword().equals(stored);

        if (!valid) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        String token = generateToken();
        TokenSession session = new TokenSession(
                user.getUserId(),
                user.getUsername(),
                user.getEmail(),
                Instant.now().plusSeconds(tokenTtlSeconds)
        );
        sessions.put(token, session);

        return LoginResponse.builder()
                .token(token)
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .expiresInSeconds(tokenTtlSeconds)
                .build();
    }

    public void logout(String token) {
        if (token != null) {
            sessions.remove(token);
        }
    }

    public Optional<TokenSession> validateToken(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        TokenSession session = sessions.get(token);
        if (session == null) {
            return Optional.empty();
        }
        if (session.isExpired()) {
            sessions.remove(token);
            return Optional.empty();
        }
        return Optional.of(session);
    }

    private String generateToken() {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
