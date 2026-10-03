package com.timorun.hmms.services;

import com.timorun.hmms.IntegrationTest;
import com.timorun.hmms.dto.BookingRequestDecision;
import com.timorun.hmms.dto.PaymentSettings;
import com.timorun.hmms.dto.PublicBookingRequest;
import com.timorun.hmms.dto.PublicBookingResponse;
import com.timorun.hmms.dto.PublicPreferencesResponse;
import com.timorun.hmms.dto.PublicSuiteAvailability;
import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.dto.SetRatesRequest;
import com.timorun.hmms.entities.Guest;
import com.timorun.hmms.mail.MailMessage;
import com.timorun.hmms.mail.MailService;
import com.timorun.hmms.repositories.ReservationRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;

class BookingRequestServiceTest extends IntegrationTest {
    private static final LocalDate CHECK_IN = LocalDate.now().plusMonths(2);
    private static final LocalDate CHECK_OUT = CHECK_IN.plusDays(3);

    @Autowired
    private BookingRequestService bookingRequestService;

    @Autowired
    private GuestPreferencesService preferencesService;

    @Autowired
    private GuestService guestService;

    @Autowired
    private GuestLinkTokens tokens;

    @Autowired
    private RateService rateService;

    @Autowired
    private PaymentSettingsService paymentSettingsService;

    @Autowired
    private ReservationRepository reservationRepository;

    @MockitoBean
    private MailService mailService;

    private void setPrice(long suiteId, LocalDate from, LocalDate to, String price) {
        SetRatesRequest rates = new SetRatesRequest();
        rates.setSuiteIds(List.of(suiteId));
        rates.setFrom(from);
        rates.setTo(to);
        rates.setPrice(new BigDecimal(price));
        rateService.setRates(rates);
    }

    private void setPaymentDetails() {
        paymentSettingsService.update(new PaymentSettings("ES91 2100 0418 4502 0005 1332", "Carmen Suites SL", "612 345 678", 3));
    }

    private PublicBookingRequest request(long suiteId, String email) {
        PublicBookingRequest request = new PublicBookingRequest();
        request.setSuiteId(suiteId);
        request.setCheckIn(CHECK_IN);
        request.setCheckOut(CHECK_OUT);
        request.setNumGuests(2);
        request.setFirstName("Elena");
        request.setLastName("Romero Vidal");
        request.setEmail(email);
        request.setPhone("+34 655 11 22 33");
        request.setLanguage("es");
        request.setPrivacyAccepted(true);
        return request;
    }

    private List<MailMessage> sentMails() {
        ArgumentCaptor<MailMessage> captor = ArgumentCaptor.forClass(MailMessage.class);
        verify(mailService, atLeastOnce()).send(captor.capture());
        return captor.getAllValues();
    }

    @Test
    void requestCreatesPendingReservationBlocksTheSuiteAndMailsGuest() {
        List<PublicSuiteAvailability> before = bookingRequestService.findAvailableSuites(CHECK_IN, CHECK_OUT, 2);
        assertThat(before).extracting(PublicSuiteAvailability::suiteId).contains(2L);

        PublicBookingResponse response = bookingRequestService.submitRequest(request(2, "elena@example.com"));

        assertThat(response.status()).isEqualTo("pending");
        assertThat(bookingRequestService.findAvailableSuites(CHECK_IN, CHECK_OUT, 2))
                .extracting(PublicSuiteAvailability::suiteId).doesNotContain(2L);
        assertThat(bookingRequestService.listPending())
                .extracting(ReservationResponse::getReservationId).contains(response.reference());

        List<MailMessage> mails = sentMails();
        assertThat(mails).anySatisfy(mail -> {
            assertThat(mail.to()).isEqualTo("elena@example.com");
            assertThat(mail.subject()).contains("Hemos recibido tu solicitud");
            assertThat(mail.body()).contains("/preferences/");
        });
    }

    @Test
    void honeypotAndCapacityAreEnforced() {
        PublicBookingRequest bot = request(2, "bot@example.com");
        bot.setWebsite("http://spam.example");
        assertThatThrownBy(() -> bookingRequestService.submitRequest(bot)).isInstanceOf(IllegalArgumentException.class);

        PublicBookingRequest tooMany = request(2, "big@example.com");
        tooMany.setNumGuests(5);
        assertThatThrownBy(() -> bookingRequestService.submitRequest(tooMany))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("fits at most");
    }

