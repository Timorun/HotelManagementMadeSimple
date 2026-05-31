package com.timorun.hmms.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Table(name = "nationalities")
@Getter
@Setter
@NoArgsConstructor
public class Nationality {
    @Id
    private String nationalityCode; // No GeneratedValue because codes are manual (e.g., 'US', 'NL')

    private String name;
}
