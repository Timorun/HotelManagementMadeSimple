package com.timorun.hmms.services;

import com.timorun.hmms.IntegrationTest;
import com.timorun.hmms.dto.ConfirmBookingRequest;
import com.timorun.hmms.dto.PublicBookingRequest;
import com.timorun.hmms.dto.PublicBookingResponse;
import com.timorun.hmms.dto.PublicPreferencesResponse;
import com.timorun.hmms.dto.PublicSuiteAvailability;
import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.entities.Guest;
import com.timorun.hmms.mail.MailMessage;
import com.timorun.hmms.mail.MailService;
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

    @MockitoBean
    private MailService mailService;

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
    void confirmSetsPriceAndStatusAndRejectCancels() {
        PublicBookingResponse first = bookingRequestService.submitRequest(request(3, "first@example.com"));
        ConfirmBookingRequest decision = new ConfirmBookingRequest();
        decision.setPriceTotal(new BigDecimal("450.00"));
        ReservationResponse confirmed = bookingRequestService.confirm(first.reference(), decision);
        assertThat(confirmed.getStatus()).isEqualTo("confirmed");
        assertThat(confirmed.getPriceTotal()).isEqualByComparingTo("450.00");

        PublicBookingRequest otherDates = request(3, "second@example.com");
        otherDates.setFirstName("Luis");
        otherDates.setCheckIn(CHECK_OUT.plusDays(5));
        otherDates.setCheckOut(CHECK_OUT.plusDays(7));
        PublicBookingResponse second = bookingRequestService.submitRequest(otherDates);
        ReservationResponse rejected = bookingRequestService.reject(second.reference(), new ConfirmBookingRequest());
        assertThat(rejected.getStatus()).isEqualTo("cancelled");

        assertThatThrownBy(() -> bookingRequestService.confirm(second.reference(), null))
                .hasMessageContaining("not pending");
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
