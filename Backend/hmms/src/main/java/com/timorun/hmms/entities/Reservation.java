package com.timorun.hmms.entities;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "reservations")
public class Reservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reservationId;

    @ManyToOne
    @JoinColumn(name = "suite_id") // Maps to the suite_id column in SQL
    private Suite suite;

    @ManyToOne
    @JoinColumn(name = "guest_id")
    private Guest guest;

    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer numGuests;
    private BigDecimal priceTotal;
    private String channel;
    private String status;
    private LocalDateTime createdAt;

    // Getters and Setters
}