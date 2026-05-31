package com.timorun.hmms.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    private String token;
    private String username;
    private String email;
    private Long userId;
    private long expiresInSeconds;
}
