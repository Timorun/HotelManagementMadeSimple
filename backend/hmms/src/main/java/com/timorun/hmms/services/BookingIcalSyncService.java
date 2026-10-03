package com.timorun.hmms.services;

import com.timorun.hmms.dto.GuestRequest;
import com.timorun.hmms.dto.IcalSyncResult;
import com.timorun.hmms.entities.Guest;
import com.timorun.hmms.entities.Reservation;
import com.timorun.hmms.entities.ReservationStatus;
import com.timorun.hmms.entities.Suite;
import com.timorun.hmms.ical.IcalCalendar;
import com.timorun.hmms.ical.IcalEvent;
import com.timorun.hmms.ical.IcalFetcher;
import com.timorun.hmms.repositories.ReservationRepository;
import com.timorun.hmms.repositories.SuiteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Two-way availability sync with booking.com through iCal, per suite:
 * - import: booking.com's "export calendar" URL is read every 15 minutes; new stays become
 *   reservations (with a placeholder guest), moved stays are updated, removed ones cancelled.
 * - export: our own feed (/api/public/ical/{token}.ics) lists stays booked here, so booking.com
 *   closes those dates. iCal carries dates only; guest details come from the booking export import.
 */
@Service
public class BookingIcalSyncService {
    public static final String BOOKING_CHANNEL = "booking.com";
    public static final String PLACEHOLDER_FIRST_NAME = "Booking.com";
    public static final String PLACEHOLDER_LAST_NAME = "guest";
    private static final String PLACEHOLDER_NOTE =
            "Created by the booking.com calendar sync. Add the guest's details, or import the booking.com reservations export.";

    private static final Logger log = LoggerFactory.getLogger(BookingIcalSyncService.class);
    private static final long EXPORT_READ_INTERVAL_MINUTES = 5;

    private final SuiteRepository suiteRepository;
    private final ReservationRepository reservationRepository;
    private final GuestService guestService;
    private final IcalFetcher fetcher;
    private final TransactionTemplate transactionTemplate;

    public BookingIcalSyncService(SuiteRepository suiteRepository, ReservationRepository reservationRepository,
                                  GuestService guestService, IcalFetcher fetcher, TransactionTemplate transactionTemplate) {
        this.suiteRepository = suiteRepository;
        this.reservationRepository = reservationRepository;
        this.guestService = guestService;
        this.fetcher = fetcher;
        this.transactionTemplate = transactionTemplate;
    }

    @Scheduled(fixedDelayString = "${hmms.ical.sync-interval-ms:900000}", initialDelayString = "${hmms.ical.initial-delay-ms:60000}")
    public void scheduledSync() {
        List<IcalSyncResult> results = syncAll();
        results.stream()
                .filter(result -> result.error() != null || result.created() + result.updated() + result.cancelled() > 0)
                .forEach(result -> log.info("Calendar sync {}: {}", result.suiteName(), result));
    }

    public List<IcalSyncResult> syncAll() {
        return suiteRepository.findByBookingIcalUrlIsNotNull().stream()
                .filter(suite -> Boolean.TRUE.equals(suite.getActive()))
                .map(suite -> syncSuite(suite.getSuiteId()))
                .toList();
    }

    public IcalSyncResult syncSuite(Long suiteId) {
        Suite suite = suiteRepository.findById(suiteId)
                .orElseThrow(() -> new IllegalArgumentException("Suite not found with ID: " + suiteId));
        if (suite.getBookingIcalUrl() == null) {
            throw new IllegalArgumentException(suite.getSuiteName() + " has no booking.com calendar URL");
        }

        List<IcalEvent> events;
        try {
            events = IcalCalendar.parse(fetcher.fetch(suite.getBookingIcalUrl()));
        } catch (Exception e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            String error = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            log.warn("Calendar sync failed for {}: {}", suite.getSuiteName(), error);
            transactionTemplate.executeWithoutResult(status -> recordSync(suiteId, error));
            return new IcalSyncResult(suiteId, suite.getSuiteName(), 0, 0, 0, 0, error);
        }

        return transactionTemplate.execute(status -> applyFeed(suiteId, events, LocalDate.now()));
    }

    /**
     * Reconciles a suite's imported reservations with the events in its booking.com feed.
     * Must run inside a transaction.
     */
    IcalSyncResult applyFeed(Long suiteId, List<IcalEvent> events, LocalDate today) {
        Suite suite = suiteRepository.findById(suiteId).orElseThrow();
        int created = 0;
        int updated = 0;
        int cancelled = 0;

        List<IcalEvent> upcoming = events.stream().filter(event -> event.end().isAfter(today)).toList();
        Set<String> feedUids = upcoming.stream().map(IcalEvent::uid).collect(Collectors.toSet());

        for (IcalEvent event : upcoming) {
            Reservation existing = reservationRepository.findByExternalUid(event.uid()).orElse(null);
            if (existing == null) {
                reservationRepository.save(newImportedReservation(suite, event));
                created++;
            } else if (applyEventChanges(existing, suite, event)) {
                reservationRepository.save(existing);
                updated++;
            }
        }

        // Stays that disappeared from the feed were cancelled or moved on booking.com
        for (Reservation reservation : reservationRepository.findUpcomingImported(suiteId, today)) {
            boolean notStarted = reservation.getCheckIn().isAfter(today) || reservation.getCheckIn().isEqual(today);
            boolean active = reservation.getStatus() == ReservationStatus.CONFIRMED || reservation.getStatus() == ReservationStatus.PENDING;
            if (!feedUids.contains(reservation.getExternalUid()) && notStarted && active) {
                reservation.setStatus(ReservationStatus.CANCELLED);
                reservation.setSyncConflict(false);
                reservation.setUpdatedAt(LocalDateTime.now());
                reservationRepository.save(reservation);
                cancelled++;
            }
        }
        reservationRepository.flush();

        int conflicts = refreshConflicts(suiteId, today);
        suite.setIcalLastSyncAt(LocalDateTime.now());
        suite.setIcalLastSyncError(null);
        suiteRepository.save(suite);

        return new IcalSyncResult(suiteId, suite.getSuiteName(), created, updated, cancelled, conflicts, null);
    }

