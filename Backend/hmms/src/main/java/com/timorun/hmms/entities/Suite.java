package com.timorun.hmms.entities;

import jakarta.annotation.Nonnull;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;

import java.time.Instant;
import java.time.LocalDate;

@Entity
public class Suite {

    @Id
    @GeneratedValue
    private Long id;

    private String name;

    private int capacity;
}