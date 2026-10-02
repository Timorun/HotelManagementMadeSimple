package com.timorun.hmms.services;

import com.timorun.hmms.IntegrationTest;
import com.timorun.hmms.dto.CreateReservationRequest;
import com.timorun.hmms.dto.GuestRequest;
import com.timorun.hmms.dto.GuestResponse;
import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.entities.Guest;
import com.timorun.hmms.exceptions.GuestConflictException;
import com.timorun.hmms.repositories.GuestRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GuestCreationTest extends IntegrationTest {

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private GuestService guestService;

    @Autowired
    private GuestRepository guestRepository;

    private CreateReservationRequest inlineGuestReservation(String firstName, String lastName, String email) {
        CreateReservationRequest request = new CreateReservationRequest();
        request.setSuiteId(1L);
        request.setCheckIn(LocalDate.of(2031, 3, 10));
        request.setCheckOut(LocalDate.of(2031, 3, 12));
        request.setNumGuests(2);
        request.setPriceTotal(new BigDecimal("200.00"));
        request.setChannel("direct");
        request.setFirstName(firstName);
        request.setLastName(lastName);
        request.setEmail(email);
        return request;
    }

    @Test
    void inlineGuestKeepsBothLastNamesAndGuestNotes() {
        CreateReservationRequest request = inlineGuestReservation("  María ", " García   López ", "maria@example.com");
        request.setGuestNotes("Allergic to feathers");
        request.setNotes("Late arrival");

        ReservationResponse reservation = reservationService.createReservation(request);
        GuestResponse guest = guestService.getGuest(reservation.getGuestId());

        assertThat(guest.getFirstName()).isEqualTo("María");
        assertThat(guest.getLastName()).isEqualTo("García López");
        assertThat(guest.getNotes()).isEqualTo("Allergic to feathers");
        assertThat(reservation.getNotes()).isEqualTo("Late arrival");
        assertThat(reservation.getGuestName()).isEqualTo("María García López");
    }

    @Test
    void inlineGuestWithEmailOfDifferentGuestIsRejectedInsteadOfSilentlyReused() {
        reservationService.createReservation(inlineGuestReservation("Ana", "Ruiz", "shared@example.com"));

        CreateReservationRequest second = inlineGuestReservation("Pedro", "Sánchez Gómez", "shared@example.com");
        second.setCheckIn(LocalDate.of(2031, 4, 1));
        second.setCheckOut(LocalDate.of(2031, 4, 3));

        assertThatThrownBy(() -> reservationService.createReservation(second))
                .isInstanceOf(GuestConflictException.class)
                .hasMessageContaining("Ana Ruiz");
    }

    @Test
    void inlineGuestWithSameEmailAndNameReusesExistingGuest() {
        ReservationResponse first = reservationService.createReservation(inlineGuestReservation("Ana", "Ruiz Pérez", "ana@example.com"));

        CreateReservationRequest second = inlineGuestReservation("ana", "ruiz  pérez", "ANA@example.com");
        second.setCheckIn(LocalDate.of(2031, 5, 1));
        second.setCheckOut(LocalDate.of(2031, 5, 3));

        ReservationResponse reservation = reservationService.createReservation(second);
        assertThat(reservation.getGuestId()).isEqualTo(first.getGuestId());
    }

    @Test
    void searchMatchesFullNameWithTwoLastNamesAndIgnoresAccents() {
        GuestRequest request = new GuestRequest();
        request.setFirstName("José Luis");
        request.setLastName("Fernández Martín");
        guestService.createGuest(request);

        assertThat(names(guestService.searchByName("jose luis fernandez martin"))).containsExactly("José Luis Fernández Martín");
        assertThat(names(guestService.searchByName("Fernández Martín"))).containsExactly("José Luis Fernández Martín");
        assertThat(names(guestService.searchByName("luis martin"))).containsExactly("José Luis Fernández Martín");
        assertThat(guestService.searchByName("luis garcia")).isEmpty();
    }

    private List<String> names(List<GuestResponse> guests) {
        return guests.stream().map(g -> g.getFirstName() + " " + g.getLastName()).toList();
    }

    @Test
    void guestPhoneIsSavedInE164AndInvalidPhoneIsRejected() {
        GuestRequest request = new GuestRequest();
        request.setFirstName("Phone");
        request.setLastName("Tester");
        request.setPhone("612 34 56 78");
        assertThat(guestService.createGuest(request).getPhone()).isEqualTo("+34612345678");

        GuestRequest invalid = new GuestRequest();
        invalid.setFirstName("Bad");
        invalid.setLastName("Phone");
        invalid.setPhone("12");
        assertThatThrownBy(() -> guestService.createGuest(invalid))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid phone number");
    }

    @Test
    void guestWithOldUnconvertiblePhoneCanStillBeUpdated() {
        Guest legacy = new Guest();
        legacy.setFirstName("Legacy");
        legacy.setLastName("Phone");
        legacy.setPhone("0612 345678");
        legacy.setMarketingConsent(false);
        legacy = guestRepository.save(legacy);

        GuestRequest update = new GuestRequest();
        update.setFirstName("Legacy");
        update.setLastName("Phone");
        update.setPhone("0612 345678");
        update.setNotes("Prefers late check-in");

        GuestResponse updated = guestService.updateGuest(legacy.getGuestId(), update);
        assertThat(updated.getNotes()).isEqualTo("Prefers late check-in");
        assertThat(updated.getPhone()).isEqualTo("0612 345678");

        Long legacyId = legacy.getGuestId();
        update.setPhone("12");
        assertThatThrownBy(() -> guestService.updateGuest(legacyId, update))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid phone number");
    }
}
