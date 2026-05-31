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

    // TODO delete this when going to production and add the user to db manually
    @Bean
    CommandLineRunner ensureAdminUser(
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder,
            @Value("${hmms.auth.bootstrap-admin.username}") String username,
            @Value("${hmms.auth.bootstrap-admin.email}") String email,
            @Value("${hmms.auth.bootstrap-admin.password}") String password
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
