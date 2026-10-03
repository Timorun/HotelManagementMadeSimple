package com.timorun.hmms.services;

import com.timorun.hmms.IntegrationTest;
import com.timorun.hmms.dto.AnalyticsOutlook;
import com.timorun.hmms.dto.AnalyticsOverview;
import com.timorun.hmms.dto.CommissionRateDto;
import com.timorun.hmms.dto.CreateReservationRequest;
import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.entities.Reservation;
import com.timorun.hmms.entities.SuiteRate;
import com.timorun.hmms.repositories.ReservationRepository;
import com.timorun.hmms.repositories.SuiteRateRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AnalyticsServiceTest extends IntegrationTest {
    private static final LocalDate MARCH = LocalDate.of(2034, 3, 1);
    private static final LocalDate MARCH_END = LocalDate.of(2034, 3, 31);
    private static final int SUITES = 5;

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private CommissionRateService commissionRateService;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private SuiteRateRepository suiteRateRepository;

    private int guests;

    private ReservationResponse stay(long suiteId, LocalDate checkIn, LocalDate checkOut, String price, String channel, String status) {
        CreateReservationRequest request = new CreateReservationRequest();
        request.setSuiteId(suiteId);
        request.setCheckIn(checkIn);
        request.setCheckOut(checkOut);
        request.setNumGuests(2);
        request.setPriceTotal(new BigDecimal(price));
        request.setChannel(channel);
        request.setStatus(status);
        request.setFirstName("Analytics");
        request.setLastName("Guest " + (++guests));
        request.setEmail("analytics.guest" + guests + "@example.com");
        return reservationService.createReservation(request);
    }

    private void bookedOn(ReservationResponse response, LocalDate date) {
        Reservation reservation = reservationRepository.findById(response.getReservationId()).orElseThrow();
        reservation.setCreatedAt(date.atStartOfDay());
        reservationRepository.save(reservation);
    }

    private AnalyticsOverview.ChannelRow channel(AnalyticsOverview overview, String name) {
        return overview.channels().stream().filter(row -> row.channel().equals(name)).findFirst().orElseThrow();
    }

    @Test
    void splitsRevenueAndCommissionOverTheNightsOfThePeriod() {
        stay(1, LocalDate.of(2034, 3, 10), LocalDate.of(2034, 3, 13), "300", "direct", null);
        stay(2, LocalDate.of(2034, 3, 12), LocalDate.of(2034, 3, 14), "400", "booking.com", null);
        // Two of its three nights fall in March
        stay(3, LocalDate.of(2034, 3, 30), LocalDate.of(2034, 4, 2), "300", "website", null);
        // Not sold yet
        stay(4, LocalDate.of(2034, 3, 10), LocalDate.of(2034, 3, 12), "500", "direct", "pending");
        // Last year, same dates
        stay(1, LocalDate.of(2033, 3, 10), LocalDate.of(2033, 3, 12), "180", "direct", null);

        AnalyticsOverview overview = analyticsService.overview(MARCH, MARCH_END);

        AnalyticsOverview.Totals march = overview.current();
        assertThat(march.nightsSold()).isEqualTo(7);
        assertThat(march.nightsAvailable()).isEqualTo(31 * SUITES);
        assertThat(march.revenue()).isEqualByComparingTo("900.00");
        assertThat(march.commission()).isEqualByComparingTo("60.00");
        assertThat(march.revenueAfterCommission()).isEqualByComparingTo("840.00");
        assertThat(march.bookings()).isEqualTo(3);
        assertThat(march.directNights()).isEqualTo(5);
        assertThat(march.platformNights()).isEqualTo(2);
        assertThat(march.averageNightlyRate()).isEqualByComparingTo("128.57");
        assertThat(march.occupancy()).isEqualTo(4.5);

        assertThat(overview.previous().nightsSold()).isEqualTo(2);
        assertThat(overview.previous().revenue()).isEqualByComparingTo("180.00");
        assertThat(overview.compareFrom()).isEqualTo(LocalDate.of(2033, 3, 1));

        assertThat(channel(overview, "direct").nights()).isEqualTo(5);
        assertThat(channel(overview, "direct").platform()).isFalse();
        assertThat(channel(overview, "direct").previousNights()).isEqualTo(2);
        assertThat(channel(overview, "booking.com").commission()).isEqualByComparingTo("60.00");
        assertThat(channel(overview, "booking.com").platform()).isTrue();
        assertThat(overview.channels()).extracting(AnalyticsOverview.ChannelRow::channel).doesNotContain("website");
    }

    @Test
    void groupsNightsByWeekdayAndMonth() {
        // Fri 10, Sat 11 and Sun 12 March 2034
        stay(1, LocalDate.of(2034, 3, 10), LocalDate.of(2034, 3, 13), "300", "direct", null);
        stay(2, LocalDate.of(2034, 7, 1), LocalDate.of(2034, 7, 3), "200", "airbnb", null);

        AnalyticsOverview overview = analyticsService.overview(MARCH, MARCH_END);

        assertThat(overview.weekdays()).hasSize(7);
        AnalyticsOverview.WeekdayRow friday = overview.weekdays().get(4);
        assertThat(friday.weekday()).isEqualTo(5);
        assertThat(friday.nightsSold()).isEqualTo(1);
        assertThat(friday.directNights()).isEqualTo(1);
        // March 2034 has five Fridays
        assertThat(friday.nightsAvailable()).isEqualTo(5 * SUITES);
        assertThat(overview.weekdays().get(0).nightsSold()).isZero();

        assertThat(overview.year()).isEqualTo(2034);
        assertThat(overview.months()).hasSize(12);
        AnalyticsOverview.MonthRow march = overview.months().get(2);
        assertThat(march.month()).isEqualTo("2034-03");
        assertThat(march.nightsSold()).isEqualTo(3);
        assertThat(march.directNights()).isEqualTo(3);
        assertThat(march.directRevenue()).isEqualByComparingTo("300.00");
        assertThat(march.nightsAvailable()).isEqualTo(31 * SUITES);
        // Months outside the period are still filled in, e.g. July
        assertThat(overview.months().get(6).nightsSold()).isEqualTo(2);
        assertThat(overview.months().get(6).revenue()).isEqualByComparingTo("200.00");
    }

    @Test
    void commissionUsesTheRateOfTheDayTheStayWasBooked() {
        commissionRateService.save(new CommissionRateDto("booking.com", LocalDate.of(2030, 1, 1), new BigDecimal("20")));
        ReservationResponse older = stay(1, LocalDate.of(2034, 3, 10), LocalDate.of(2034, 3, 12), "200", "booking.com", null);
        bookedOn(older, LocalDate.of(2029, 6, 1));
        ReservationResponse newer = stay(2, LocalDate.of(2034, 3, 10), LocalDate.of(2034, 3, 12), "200", "booking.com", null);
        bookedOn(newer, LocalDate.of(2030, 6, 1));

        AnalyticsOverview overview = analyticsService.overview(MARCH, MARCH_END);

        // 15% of 200 + 20% of 200
        assertThat(channel(overview, "booking.com").commission()).isEqualByComparingTo("70.00");
    }

    @Test
    void rejectsAPeriodThatEndsBeforeItStarts() {
        assertThatThrownBy(() -> analyticsService.overview(MARCH_END, MARCH))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void outlookShowsBookedAndEmptyNightsWithTheirPrice() {
        LocalDate today = LocalDate.now();
        AnalyticsOutlook before = analyticsService.outlook();

        stay(1, today.plusDays(1), today.plusDays(3), "200", "direct", null);
        stay(2, today.plusDays(1), today.plusDays(2), "120", "booking.com", null);
        stay(3, today.plusDays(2), today.plusDays(4), "260", "direct", "awaiting_payment");
        suiteRateRepository.save(new SuiteRate(4L, today.plusDays(5), new BigDecimal("99.00")));

        AnalyticsOutlook outlook = analyticsService.outlook();

        assertThat(outlook.days()).hasSize(14).startsWith(today);
        assertThat(state(outlook, 1L, 1)).isEqualTo("direct");
        assertThat(state(outlook, 1L, 2)).isEqualTo("direct");
        assertThat(state(outlook, 1L, 3)).isEqualTo("empty");
        assertThat(state(outlook, 2L, 1)).isEqualTo("platform");
        assertThat(state(outlook, 3L, 2)).isEqualTo("awaiting_payment");
        AnalyticsOutlook.Night priced = night(outlook, 4L, 5);
        assertThat(priced.state()).isEqualTo("empty");
        assertThat(priced.price()).isEqualByComparingTo("99.00");

        assertThat(outlook.next30().nightsBooked() - before.next30().nightsBooked()).isEqualTo(3);
        assertThat(outlook.next30().nightsAwaitingPayment() - before.next30().nightsAwaitingPayment()).isEqualTo(2);
        assertThat(outlook.next30().revenue().subtract(before.next30().revenue())).isEqualByComparingTo("320.00");
        assertThat(outlook.next90().nightsAvailable()).isEqualTo(90 * SUITES);
    }

    private static AnalyticsOutlook.Night night(AnalyticsOutlook outlook, long suiteId, int dayOffset) {
        List<AnalyticsOutlook.Night> nights = outlook.suites().stream()
                .filter(suite -> suite.suiteId() == suiteId)
                .findFirst().orElseThrow()
                .nights();
        return nights.get(dayOffset);
    }

    private static String state(AnalyticsOutlook outlook, long suiteId, int dayOffset) {
        return night(outlook, suiteId, dayOffset).state();
    }
}
