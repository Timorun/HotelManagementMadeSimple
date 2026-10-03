package com.timorun.hmms.services;

import com.timorun.hmms.dto.BookingRequestDecision;
import com.timorun.hmms.dto.GuestRequest;
import com.timorun.hmms.dto.PaymentSettings;
import com.timorun.hmms.dto.PriceQuote;
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
import com.timorun.hmms.util.Channels;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Booking requests from the public booking page ("solicitudes"). A guest asks for a suite at the
 * price shown (pending); the owner accepts it, which holds the dates and emails the payment details
 * (awaiting payment), and marks it as paid once the money arrives (confirmed). The owner can reject
 * a request or cancel an unpaid one at any time. The guest is emailed at each step.
 */
@Service
public class BookingRequestService {
    private static final int MAX_NIGHTS = 60;
    private static final int MAX_MONTHS_AHEAD = 18;

    private final SuiteRepository suiteRepository;
    private final ReservationRepository reservationRepository;
    private final ReservationService reservationService;
    private final GuestService guestService;
    private final GuestPreferencesService preferencesService;
    private final RateService rateService;
    private final PaymentSettingsService paymentSettingsService;
    private final PaymentRequestSender paymentRequestSender;
    private final MailService mailService;
    private final GuestMails guestMails;

    public BookingRequestService(SuiteRepository suiteRepository, ReservationRepository reservationRepository,
                                 ReservationService reservationService, GuestService guestService,
                                 GuestPreferencesService preferencesService, RateService rateService,
                                 PaymentSettingsService paymentSettingsService, PaymentRequestSender paymentRequestSender,
                                 MailService mailService, GuestMails guestMails) {
        this.suiteRepository = suiteRepository;
        this.reservationRepository = reservationRepository;
        this.reservationService = reservationService;
        this.guestService = guestService;
        this.preferencesService = preferencesService;
        this.rateService = rateService;
        this.paymentSettingsService = paymentSettingsService;
        this.paymentRequestSender = paymentRequestSender;
        this.mailService = mailService;
        this.guestMails = guestMails;
    }

    /** Active suites that fit the party and are free for the whole stay, with the price of the stay. */
    public List<PublicSuiteAvailability> findAvailableSuites(LocalDate checkIn, LocalDate checkOut, int numGuests) {
        validateStay(checkIn, checkOut, numGuests);
        List<Suite> available = suiteRepository.findAll().stream()
                .filter(suite -> Boolean.TRUE.equals(suite.getActive()))
                .filter(suite -> suite.getCapacity() != null && suite.getCapacity() >= numGuests)
                .filter(suite -> isFree(suite, checkIn, checkOut))
                .sorted(Comparator.comparing(Suite::getCapacity).thenComparing(Suite::getSuiteName))
                .toList();
        Map<Long, PriceQuote> quotes = rateService.quotes(available.stream().map(Suite::getSuiteId).toList(), checkIn, checkOut);
        return available.stream()
                .map(suite -> new PublicSuiteAvailability(
                        suite.getSuiteId(),
                        suite.getSuiteName(),
                        suite.getCapacity(),
                        suite.getSizeM2(),
                        suite.getDescriptionEn(),
                        suite.getDescriptionEs(),
                        SuiteService.amenityList(suite),
                        List.copyOf(suite.getPhotoUrls()),
                        quotes.get(suite.getSuiteId()).total(),
                        quotes.get(suite.getSuiteId()).nights()))
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
        // A request from the own booking page is a direct booking: no platform commission
        reservation.setChannel(Channels.DIRECT);
        reservation.setNotes(blankToNull(request.getNotes()));
        // The price shown on the booking page, from the price calendar; null = to be agreed
        reservation.setPriceTotal(rateService.quote(suite.getSuiteId(), request.getCheckIn(), request.getCheckOut()).total());
        reservation.setStatus(ReservationStatus.PENDING);
        reservation.setCreatedAt(LocalDateTime.now());
        Reservation saved = reservationRepository.save(reservation);

        mailService.send(guestMails.bookingRequestReceived(saved, preferencesService.preferencesLink(guest.getGuestId())));
        mailService.send(guestMails.newBookingRequestForOwner(saved));

        return new PublicBookingResponse(saved.getReservationId(), suite.getSuiteName(), saved.getCheckIn(), saved.getCheckOut(),
                saved.getStatus().getValue(), saved.getPriceTotal());
    }

    /** New requests awaiting the owner's decision, soonest stay first. */
    public List<ReservationResponse> listPending() {
        return reservationRepository.findByStatus(ReservationStatus.PENDING).stream()
                .sorted(Comparator.comparing(Reservation::getCheckIn))
                .map(reservationService::toResponse)
                .toList();
    }

    /** Accepted requests waiting for the guest's payment, earliest deadline first. */
    public List<ReservationResponse> listAwaitingPayment() {
        return reservationRepository.findByStatus(ReservationStatus.AWAITING_PAYMENT).stream()
                .sorted(Comparator.comparing(Reservation::getPaymentDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Reservation::getCheckIn))
                .map(reservationService::toResponse)
                .toList();
    }

    /** Counts for the navigation badge: new requests and unpaid ones past their deadline need the owner. */
    public Map<String, Long> counts() {
        List<Reservation> awaiting = reservationRepository.findByStatus(ReservationStatus.AWAITING_PAYMENT);
        long overdue = awaiting.stream().filter(ReservationService::isPaymentOverdue).count();
        return Map.of(
                "pending", reservationRepository.countByStatus(ReservationStatus.PENDING),
                "awaitingPayment", (long) awaiting.size(),
                "overdue", overdue);
    }

