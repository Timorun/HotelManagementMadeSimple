package com.timorun.hmms.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import org.springframework.security.access.annotation.Secured;
import org.springframework.security.config.annotation.web.SecurityMarker;

@Entity
public class User {

    @Id
    @GeneratedValue
    private Long id;

    private String username;

    private String email;

    private String password_hash;
}
