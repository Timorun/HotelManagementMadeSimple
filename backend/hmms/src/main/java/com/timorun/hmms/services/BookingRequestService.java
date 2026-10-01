package com.timorun.hmms.services;

import com.timorun.hmms.dto.ConfirmBookingRequest;
import com.timorun.hmms.dto.GuestRequest;
import com.timorun.hmms.dto.PublicBookingRequest;
import com.timorun.hmms.dto.PublicBookingResponse;
import com.timorun.hmms.dto.PublicSuiteAvailability;
import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.entities.Guest;
import com.timorun.hmms.entities.Reservation;
import com.timorun.hmms.entities.ReservationStatus;
import com.timorun.hmms.entities.Suite;
import com.timorun.hmms.exceptions.GuestConflictException;
import com.timorun.hmms.mail.GuestMails;
import com.timorun.hmms.mail.MailService;
import com.timorun.hmms.repositories.ReservationRepository;
import com.timorun.hmms.repositories.SuiteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

/**
 * Booking requests from the public booking page ("solicitudes"): guests ask for a suite,
 * the owner confirms or rejects, and the guest is emailed at each step.
 */
@Service
public class BookingRequestService {
    public static final String WEBSITE_CHANNEL = "website";
    private static final int MAX_NIGHTS = 60;
    private static final int MAX_MONTHS_AHEAD = 18;

    private final SuiteRepository suiteRepository;
    private final ReservationRepository reservationRepository;
    private final ReservationService reservationService;
    private final GuestService guestService;
    private final GuestPreferencesService preferencesService;
    private final MailService mailService;
    private final GuestMails guestMails;

    public BookingRequestService(SuiteRepository suiteRepository, ReservationRepository reservationRepository,
                                 ReservationService reservationService, GuestService guestService,
                                 GuestPreferencesService preferencesService, MailService mailService, GuestMails guestMails) {
        this.suiteRepository = suiteRepository;
        this.reservationRepository = reservationRepository;
        this.reservationService = reservationService;
        this.guestService = guestService;
        this.preferencesService = preferencesService;
        this.mailService = mailService;
        this.guestMails = guestMails;
    }

    /** Active suites that fit the party and are free for the whole stay. */
    public List<PublicSuiteAvailability> findAvailableSuites(LocalDate checkIn, LocalDate checkOut, int numGuests) {
        validateStay(checkIn, checkOut, numGuests);
        return suiteRepository.findAll().stream()
                .filter(suite -> Boolean.TRUE.equals(suite.getActive()))
                .filter(suite -> suite.getCapacity() != null && suite.getCapacity() >= numGuests)
                .filter(suite -> isFree(suite, checkIn, checkOut))
                .sorted(Comparator.comparing(Suite::getCapacity).thenComparing(Suite::getSuiteName))
                .map(suite -> new PublicSuiteAvailability(suite.getSuiteId(), suite.getSuiteName(), suite.getCapacity()))
                .toList();
    }

    @Transactional
    public PublicBookingResponse submitRequest(PublicBookingRequest request) {
        if (request.getWebsite() != null && !request.getWebsite().isBlank()) {
            throw new IllegalArgumentException("Request could not be processed");
        }
        if (!Boolean.TRUE.equals(request.getPrivacyAccepted())) {
            throw new IllegalArgumentException("Please accept the privacy policy");
        }
        if (request.getEmail() == null || !request.getEmail().contains("@")) {
            throw new IllegalArgumentException("A valid email address is required");
        }
        int numGuests = request.getNumGuests() != null ? request.getNumGuests() : 0;
        validateStay(request.getCheckIn(), request.getCheckOut(), numGuests);

        Suite suite = suiteRepository.findById(request.getSuiteId() != null ? request.getSuiteId() : -1L)
                .filter(s -> Boolean.TRUE.equals(s.getActive()))
                .orElseThrow(() -> new IllegalArgumentException("Please choose a suite"));
        if (suite.getCapacity() < numGuests) {
            throw new IllegalArgumentException(suite.getSuiteName() + " fits at most " + suite.getCapacity() + " guests");
        }
        if (!isFree(suite, request.getCheckIn(), request.getCheckOut())) {
            throw new IllegalArgumentException(suite.getSuiteName() + " is no longer available for these dates");
        }

        Guest guest = findOrCreateGuest(request);

        Reservation reservation = new Reservation();
        reservation.setGuest(guest);
        reservation.setSuite(suite);
        reservation.setCheckIn(request.getCheckIn());
        reservation.setCheckOut(request.getCheckOut());
        reservation.setNumGuests(numGuests);
        reservation.setChannel(WEBSITE_CHANNEL);
        reservation.setNotes(blankToNull(request.getNotes()));
        reservation.setStatus(ReservationStatus.PENDING);
        reservation.setCreatedAt(LocalDateTime.now());
        Reservation saved = reservationRepository.save(reservation);

        mailService.send(guestMails.bookingRequestReceived(saved, preferencesService.preferencesLink(guest.getGuestId())));
        mailService.send(guestMails.newBookingRequestForOwner(saved));

        return new PublicBookingResponse(saved.getReservationId(), suite.getSuiteName(), saved.getCheckIn(), saved.getCheckOut(), "pending");
    }