    /**
     * Accepts a new request: holds the dates at the given price and emails the guest how and by
     * when to pay.
     */
    @Transactional
    public ReservationResponse accept(Long reservationId, BookingRequestDecision decision) {
        BookingRequestDecision d = decision != null ? decision : new BookingRequestDecision();
        Reservation reservation = reservationWithStatus(reservationId, ReservationStatus.PENDING, "is not a new request");
        if (!isFree(reservation.getSuite(), reservation.getCheckIn(), reservation.getCheckOut(), reservationId)) {
            throw new IllegalArgumentException(reservation.getSuite().getSuiteName() + " is no longer available for these dates");
        }
        BigDecimal price = d.getPriceTotal() != null ? d.getPriceTotal() : reservation.getPriceTotal();
        if (price == null) {
            throw new IllegalArgumentException("Enter the total price of the stay");
        }
        if (price.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Price must be 0 or higher");
        }
        boolean notify = !Boolean.FALSE.equals(d.getNotifyGuest());
        PaymentSettings payment = notify ? paymentRequestSender.requirePaymentDetails() : null;
        LocalDate dueDate = d.getPaymentDueDate() != null ? d.getPaymentDueDate() : paymentSettingsService.defaultDueDate(reservation.getCheckIn());
        if (dueDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("The payment deadline can't be in the past");
        }

        reservation.setPriceTotal(price);
        reservation.setPaymentDueDate(dueDate);
        reservation.setStatus(ReservationStatus.AWAITING_PAYMENT);
        reservation.setUpdatedAt(LocalDateTime.now());
        Reservation saved = reservationRepository.save(reservation);
        if (notify) {
            paymentRequestSender.send(saved, d.getMessage(), payment, false);
        }
        return reservationService.toResponse(saved);
    }

    /** The guest paid: the booking is confirmed and the guest gets a confirmation. */
    @Transactional
    public ReservationResponse markPaid(Long reservationId, BookingRequestDecision decision) {
        BookingRequestDecision d = decision != null ? decision : new BookingRequestDecision();
        Reservation reservation = reservationWithStatus(reservationId, ReservationStatus.AWAITING_PAYMENT, "is not waiting for payment");
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setPaidAt(LocalDateTime.now());
        reservation.setUpdatedAt(LocalDateTime.now());
        Reservation saved = reservationRepository.save(reservation);
        if (!Boolean.FALSE.equals(d.getNotifyGuest())) {
            mailService.send(guestMails.bookingConfirmed(saved, d.getMessage(),
                    preferencesService.preferencesLink(saved.getGuest().getGuestId())));
        }
        return reservationService.toResponse(saved);
    }

    /** Gives the guest more time to pay; by default they get a reminder with the new date. */
    @Transactional
    public ReservationResponse extendPaymentDeadline(Long reservationId, BookingRequestDecision decision) {
        BookingRequestDecision d = decision != null ? decision : new BookingRequestDecision();
        Reservation reservation = reservationWithStatus(reservationId, ReservationStatus.AWAITING_PAYMENT, "is not waiting for payment");
        if (d.getPaymentDueDate() == null || d.getPaymentDueDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Choose a new payment deadline from today on");
        }
        reservation.setPaymentDueDate(d.getPaymentDueDate());
        reservation.setUpdatedAt(LocalDateTime.now());
        Reservation saved = reservationRepository.save(reservation);
        if (!Boolean.FALSE.equals(d.getNotifyGuest())) {
            paymentRequestSender.sendReminder(saved, d.getMessage());
        }
        return reservationService.toResponse(saved);
    }

    /** Rejects a new request, or cancels an accepted one that wasn't paid; frees the dates. */
    @Transactional
    public ReservationResponse reject(Long reservationId, BookingRequestDecision decision) {
        BookingRequestDecision d = decision != null ? decision : new BookingRequestDecision();
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found with ID: " + reservationId));
        boolean unpaid = reservation.getStatus() == ReservationStatus.AWAITING_PAYMENT;
        if (reservation.getStatus() != ReservationStatus.PENDING && !unpaid) {
            throw new IllegalArgumentException("Reservation #" + reservationId + " is not an open request");
        }
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setUpdatedAt(LocalDateTime.now());
        Reservation saved = reservationRepository.save(reservation);

        if (!Boolean.FALSE.equals(d.getNotifyGuest())) {
            String preferencesLink = preferencesService.preferencesLink(saved.getGuest().getGuestId());
            mailService.send(unpaid
                    ? guestMails.unpaidRequestCancelled(saved, d.getMessage(), preferencesLink)
                    : guestMails.bookingRejected(saved, d.getMessage(), preferencesLink));
        }
        return reservationService.toResponse(saved);
    }

    // ===== PRIVATE HELPER METHODS =====

    private Reservation reservationWithStatus(Long reservationId, ReservationStatus status, String otherwise) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found with ID: " + reservationId));
        if (reservation.getStatus() != status) {
            throw new IllegalArgumentException("Reservation #" + reservationId + " " + otherwise);
        }
        return reservation;
    }

    /** Today plus the deadline from the settings, but never after the day of arrival. */
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
