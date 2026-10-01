package com.timorun.hmms.services;

import com.timorun.hmms.config.HotelSettings;
import com.timorun.hmms.dto.BookingImportRequest;
import com.timorun.hmms.dto.BookingImportResult;
import com.timorun.hmms.dto.BookingImportResult.Action;
import com.timorun.hmms.dto.BookingImportResult.RowResult;
import com.timorun.hmms.dto.GuestRequest;
import com.timorun.hmms.entities.Guest;
import com.timorun.hmms.entities.Reservation;
import com.timorun.hmms.entities.ReservationStatus;
import com.timorun.hmms.entities.Suite;
import com.timorun.hmms.repositories.NationalityRepository;
import com.timorun.hmms.repositories.ReservationRepository;
import com.timorun.hmms.repositories.SuiteRepository;
import com.timorun.hmms.util.NameUtils;
import com.timorun.hmms.util.PhoneNumbers;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Imports the booking.com reservations export: fills in guest names, country, party size
 * and price on stays that the calendar sync created with a placeholder guest, and creates
 * stays that aren't in the app yet. A dry run shows what would happen without saving.
 */
@Service
public class BookingImportService {
    private final ReservationRepository reservationRepository;
    private final SuiteRepository suiteRepository;
    private final NationalityRepository nationalityRepository;
    private final GuestService guestService;
    private final HotelSettings settings;
    private final TransactionTemplate transactionTemplate;

    public BookingImportService(ReservationRepository reservationRepository, SuiteRepository suiteRepository,
                                NationalityRepository nationalityRepository, GuestService guestService,
                                HotelSettings settings, TransactionTemplate transactionTemplate) {
        this.reservationRepository = reservationRepository;
        this.suiteRepository = suiteRepository;
        this.nationalityRepository = nationalityRepository;
        this.guestService = guestService;
        this.settings = settings;
        this.transactionTemplate = transactionTemplate;
    }

    public BookingImportResult importRows(BookingImportRequest request) {
        return transactionTemplate.execute(status -> {
            List<RowResult> results = new ArrayList<>();
            List<BookingImportRequest.Row> rows = request.getRows() != null ? request.getRows() : List.of();
            for (int i = 0; i < rows.size(); i++) {
                results.add(importRow(i, rows.get(i)));
                reservationRepository.flush();
            }
            if (request.isDryRun()) {
                status.setRollbackOnly();
            }
            int updated = (int) results.stream().filter(r -> r.action() == Action.UPDATE).count();
            int created = (int) results.stream().filter(r -> r.action() == Action.CREATE).count();
            return new BookingImportResult(request.isDryRun(), updated, created, results.size() - updated - created, results);
        });
    }

    private RowResult importRow(int index, BookingImportRequest.Row row) {
        String ref = blankToNull(row.getBookingNumber());
        if (row.getCheckIn() == null || row.getCheckOut() == null || !row.getCheckOut().isAfter(row.getCheckIn())) {
            return new RowResult(index, ref, Action.SKIP, null, "Missing or invalid dates");
        }
        if (row.getSuiteId() == null) {
            return new RowResult(index, ref, Action.SKIP, null, "No suite chosen for this unit type");
        }
        Suite suite = suiteRepository.findById(row.getSuiteId()).orElse(null);
        if (suite == null) {
            return new RowResult(index, ref, Action.SKIP, null, "Unknown suite");
        }
        boolean cancelled = row.getStatus() != null && row.getStatus().toLowerCase(Locale.ROOT).contains("cancel");

        Optional<Reservation> match = findMatch(ref, suite, row);
        if (match.isPresent()) {
            Reservation reservation = match.get();
            updateFromRow(reservation, row, ref, cancelled);
            reservationRepository.save(reservation);
            return new RowResult(index, ref, Action.UPDATE, reservation.getReservationId(),
                    cancelled ? "Marked as cancelled" : "Details filled in");
        }

        if (cancelled) {
            return new RowResult(index, ref, Action.SKIP, null, "Cancelled on booking.com and not in the app");
        }
        List<Reservation> overlapping = reservationRepository.findActiveOverlapping(suite.getSuiteId(), row.getCheckIn(), row.getCheckOut(), null);
        if (!overlapping.isEmpty()) {
            return new RowResult(index, ref, Action.SKIP, null,
                    suite.getSuiteName() + " is already booked then (reservation #" + overlapping.get(0).getReservationId() + ")");
        }

        Reservation reservation = new Reservation();
        reservation.setSuite(suite);
        reservation.setGuest(createGuest(row));
        reservation.setCheckIn(row.getCheckIn());
        reservation.setCheckOut(row.getCheckOut());
        reservation.setChannel(BookingIcalSyncService.BOOKING_CHANNEL);
        reservation.setStatus(row.getCheckOut().isBefore(LocalDate.now()) ? ReservationStatus.CHECKED_OUT : ReservationStatus.CONFIRMED);
        reservation.setCreatedAt(LocalDateTime.now());
        updateFromRow(reservation, row, ref, false);
        Reservation saved = reservationRepository.save(reservation);
        return new RowResult(index, ref, Action.CREATE, saved.getReservationId(), "New reservation");
    }

