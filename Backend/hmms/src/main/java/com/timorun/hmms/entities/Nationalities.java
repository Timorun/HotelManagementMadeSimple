package com.timorun.hmms.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;


@Entity
public class Nationalities {

    @Id
    private long nationality_id;

    private String name;
}
