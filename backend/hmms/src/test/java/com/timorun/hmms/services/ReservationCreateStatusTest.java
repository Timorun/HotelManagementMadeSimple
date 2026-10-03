package com.timorun.hmms.services;

import com.timorun.hmms.IntegrationTest;
import com.timorun.hmms.dto.CreateReservationRequest;
import com.timorun.hmms.dto.PaymentSettings;
import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.dto.UpdateReservationStatusRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReservationCreateStatusTest extends IntegrationTest {
    private static final LocalDate CHECK_IN = LocalDate.now().plusDays(40);

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private BookingRequestService bookingRequestService;

    @Autowired
    private PaymentSettingsService paymentSettingsService;

    private CreateReservationRequest request(String status, String email) {
        CreateReservationRequest request = new CreateReservationRequest();
        request.setSuiteId(2L);
        request.setCheckIn(CHECK_IN);
        request.setCheckOut(CHECK_IN.plusDays(3));
        request.setNumGuests(2);
        request.setPriceTotal(new BigDecimal("390"));
        request.setChannel("direct");
        request.setFirstName("Marta");
        // Guests with the same name are refused, so every reservation gets its own guest
        request.setLastName("Ibáñez " + email.substring(0, email.indexOf('@')));
        request.setEmail(email);
        request.setStatus(status);
        return request;
    }

    @Test
    void newReservationsAreConfirmedUnlessAnotherStatusIsChosen() {
        assertThat(reservationService.createReservation(request(null, "marta1@example.com")).getStatus()).isEqualTo("confirmed");

        CreateReservationRequest past = request("checked_out", "marta2@example.com");
        past.setCheckIn(LocalDate.of(2025, 5, 1));
        past.setCheckOut(LocalDate.of(2025, 5, 3));
        assertThat(reservationService.createReservation(past).getStatus()).isEqualTo("checked_out");

        assertThatThrownBy(() -> reservationService.createReservation(request("cancelled", "marta3@example.com")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("can't start as cancelled");
    }

    @Test
    void awaitingPaymentGetsADeadlineAndWaitsWithTheAcceptedRequests() {
        ReservationResponse created = reservationService.createReservation(request("awaiting_payment", "marta4@example.com"));

        assertThat(created.getStatus()).isEqualTo("awaiting_payment");
        assertThat(created.getPaymentDueDate()).isEqualTo(LocalDate.now().plusDays(PaymentSettingsService.DEFAULT_DEADLINE_DAYS));
        assertThat(bookingRequestService.listAwaitingPayment())
                .extracting(ReservationResponse::getReservationId)
                .contains(created.getReservationId());
    }

    @Test
    void emailingThePaymentDetailsNeedsAPaymentMethodAndAPrice() {
        CreateReservationRequest withEmail = request("awaiting_payment", "marta5@example.com");
        withEmail.setNotifyGuest(true);
        assertThatThrownBy(() -> reservationService.createReservation(withEmail))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("bank account or Bizum");

        paymentSettingsService.update(new PaymentSettings("ES91 2100 0418 4502 0005 1332", "Carmen Suites SL", null, 3));
        withEmail.setPriceTotal(null);
        assertThatThrownBy(() -> reservationService.createReservation(withEmail))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("total price");

        withEmail.setPriceTotal(new BigDecimal("390"));
        withEmail.setPaymentDueDate(LocalDate.now().plusDays(1));
        ReservationResponse created = reservationService.createReservation(withEmail);
        assertThat(created.getPaymentDueDate()).isEqualTo(LocalDate.now().plusDays(1));
    }

    @Test
    void channelsAreStoredAsDirectOrThePlatform() {
        CreateReservationRequest website = request(null, "marta6@example.com");
        website.setChannel("Website");
        assertThat(reservationService.createReservation(website).getChannel()).isEqualTo("direct");

        CreateReservationRequest none = request(null, "marta7@example.com");
        none.setChannel(null);
        none.setCheckIn(CHECK_IN.plusDays(10));
        none.setCheckOut(CHECK_IN.plusDays(12));
        assertThat(reservationService.createReservation(none).getChannel()).isEqualTo("direct");

        CreateReservationRequest booking = request(null, "marta8@example.com");
        booking.setChannel("Booking.com");
        booking.setCheckIn(CHECK_IN.plusDays(20));
        booking.setCheckOut(CHECK_IN.plusDays(22));
        assertThat(reservationService.createReservation(booking).getChannel()).isEqualTo("booking.com");
    }

    @Test
    void switchingToAwaitingPaymentSetsADeadline() {
        ReservationResponse created = reservationService.createReservation(request(null, "marta9@example.com"));

        ReservationResponse updated = reservationService.updateReservationStatus(created.getReservationId(),
                new UpdateReservationStatusRequest("awaiting_payment"));

        assertThat(updated.getPaymentDueDate()).isNotNull();
    }
}