    /** Pending reservations awaiting the owner's decision, oldest stay first. */
    public List<ReservationResponse> listPending() {
        return reservationRepository.findByStatus(ReservationStatus.PENDING).stream()
                .sorted(Comparator.comparing(Reservation::getCheckIn))
                .map(reservationService::toResponse)
                .toList();
    }

    public long countPending() {
        return reservationRepository.countByStatus(ReservationStatus.PENDING);
    }

    @Transactional
    public ReservationResponse confirm(Long reservationId, ConfirmBookingRequest decision) {
        Reservation reservation = pendingReservation(reservationId);
        if (!isFree(reservation.getSuite(), reservation.getCheckIn(), reservation.getCheckOut(), reservationId)) {
            throw new IllegalArgumentException(reservation.getSuite().getSuiteName() + " is no longer available for these dates");
        }
        if (decision != null && decision.getPriceTotal() != null) {
            if (decision.getPriceTotal().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Price must be 0 or higher");
            }
            reservation.setPriceTotal(decision.getPriceTotal());
        }
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setUpdatedAt(LocalDateTime.now());
        Reservation saved = reservationRepository.save(reservation);

        if (decision == null || !Boolean.FALSE.equals(decision.getNotifyGuest())) {
            mailService.send(guestMails.bookingConfirmed(saved, decision != null ? decision.getMessage() : null,
                    preferencesService.preferencesLink(saved.getGuest().getGuestId())));
        }
        return reservationService.toResponse(saved);
    }

    @Transactional
    public ReservationResponse reject(Long reservationId, ConfirmBookingRequest decision) {
        Reservation reservation = pendingReservation(reservationId);
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setUpdatedAt(LocalDateTime.now());
        Reservation saved = reservationRepository.save(reservation);

        if (decision == null || !Boolean.FALSE.equals(decision.getNotifyGuest())) {
            mailService.send(guestMails.bookingRejected(saved, decision != null ? decision.getMessage() : null,
                    preferencesService.preferencesLink(saved.getGuest().getGuestId())));
        }
        return reservationService.toResponse(saved);
    }

    // ===== PRIVATE HELPER METHODS =====

    private Reservation pendingReservation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found with ID: " + reservationId));
        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new IllegalArgumentException("Reservation #" + reservationId + " is not pending");
        }
        return reservation;
    }

    private Guest findOrCreateGuest(PublicBookingRequest request) {
        var existing = guestService.findActiveGuestByEmail(request.getEmail());
        if (existing.isPresent() && GuestService.hasSameName(existing.get(), request.getFirstName(), request.getLastName())) {
            Guest guest = existing.get();
            if (Boolean.TRUE.equals(request.getMarketingConsent()) && !Boolean.TRUE.equals(guest.getMarketingConsent())) {
                guest.setMarketingConsent(true);
                guest.setMarketingOptOutAt(null);
            }
            if (request.getLanguage() != null) {
                guest.setPreferredLanguage(request.getLanguage().toLowerCase().startsWith("es") ? "es" : "en");
            }
            return guest;
        }

        GuestRequest guestRequest = new GuestRequest();
        guestRequest.setFirstName(request.getFirstName());
        guestRequest.setLastName(request.getLastName());
        guestRequest.setEmail(request.getEmail());
        guestRequest.setPhone(request.getPhone());
        guestRequest.setNationalityCode(request.getNationalityCode());
        guestRequest.setMarketingConsent(Boolean.TRUE.equals(request.getMarketingConsent()));
        guestRequest.setPreferredLanguage(request.getLanguage());
        try {
            return guestService.createGuestEntity(guestRequest);
        } catch (GuestConflictException e) {
            // Same name as an existing guest but different email: keep it as a separate profile;
            // the owner can tell them apart from the request. Never expose other guests' data here.
            return guestService.createGuestEntity(guestRequest, false);
        }
    }

    private void validateStay(LocalDate checkIn, LocalDate checkOut, int numGuests) {
        if (checkIn == null || checkOut == null) {
            throw new IllegalArgumentException("Check-in and check-out dates are required");
        }
        if (!checkOut.isAfter(checkIn)) {
            throw new IllegalArgumentException("Check-out must be after check-in");
        }
        if (checkIn.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Check-in can't be in the past");
        }
        if (ChronoUnit.DAYS.between(checkIn, checkOut) > MAX_NIGHTS) {
            throw new IllegalArgumentException("Stays longer than " + MAX_NIGHTS + " nights: please contact us directly");
        }
        if (checkIn.isAfter(LocalDate.now().plusMonths(MAX_MONTHS_AHEAD))) {
            throw new IllegalArgumentException("We don't take bookings that far ahead yet");
        }
        if (numGuests < 1) {
            throw new IllegalArgumentException("Number of guests must be at least 1");
        }
    }

    private boolean isFree(Suite suite, LocalDate checkIn, LocalDate checkOut) {
        return isFree(suite, checkIn, checkOut, null);
    }

    private boolean isFree(Suite suite, LocalDate checkIn, LocalDate checkOut, Long excludeReservationId) {
        return reservationRepository.findActiveOverlapping(suite.getSuiteId(), checkIn, checkOut, excludeReservationId).isEmpty();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