    @Test
    void availabilityAndRequestCarryThePriceFromTheCalendar() {
        setPrice(2, CHECK_IN, CHECK_OUT.minusDays(1), "120");

        PublicSuiteAvailability suite = bookingRequestService.findAvailableSuites(CHECK_IN, CHECK_OUT, 2).stream()
                .filter(available -> available.suiteId() == 2L).findFirst().orElseThrow();
        assertThat(suite.priceTotal()).isEqualByComparingTo("360.00");
        assertThat(suite.nights()).isEqualTo(3);
        PublicSuiteAvailability unpriced = bookingRequestService.findAvailableSuites(CHECK_IN, CHECK_OUT, 2).stream()
                .filter(available -> available.suiteId() == 3L).findFirst().orElseThrow();
        assertThat(unpriced.priceTotal()).isNull();

        PublicBookingResponse response = bookingRequestService.submitRequest(request(2, "priced@example.com"));
        assertThat(response.priceTotal()).isEqualByComparingTo("360.00");
        assertThat(sentMails()).anySatisfy(mail -> {
            assertThat(mail.to()).isEqualTo("priced@example.com");
            assertThat(mail.body()).contains("Precio total: €360.00");
        });
    }

    @Test
    void acceptedRequestWaitsForPaymentThenIsConfirmed() {
        setPaymentDetails();
        setPrice(3, CHECK_IN, CHECK_OUT.minusDays(1), "150");
        PublicBookingResponse request = bookingRequestService.submitRequest(request(3, "payer@example.com"));
        clearInvocations(mailService);

        ReservationResponse accepted = bookingRequestService.accept(request.reference(), new BookingRequestDecision());
        assertThat(accepted.getStatus()).isEqualTo("awaiting_payment");
        assertThat(accepted.getPriceTotal()).isEqualByComparingTo("450.00");
        assertThat(accepted.getPaymentDueDate()).isEqualTo(LocalDate.now().plusDays(3));
        assertThat(accepted.getPaymentOverdue()).isFalse();
        assertThat(sentMails()).singleElement().satisfies(mail -> {
            assertThat(mail.subject()).contains("datos para el pago");
            assertThat(mail.body()).contains("ES91 2100 0418 4502 0005 1332", "Carmen Suites SL", "+34612345678",
                    "#" + request.reference(), "€450.00");
        });

        // The dates stay blocked while the guest pays
        assertThat(bookingRequestService.findAvailableSuites(CHECK_IN, CHECK_OUT, 2))
                .extracting(PublicSuiteAvailability::suiteId).doesNotContain(3L);
        assertThat(bookingRequestService.listAwaitingPayment())
                .extracting(ReservationResponse::getReservationId).contains(request.reference());
        assertThatThrownBy(() -> bookingRequestService.accept(request.reference(), null)).hasMessageContaining("not a new request");
        clearInvocations(mailService);

        ReservationResponse paid = bookingRequestService.markPaid(request.reference(), null);
        assertThat(paid.getStatus()).isEqualTo("confirmed");
        assertThat(paid.getPaidAt()).isNotNull();
        assertThat(sentMails()).singleElement().satisfies(mail ->
                assertThat(mail.body()).contains("Hemos recibido tu pago"));
        assertThat(bookingRequestService.listAwaitingPayment())
                .extracting(ReservationResponse::getReservationId).doesNotContain(request.reference());
    }

