package com.timorun.hmms.entities;

import jakarta.persistence.*;

@Entity
//@Table(name = "app_users")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;

    private String email;

    @Column(name = "password_hash") // Matches the snake_case in your SQL
    private String passwordHash;
}
