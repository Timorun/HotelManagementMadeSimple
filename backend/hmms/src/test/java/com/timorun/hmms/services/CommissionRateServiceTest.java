package com.timorun.hmms.services;

import com.timorun.hmms.IntegrationTest;
import com.timorun.hmms.dto.CommissionRateDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CommissionRateServiceTest extends IntegrationTest {
    private static final LocalDate RAISE = LocalDate.of(2027, 1, 1);

    @Autowired
    private CommissionRateService service;

    @Test
    void aRaiseOnlyCountsForBookingsMadeFromItsDate() {
        assertThat(service.list()).contains(
                new CommissionRateDto("booking.com", CommissionRateService.SINCE_THE_START, new BigDecimal("15.00")));

        service.save(new CommissionRateDto("Booking.com", RAISE, new BigDecimal("17")));

        CommissionRateService.Rates rates = service.rates();
        assertThat(rates.percentFor("booking.com", RAISE.minusDays(1))).isEqualByComparingTo("15");
        assertThat(rates.percentFor("booking.com", RAISE)).isEqualByComparingTo("17");
        assertThat(rates.commissionOn(new BigDecimal("400"), "booking.com", RAISE.minusDays(1))).isEqualByComparingTo("60.00");
        assertThat(rates.commissionOn(new BigDecimal("400"), "booking.com", RAISE)).isEqualByComparingTo("68.00");
    }

    @Test
    void directBookingsPayNothingAndUnknownPlatformsUseOther() {
        service.save(new CommissionRateDto("other", CommissionRateService.SINCE_THE_START, new BigDecimal("12.5")));

        CommissionRateService.Rates rates = service.rates();
        assertThat(rates.percentFor("direct", RAISE)).isEqualByComparingTo("0");
        assertThat(rates.percentFor("website", RAISE)).isEqualByComparingTo("0");
        assertThat(rates.percentFor("hostelworld", RAISE)).isEqualByComparingTo("12.5");
        assertThat(rates.percentFor(null, RAISE)).isEqualByComparingTo("12.5");
    }

    @Test
    void theStartingRateCanBeChangedButNotRemoved() {
        service.save(new CommissionRateDto("airbnb", RAISE, new BigDecimal("16")));
        service.delete("airbnb", RAISE);

        assertThat(service.rates().percentFor("airbnb", RAISE)).isEqualByComparingTo("15");
        assertThatThrownBy(() -> service.delete("airbnb", CommissionRateService.SINCE_THE_START))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("starting rate");
    }

    @Test
    void rejectsDirectChannelsAndImpossibleRates() {
        assertThatThrownBy(() -> service.save(new CommissionRateDto("website", RAISE, BigDecimal.TEN)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.save(new CommissionRateDto("booking.com", RAISE, new BigDecimal("101"))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.save(new CommissionRateDto("booking.com", RAISE, null)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