    /**
     * The suite's own availability feed for booking.com: stays booked outside booking.com.
     * Guest names are left out on purpose (the feed URL is only protected by its token).
     */
    public String exportFeed(String token) {
        Suite suite = suiteRepository.findByIcalExportToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Unknown calendar"));
        recordExportRead(suite);
        List<IcalEvent> events = reservationRepository.findForIcalExport(suite.getSuiteId(), LocalDate.now().minusDays(1)).stream()
                .map(reservation -> new IcalEvent(
                        "hmms-" + reservation.getReservationId() + "@hotelmanagementmadesimple",
                        reservation.getCheckIn(),
                        reservation.getCheckOut(),
                        "Reserved"))
                .toList();
        return IcalCalendar.write(suite.getSuiteName(), events, Instant.now());
    }

    // ===== PRIVATE HELPER METHODS =====

    private Reservation newImportedReservation(Suite suite, IcalEvent event) {
        GuestRequest placeholder = new GuestRequest();
        placeholder.setFirstName(PLACEHOLDER_FIRST_NAME);
        placeholder.setLastName(PLACEHOLDER_LAST_NAME);
        placeholder.setNotes(PLACEHOLDER_NOTE);
        Guest guest = guestService.createGuestEntity(placeholder, false);

        Reservation reservation = new Reservation();
        reservation.setSuite(suite);
        reservation.setGuest(guest);
        reservation.setCheckIn(event.start());
        reservation.setCheckOut(event.end());
        reservation.setNumGuests(Math.min(2, suite.getCapacity()));
        reservation.setChannel(BOOKING_CHANNEL);
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setExternalUid(event.uid());
        reservation.setNotes("Imported from the booking.com calendar" + (event.summary().isBlank() ? "" : " (" + event.summary() + ")"));
        reservation.setCreatedAt(LocalDateTime.now());
        return reservation;
    }

    private boolean applyEventChanges(Reservation reservation, Suite suite, IcalEvent event) {
        boolean changed = false;
        if (!reservation.getCheckIn().equals(event.start()) || !reservation.getCheckOut().equals(event.end())) {
            reservation.setCheckIn(event.start());
            reservation.setCheckOut(event.end());
            changed = true;
        }
        if (!reservation.getSuite().getSuiteId().equals(suite.getSuiteId())) {
            reservation.setSuite(suite);
            changed = true;
        }
        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            // Back in the feed: re-activated on booking.com
            reservation.setStatus(ReservationStatus.CONFIRMED);
            changed = true;
        }
        if (changed) {
            reservation.setUpdatedAt(LocalDateTime.now());
        }
        return changed;
    }

    // Flags imported stays that overlap another active reservation in the same suite (double booking).
    private int refreshConflicts(Long suiteId, LocalDate today) {
        int conflicts = 0;
        Map<Long, Reservation> imported = reservationRepository.findUpcomingImported(suiteId, today).stream()
                .collect(Collectors.toMap(Reservation::getReservationId, Function.identity()));
        for (Reservation reservation : imported.values()) {
            boolean active = reservation.getStatus() != ReservationStatus.CANCELLED;
            boolean overlaps = active && !reservationRepository.findActiveOverlapping(
                    suiteId, reservation.getCheckIn(), reservation.getCheckOut(), reservation.getReservationId()).isEmpty();
            if (overlaps != reservation.isSyncConflict()) {
                reservation.setSyncConflict(overlaps);
                reservationRepository.save(reservation);
            }
            if (overlaps) {
                conflicts++;
            }
        }
        return conflicts;
    }

    // Shows the owner that booking.com really reads the feed; written at most every few minutes
    private void recordExportRead(Suite suite) {
        LocalDateTime now = LocalDateTime.now();
        if (suite.getIcalExportReadAt() == null || suite.getIcalExportReadAt().isBefore(now.minusMinutes(EXPORT_READ_INTERVAL_MINUTES))) {
            suite.setIcalExportReadAt(now);
            suiteRepository.save(suite);
        }
    }

    private void recordSync(Long suiteId, String error) {
        suiteRepository.findById(suiteId).ifPresent(suite -> {
            suite.setIcalLastSyncAt(LocalDateTime.now());
            suite.setIcalLastSyncError(error);
            suiteRepository.save(suite);
        });
    }
}
