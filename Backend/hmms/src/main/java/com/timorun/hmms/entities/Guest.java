package com.timorun.hmms.entities;

import jakarta.annotation.Nonnull;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDateTime;

@Entity
//@Table(name = "guests")
public class Guest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String firstName;
    private String lastName;

    private String email;
    private String phone;

    @ManyToOne
//    @JoinColumn(name = "nationality_code") // This matches your SQL schema
    private Nationality nationality;

    private String notes;

    @Nonnull
    private Boolean marketingConsent = false;

    private Instant createdAt;

    private LocalDateTime anonymizedAt;
}