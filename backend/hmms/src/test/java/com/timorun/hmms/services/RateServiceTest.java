package com.timorun.hmms.services;

import com.timorun.hmms.IntegrationTest;
import com.timorun.hmms.dto.RateResponse;
import com.timorun.hmms.dto.SetRatesRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RateServiceTest extends IntegrationTest {
    // A Monday a few months ahead, so a week from it covers every weekday once
    private static final LocalDate MONDAY = LocalDate.now().plusMonths(3).with(TemporalAdjusters.next(DayOfWeek.MONDAY));

    @Autowired
    private RateService rateService;

    private SetRatesRequest rates(List<Long> suiteIds, LocalDate from, LocalDate to, List<Integer> weekdays, String price) {
        SetRatesRequest request = new SetRatesRequest();
        request.setSuiteIds(suiteIds);
        request.setFrom(from);
        request.setTo(to);
        request.setWeekdays(weekdays);
        request.setPrice(price != null ? new BigDecimal(price) : null);
        return request;
    }

    @Test
    void setsPricesForARangeAndWeekdaysAndQuotesStays() {
        LocalDate sunday = MONDAY.plusDays(6);
        assertThat(rateService.setRates(rates(List.of(1L, 2L), MONDAY, sunday, null, "100"))).isEqualTo(14);
        // Weekends (Friday, Saturday nights) cost more in suite 1 only
        assertThat(rateService.setRates(rates(List.of(1L), MONDAY, sunday, List.of(5, 6), "140.5"))).isEqualTo(2);

        List<RateResponse> listed = rateService.listRates(MONDAY, sunday);
        assertThat(listed).hasSize(14);
        assertThat(listed).filteredOn(rate -> rate.suiteId() == 1L && rate.date().equals(MONDAY.plusDays(4)))
                .singleElement().satisfies(rate -> assertThat(rate.price()).isEqualByComparingTo("140.50"));

        // Thursday to Sunday = Thursday, Friday and Saturday nights
        assertThat(rateService.quote(1L, MONDAY.plusDays(3), sunday).total()).isEqualByComparingTo("381.00");
        assertThat(rateService.quote(2L, MONDAY.plusDays(3), sunday).total()).isEqualByComparingTo("300.00");
        assertThat(rateService.quote(2L, MONDAY.plusDays(3), sunday).nights()).isEqualTo(3);
        // A night without a price: price on request
        assertThat(rateService.quote(1L, sunday.minusDays(1), sunday.plusDays(2)).total()).isNull();
        assertThat(rateService.quote(3L, MONDAY, sunday).total()).isNull();
    }

    @Test
    void clearsPrices() {
        rateService.setRates(rates(List.of(1L), MONDAY, MONDAY.plusDays(6), null, "90"));
        assertThat(rateService.setRates(rates(List.of(1L), MONDAY, MONDAY.plusDays(6), List.of(1), null))).isEqualTo(1);
        assertThat(rateService.listRates(MONDAY, MONDAY.plusDays(6))).hasSize(6)
                .noneMatch(rate -> rate.date().equals(MONDAY));
    }

    @Test
    void rejectsInvalidInput() {
        assertThatThrownBy(() -> rateService.setRates(rates(List.of(), MONDAY, MONDAY, null, "90"))).hasMessageContaining("at least one suite");
        assertThatThrownBy(() -> rateService.setRates(rates(List.of(999L), MONDAY, MONDAY, null, "90"))).hasMessageContaining("Unknown suite");
        assertThatThrownBy(() -> rateService.setRates(rates(List.of(1L), MONDAY, MONDAY.minusDays(1), null, "90"))).hasMessageContaining("end date");
        assertThatThrownBy(() -> rateService.setRates(rates(List.of(1L), MONDAY, MONDAY.plusYears(3), null, "90"))).hasMessageContaining("at most");
        assertThatThrownBy(() -> rateService.setRates(rates(List.of(1L), MONDAY, MONDAY, List.of(8), "90"))).hasMessageContaining("Weekdays");
        assertThatThrownBy(() -> rateService.setRates(rates(List.of(1L), MONDAY, MONDAY, null, "-1"))).hasMessageContaining("between 0");
    }
}
