package com.timorun.hmms.entities;

import jakarta.annotation.Nonnull;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
public class Guest {

    @Id
    @GeneratedValue
    private Long id;

    private String firstName;
    private String lastName;

    private String email;
    private String phone;

    @ManyToOne
    private String nationality_id;

    private String notes;

    @Nonnull
    private Boolean marketingConsent = false;

    private Instant createdAt;

    private LocalDate anonymizedAt;
}