    @Test
    void unpaidRequestIsFlaggedCanBeExtendedAndCancelled() {
        setPaymentDetails();
        PublicBookingResponse request = bookingRequestService.submitRequest(request(4, "late@example.com"));
        BookingRequestDecision price = new BookingRequestDecision();
        price.setPriceTotal(new BigDecimal("500"));
        bookingRequestService.accept(request.reference(), price);

        var reservation = reservationRepository.findById(request.reference()).orElseThrow();
        reservation.setPaymentDueDate(LocalDate.now().minusDays(1));
        reservationRepository.save(reservation);
        assertThat(bookingRequestService.listAwaitingPayment()).filteredOn(r -> r.getReservationId().equals(request.reference()))
                .singleElement().satisfies(r -> assertThat(r.getPaymentOverdue()).isTrue());
        assertThat(bookingRequestService.counts().get("overdue")).isGreaterThanOrEqualTo(1L);

        BookingRequestDecision extension = new BookingRequestDecision();
        extension.setPaymentDueDate(LocalDate.now().minusDays(1));
        assertThatThrownBy(() -> bookingRequestService.extendPaymentDeadline(request.reference(), extension))
                .hasMessageContaining("new payment deadline");
        extension.setPaymentDueDate(LocalDate.now().plusDays(2));
        clearInvocations(mailService);
        ReservationResponse extended = bookingRequestService.extendPaymentDeadline(request.reference(), extension);
        assertThat(extended.getPaymentOverdue()).isFalse();
        assertThat(sentMails()).singleElement().satisfies(mail -> assertThat(mail.subject()).contains("Recordatorio"));

        clearInvocations(mailService);
        ReservationResponse cancelled = bookingRequestService.reject(request.reference(), null);
        assertThat(cancelled.getStatus()).isEqualTo("cancelled");
        assertThat(sentMails()).singleElement().satisfies(mail -> assertThat(mail.body()).contains("No hemos recibido el pago"));
        assertThat(bookingRequestService.findAvailableSuites(CHECK_IN, CHECK_OUT, 2))
                .extracting(PublicSuiteAvailability::suiteId).contains(4L);
    }

    @Test
    void acceptNeedsAPriceAndPaymentDetailsAndRejectFreesTheDates() {
        PublicBookingResponse first = bookingRequestService.submitRequest(request(3, "first@example.com"));
        assertThatThrownBy(() -> bookingRequestService.accept(first.reference(), null))
                .hasMessageContaining("total price");
        BookingRequestDecision withPrice = new BookingRequestDecision();
        withPrice.setPriceTotal(new BigDecimal("450.00"));
        assertThatThrownBy(() -> bookingRequestService.accept(first.reference(), withPrice))
                .hasMessageContaining("bank account or Bizum");

        // Without emailing the guest, payment details aren't needed
        withPrice.setNotifyGuest(false);
        assertThat(bookingRequestService.accept(first.reference(), withPrice).getStatus()).isEqualTo("awaiting_payment");

        PublicBookingRequest otherDates = request(3, "second@example.com");
        otherDates.setFirstName("Luis");
        otherDates.setCheckIn(CHECK_OUT.plusDays(5));
        otherDates.setCheckOut(CHECK_OUT.plusDays(7));
        PublicBookingResponse second = bookingRequestService.submitRequest(otherDates);
        ReservationResponse rejected = bookingRequestService.reject(second.reference(), new BookingRequestDecision());
        assertThat(rejected.getStatus()).isEqualTo("cancelled");
        assertThat(sentMails()).anySatisfy(mail -> assertThat(mail.body()).contains("no podemos confirmar"));

        assertThatThrownBy(() -> bookingRequestService.accept(second.reference(), null))
                .hasMessageContaining("not a new request");
        assertThatThrownBy(() -> bookingRequestService.reject(second.reference(), null))
                .hasMessageContaining("not an open request");
    }

    @Test
    void preferenceLinkLetsGuestOptOutAndRequestDeletion() {
        PublicBookingRequest request = request(4, "optout@example.com");
        request.setMarketingConsent(true);
        PublicBookingResponse booking = bookingRequestService.submitRequest(request);
        Long guestId = bookingRequestService.listPending().stream()
                .filter(r -> r.getReservationId().equals(booking.reference()))
                .findFirst().orElseThrow().getGuestId();

        String token = tokens.create(guestId, GuestLinkTokens.MAGIC_LINK_VALIDITY);
        assertThat(preferencesService.getPreferences(token).marketingConsent()).isTrue();

        PublicPreferencesResponse optedOut = preferencesService.optOut(token);
        assertThat(optedOut.marketingConsent()).isFalse();

        preferencesService.requestDeletion(token);
        Guest guest = guestService.getGuestEntity(guestId);
        assertThat(guest.getMarketingOptOutAt()).isNotNull();
        assertThat(guest.getDeletionRequestedAt()).isNotNull();

        assertThatThrownBy(() -> preferencesService.getPreferences(token + "x"))
                .hasMessageContaining("invalid or has expired");
    }
}
