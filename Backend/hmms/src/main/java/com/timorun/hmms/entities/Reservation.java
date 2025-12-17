package com.timorun.hmms.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
//@Table(name = "reservations")
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Suite suite;

    @ManyToOne
    private Guest guest;

    private LocalDate checkIn;
    private LocalDate checkOut;

    private int numGuests;
    private BigDecimal priceTotal;

    private String channel;
    private String status;

    private Instant createdAt;
}
