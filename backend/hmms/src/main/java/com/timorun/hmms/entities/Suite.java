package com.timorun.hmms.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.List;

@Entity
@Table(name = "suites")
@Getter
@Setter
@NoArgsConstructor
public class Suite {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long suiteId;

    private String suiteName;
    private Integer capacity;
    
    @Column(columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean active;
    
    @OneToMany(mappedBy = "suite")
    @JsonIgnore
    private List<Reservation> reservations;
}