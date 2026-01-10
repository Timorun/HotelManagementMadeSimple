package com.timorun.hmms.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "guests")
@Getter
@Setter
@NoArgsConstructor
public class Guest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long guestId;

    private String firstName;
    private String lastName;
    private String email;
    private String phone;

    @ManyToOne
    @JoinColumn(name = "nationality_code")
    private Nationality nationality;

    private String notes;
    private Boolean marketingConsent;
    private LocalDateTime createdAt;
    private LocalDateTime anonymizedAt;

    @OneToMany(mappedBy = "guest") // "guest" refers to the field name in the Reservation class
    private List<Reservation> reservations;
}