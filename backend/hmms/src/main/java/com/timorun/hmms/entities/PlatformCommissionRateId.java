package com.timorun.hmms.entities;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDate;

/** Primary key of {@link PlatformCommissionRate}: one rate per platform and start date. */
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class PlatformCommissionRateId implements Serializable {
    private String channel;
    private LocalDate validFrom;
}
