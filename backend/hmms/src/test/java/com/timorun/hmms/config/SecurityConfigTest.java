package com.timorun.hmms.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.util.ServletRequestPathUtils;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigTest {

    @Test
    void allowedOriginsAreACommaSeparatedList() {
        // Spring also ignores a trailing slash, a common mistake in HMMS_CORS_ALLOWED_ORIGINS
        CorsConfiguration cors = corsFor("https://manage-carmensuites.com/, https://hmms.vercel.app");

        assertThat(cors.checkOrigin("https://manage-carmensuites.com")).isEqualTo("https://manage-carmensuites.com");
        assertThat(cors.checkOrigin("https://hmms.vercel.app")).isEqualTo("https://hmms.vercel.app");
        assertThat(cors.checkOrigin("https://evil.example")).isNull();
    }

    private static CorsConfiguration corsFor(String allowedOrigins) {
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/auth/login");
        ServletRequestPathUtils.parseAndCache(request);
        return new SecurityConfig(allowedOrigins).corsConfigurationSource().getCorsConfiguration(request);
    }
}
