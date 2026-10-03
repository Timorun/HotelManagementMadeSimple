package com.timorun.hmms.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Price of one night in a suite on a date.
 */
@Entity
@Table(name = "suite_rates")
@IdClass(SuiteRateId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SuiteRate {
    @Id
    @Column(name = "suite_id")
    private Long suiteId;

    @Id
    private LocalDate rateDate;

    private BigDecimal price;
}
