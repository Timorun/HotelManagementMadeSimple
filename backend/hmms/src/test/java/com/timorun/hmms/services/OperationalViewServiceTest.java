package com.timorun.hmms.services;

import com.timorun.hmms.IntegrationTest;
import com.timorun.hmms.dto.CreateReservationRequest;
import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.dto.UpdateReservationStatusRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OperationalViewServiceTest extends IntegrationTest {
    private static final LocalDate DAY = LocalDate.of(2032, 6, 10);

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private OperationalViewService operationalViewService;

    private ReservationResponse reserve(long suiteId, LocalDate checkIn, LocalDate checkOut, String email) {
        CreateReservationRequest request = new CreateReservationRequest();
        request.setSuiteId(suiteId);
        request.setCheckIn(checkIn);
        request.setCheckOut(checkOut);
        request.setNumGuests(2);
        request.setPriceTotal(new BigDecimal("100.00"));
        request.setChannel("direct");
        request.setFirstName("Test");
        request.setLastName(email);
        request.setEmail(email + "@example.com");
        return reservationService.createReservation(request);
    }

    private void setStatus(ReservationResponse reservation, String status) {
        reservationService.updateReservationStatus(reservation.getReservationId(), new UpdateReservationStatusRequest(status));
    }

    private List<Long> ids(List<ReservationResponse> reservations) {
        return reservations.stream().map(ReservationResponse::getReservationId).toList();
    }

    @Test
    void arrivalsKeepGuestsAfterCheckInButDropCancelled() {
        ReservationResponse confirmed = reserve(1, DAY, DAY.plusDays(2), "arrival-a");
        ReservationResponse checkedIn = reserve(2, DAY, DAY.plusDays(2), "arrival-b");
        ReservationResponse cancelled = reserve(3, DAY, DAY.plusDays(2), "arrival-c");
        setStatus(checkedIn, "checked_in");
        setStatus(cancelled, "cancelled");

        List<ReservationResponse> arrivals = operationalViewService.getArrivals(DAY);

        assertThat(ids(arrivals)).contains(confirmed.getReservationId(), checkedIn.getReservationId())
                .doesNotContain(cancelled.getReservationId());
        assertThat(arrivals).filteredOn(r -> r.getReservationId().equals(checkedIn.getReservationId()))
                .extracting(ReservationResponse::getStatus).containsExactly("checked_in");
    }

    @Test
    void departuresKeepGuestsAfterCheckOut() {
        ReservationResponse inHouse = reserve(1, DAY.minusDays(2), DAY, "departure-a");
        ReservationResponse left = reserve(2, DAY.minusDays(2), DAY, "departure-b");
        setStatus(inHouse, "checked_in");
        setStatus(left, "checked_out");

        assertThat(ids(operationalViewService.getDepartures(DAY)))
                .contains(inHouse.getReservationId(), left.getReservationId());
    }

    @Test
    void availabilityCheckUsesSuiteAndIgnoresCancelled() {
        ReservationResponse first = reserve(4, DAY, DAY.plusDays(3), "overlap-a");

        assertThatThrownBy(() -> reserve(4, DAY.plusDays(1), DAY.plusDays(2), "overlap-b"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not available");

        // Same dates in another suite are fine
        reserve(5, DAY.plusDays(1), DAY.plusDays(2), "overlap-c");

        // Once cancelled, the dates free up
        setStatus(first, "cancelled");
        reserve(4, DAY.plusDays(1), DAY.plusDays(2), "overlap-d");
    }
}
