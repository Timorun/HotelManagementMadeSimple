package com.timorun.hmms.config;

import com.timorun.hmms.entities.AppUser;
import com.timorun.hmms.repositories.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AuthBootstrapConfig {

    @Bean
    CommandLineRunner ensureAdminUser(
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder,
            @Value("${hmms.auth.bootstrap-admin.username:admin}") String username,
            @Value("${hmms.auth.bootstrap-admin.email:admin@carmensuites.local}") String email,
            @Value("${hmms.auth.bootstrap-admin.password:ChangeMeNow!123}") String password
    ) {
        return args -> {
            if (appUserRepository.count() == 0) {
                AppUser admin = new AppUser();
                admin.setUsername(username);
                admin.setEmail(email);
                admin.setPasswordHash(passwordEncoder.encode(password));
                appUserRepository.save(admin);
            }
        };
    }
}
