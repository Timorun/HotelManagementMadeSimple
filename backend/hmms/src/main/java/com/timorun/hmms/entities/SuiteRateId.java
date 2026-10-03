package com.timorun.hmms.entities;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDate;

/** Primary key of {@link SuiteRate}: one price per suite and date. */
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class SuiteRateId implements Serializable {
    private Long suiteId;
    private LocalDate rateDate;
}
