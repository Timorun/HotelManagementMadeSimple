package com.timorun.hmms.entities;

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
 * Commission % a platform (booking.com, airbnb, ...) charges for bookings made from a date on.
 */
@Entity
@Table(name = "platform_commission_rates")
@IdClass(PlatformCommissionRateId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PlatformCommissionRate {
    @Id
    private String channel;

    @Id
    private LocalDate validFrom;

    private BigDecimal rate;
}
