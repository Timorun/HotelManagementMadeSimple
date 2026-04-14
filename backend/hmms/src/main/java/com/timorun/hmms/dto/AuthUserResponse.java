package com.timorun.hmms.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthUserResponse {
    private Long userId;
    private String username;
    private String email;
}
