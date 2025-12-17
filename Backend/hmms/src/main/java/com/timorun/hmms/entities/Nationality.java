package com.timorun.hmms.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;


@Entity
//@Table(name = "nationalities")
public class Nationality {

    @Id
    @Column(name = "nationality_code") // Matches the snake_case in your SQL
    private String nationalityCode;

    private String name;
}
