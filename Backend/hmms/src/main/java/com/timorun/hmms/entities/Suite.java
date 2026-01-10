package com.timorun.hmms.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "suites")
public class Suite {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long suiteId;

    private String suiteName;
    private Integer capacity;

    // Getters and Setters
}