    // By booking number first; otherwise a calendar-imported booking.com stay with the same suite and dates.
    private Optional<Reservation> findMatch(String ref, Suite suite, BookingImportRequest.Row row) {
        if (ref != null) {
            Optional<Reservation> byRef = reservationRepository.findFirstByExternalRef(ref);
            if (byRef.isPresent()) {
                return byRef;
            }
        }
        return reservationRepository.findActiveOverlapping(suite.getSuiteId(), row.getCheckIn(), row.getCheckOut(), null).stream()
                .filter(r -> r.getCheckIn().equals(row.getCheckIn()) && r.getCheckOut().equals(row.getCheckOut()))
                .filter(r -> r.getExternalRef() == null)
                .filter(r -> BookingIcalSyncService.BOOKING_CHANNEL.equalsIgnoreCase(r.getChannel()))
                .findFirst();
    }

    private void updateFromRow(Reservation reservation, BookingImportRequest.Row row, String ref, boolean cancelled) {
        if (ref != null) {
            reservation.setExternalRef(ref);
        }
        if (row.getPeople() != null && row.getPeople() > 0) {
            reservation.setNumGuests(row.getPeople());
        } else if (reservation.getNumGuests() == null) {
            reservation.setNumGuests(1);
        }
        if (row.getPrice() != null) {
            reservation.setPriceTotal(row.getPrice());
        }
        if (cancelled) {
            reservation.setStatus(ReservationStatus.CANCELLED);
            reservation.setSyncConflict(false);
        }
        String remarks = blankToNull(row.getRemarks());
        if (remarks != null && (reservation.getNotes() == null || !reservation.getNotes().contains(remarks))) {
            reservation.setNotes(reservation.getNotes() == null ? remarks : reservation.getNotes() + "\n" + remarks);
        }
        if (reservation.getGuest() != null && isPlaceholder(reservation.getGuest())) {
            fillGuest(reservation.getGuest(), row);
        }
        reservation.setUpdatedAt(LocalDateTime.now());
    }

    private Guest createGuest(BookingImportRequest.Row row) {
        String[] name = NameUtils.splitFullName(guestFullName(row));
        GuestRequest request = new GuestRequest();
        request.setFirstName(name[0] != null ? name[0] : BookingIcalSyncService.PLACEHOLDER_FIRST_NAME);
        request.setLastName(name[1] != null ? name[1] : BookingIcalSyncService.PLACEHOLDER_LAST_NAME);
        request.setPhone(validPhone(row.getPhone()));
        request.setNationalityCode(nationalityCode(row.getCountry()));
        return guestService.createGuestEntity(request, false);
    }

    private void fillGuest(Guest guest, BookingImportRequest.Row row) {
        String[] name = NameUtils.splitFullName(guestFullName(row));
        if (name[0] != null) {
            guest.setFirstName(name[0]);
            guest.setLastName(name[1]);
            guest.setNotes(null);
        }
        if (guest.getPhone() == null) {
            guest.setPhone(validPhone(row.getPhone()));
        }
        String nationality = nationalityCode(row.getCountry());
        if (guest.getNationality() == null && nationality != null) {
            nationalityRepository.findById(nationality).ifPresent(guest::setNationality);
        }
    }

    private static boolean isPlaceholder(Guest guest) {
        return BookingIcalSyncService.PLACEHOLDER_FIRST_NAME.equals(guest.getFirstName())
                && BookingIcalSyncService.PLACEHOLDER_LAST_NAME.equals(guest.getLastName());
    }

    // "Guest name(s)" can list several people; the first is the main guest. Fall back to the booker.
    private static String guestFullName(BookingImportRequest.Row row) {
        String names = blankToNull(row.getGuestName());
        if (names != null) {
            return names.split(",")[0];
        }
        return blankToNull(row.getBookerName());
    }

    private String validPhone(String phone) {
        return PhoneNumbers.toE164(phone, settings.getDefaultPhoneRegion()).orElse(null);
    }

    private String nationalityCode(String country) {
        String code = blankToNull(country);
        if (code == null || code.length() != 2) {
            return null;
        }
        String upper = code.toUpperCase(Locale.ROOT);
        return nationalityRepository.existsById(upper) ? upper : null;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
