package com.timorun.hmms.services;

import com.timorun.hmms.dto.CreateReservationRequest;
import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.dto.UpdateReservationRequest;
import com.timorun.hmms.dto.UpdateReservationStatusRequest;
import com.timorun.hmms.entities.Guest;
import com.timorun.hmms.entities.Nationality;
import com.timorun.hmms.entities.Reservation;
import com.timorun.hmms.entities.ReservationStatus;
import com.timorun.hmms.entities.Suite;
import com.timorun.hmms.repositories.GuestRepository;
import com.timorun.hmms.repositories.NationalityRepository;
import com.timorun.hmms.repositories.ReservationRepository;
import com.timorun.hmms.repositories.SuiteRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReservationService {
    private final ReservationRepository reservationRepository;
    private final GuestRepository guestRepository;
    private final SuiteRepository suiteRepository;
    private final NationalityRepository nationalityRepository;

    public ReservationService(
            ReservationRepository reservationRepository,
            GuestRepository guestRepository,
            SuiteRepository suiteRepository,
            NationalityRepository nationalityRepository) {
        this.reservationRepository = reservationRepository;
        this.guestRepository = guestRepository;
        this.suiteRepository = suiteRepository;
        this.nationalityRepository = nationalityRepository;
    }

    /**
     * Create a new reservation.
     * Can either link to existing guest (via guestId) or create new guest from request data.
     */
    public ReservationResponse createReservation(CreateReservationRequest request) {
        validateReservationDates(request.getCheckIn(), request.getCheckOut());
        
        // Get or create guest
        Guest guest = getOrCreateGuest(request);
        
        // Get suite
        Suite suite = suiteRepository.findById(request.getSuiteId())
                .orElseThrow(() -> new IllegalArgumentException("Suite not found with ID: " + request.getSuiteId()));
        
        // Check suite availability
        validateSuiteAvailability(request.getSuiteId(), request.getCheckIn(), request.getCheckOut(), null);
        validateDuplicateReservation(request.getSuiteId(), guest.getGuestId(), request.getCheckIn(), request.getCheckOut());
        
        // Create reservation
        Reservation reservation = new Reservation();
        reservation.setGuest(guest);
        reservation.setSuite(suite);
        reservation.setCheckIn(request.getCheckIn());
        reservation.setCheckOut(request.getCheckOut());
        reservation.setNumGuests(request.getNumGuests());
        reservation.setPriceTotal(request.getPriceTotal());
        reservation.setChannel(request.getChannel());
        reservation.setNotes(request.getNotes());
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setCreatedAt(LocalDateTime.now());
        
        Reservation saved = reservationRepository.save(reservation);
        return toResponse(saved);
    }

    /**
     * Update an existing reservation.
     */
    public ReservationResponse updateReservation(Long reservationId, UpdateReservationRequest request) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found with ID: " + reservationId));
        
        validateReservationDates(request.getCheckIn(), request.getCheckOut());
        
        // If changing dates or suite, check availability
        if (!reservation.getSuite().getSuiteId().equals(request.getSuiteId()) ||
            !reservation.getCheckIn().equals(request.getCheckIn()) ||
            !reservation.getCheckOut().equals(request.getCheckOut())) {
            validateSuiteAvailability(request.getSuiteId(), request.getCheckIn(), request.getCheckOut(), reservationId);
        }
        
        // Update guest if different
        if (!reservation.getGuest().getGuestId().equals(request.getGuestId())) {
            Guest guest = guestRepository.findById(request.getGuestId())
                    .orElseThrow(() -> new IllegalArgumentException("Guest not found with ID: " + request.getGuestId()));
            reservation.setGuest(guest);
        }
        
        // Update suite if different
        if (!reservation.getSuite().getSuiteId().equals(request.getSuiteId())) {
            Suite suite = suiteRepository.findById(request.getSuiteId())
                    .orElseThrow(() -> new IllegalArgumentException("Suite not found with ID: " + request.getSuiteId()));
            reservation.setSuite(suite);
        }
        
        // Update dates and other fields
        reservation.setCheckIn(request.getCheckIn());
        reservation.setCheckOut(request.getCheckOut());
        reservation.setNumGuests(request.getNumGuests());
        reservation.setPriceTotal(request.getPriceTotal());
        reservation.setChannel(request.getChannel());
        reservation.setNotes(request.getNotes());
        
        Reservation updated = reservationRepository.save(reservation);
        return toResponse(updated);
    }

    /**
     * Cancel a reservation (soft delete - marks status as 'cancelled').
     */
    public ReservationResponse cancelReservation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found with ID: " + reservationId));
        
        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new IllegalArgumentException("Reservation is already cancelled");
        }
        
        if (reservation.getStatus().isTerminalState()) {
            throw new IllegalArgumentException("Cannot cancel a " + reservation.getStatus().getLabel() + " reservation");
        }
        
        reservation.setStatus(ReservationStatus.CANCELLED);
        Reservation updated = reservationRepository.save(reservation);
        return toResponse(updated);
    }

    /**
     * Update reservation status with validation.
     * Validates status transitions before allowing the change.
     */
    public ReservationResponse updateReservationStatus(Long reservationId, UpdateReservationStatusRequest request) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found with ID: " + reservationId));
        
        ReservationStatus newStatus = ReservationStatus.fromValue(request.getStatus());
        ReservationStatus currentStatus = reservation.getStatus();

        // Prevent reactivating a cancelled reservation into a conflicting date range.
        if (currentStatus == ReservationStatus.CANCELLED && requiresAvailabilityCheck(newStatus)) {
            validateSuiteAvailability(
                    reservation.getSuite().getSuiteId(),
                    reservation.getCheckIn(),
                    reservation.getCheckOut(),
                    reservationId);
        }
        
        reservation.setStatus(newStatus);
        Reservation updated = reservationRepository.save(reservation);
        return toResponse(updated);
    }

    /**
     * Get a single reservation by ID.
     */
    public ReservationResponse getReservation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found with ID: " + reservationId));
        return toResponse(reservation);
    }

    /**
     * List all reservations in a date range.
     */
    public List<ReservationResponse> listReservations(LocalDate from, LocalDate to) {
        return reservationRepository.findByCheckInBetween(from, to)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all reservations for a specific guest.
     */
    public List<ReservationResponse> getGuestReservations(Long guestId) {
        return reservationRepository.findByGuestGuestId(guestId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get overlapping reservations for a date range.
     * Used to check suite availability.
     */
    public List<Reservation> getOverlappingReservations(Long suiteId, LocalDate checkIn, LocalDate checkOut, Long excludeReservationId) {
        List<Reservation> overlapping = reservationRepository.findByCheckInBeforeAndCheckOutAfter(checkOut, checkIn);
        
        return overlapping.stream()
                .filter(r -> r.getSuite().getSuiteId().equals(suiteId))
                .filter(r -> r.getStatus() != ReservationStatus.CANCELLED)
                .filter(r -> excludeReservationId == null || !r.getReservationId().equals(excludeReservationId))
                .collect(Collectors.toList());
    }

    // ===== PRIVATE HELPER METHODS =====

    private Guest getOrCreateGuest(CreateReservationRequest request) {
        // If guestId is provided, use existing guest
        if (request.getGuestId() != null) {
            return guestRepository.findById(request.getGuestId())
                    .orElseThrow(() -> new IllegalArgumentException("Guest not found with ID: " + request.getGuestId()));
        }
        
        // Try to find guest by email
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            var existing = guestRepository.findByEmail(request.getEmail());
            if (existing.isPresent()) {
                return existing.get();
            }
        }
        
        // Create new guest
        Guest guest = new Guest();
        guest.setFirstName(request.getFirstName());
        guest.setLastName(request.getLastName());
        guest.setEmail(request.getEmail());
        guest.setPhone(request.getPhone());
        guest.setMarketingConsent(false);
        guest.setCreatedAt(LocalDateTime.now());
        
        // Set nationality if provided
        if (request.getNationalityCode() != null && !request.getNationalityCode().isBlank()) {
            Nationality nationality = nationalityRepository.findById(request.getNationalityCode())
                    .orElse(null);
            guest.setNationality(nationality);
        }
        
        return guestRepository.save(guest);
    }

    private void validateReservationDates(LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null || checkOut == null) {
            throw new IllegalArgumentException("Check-in and check-out dates are required");
        }
        if (checkIn.isAfter(checkOut) || checkIn.isEqual(checkOut)) {
            throw new IllegalArgumentException("Check-in date must be before check-out date");
        }
    }

    private void validateSuiteAvailability(Long suiteId, LocalDate checkIn, LocalDate checkOut, Long excludeReservationId) {
        List<Reservation> overlapping = getOverlappingReservations(suiteId, checkIn, checkOut, excludeReservationId);
        if (!overlapping.isEmpty()) {
            Suite suite = suiteRepository.findById(suiteId).orElse(null);
            String suiteName = suite != null ? suite.getSuiteName() : "Suite " + suiteId;
            throw new IllegalArgumentException(suiteName + " is not available for the requested dates");
        }
    }

    private void validateDuplicateReservation(Long suiteId, Long guestId, LocalDate checkIn, LocalDate checkOut) {
        boolean duplicateExists = reservationRepository
                .existsBySuiteSuiteIdAndGuestGuestIdAndCheckInAndCheckOutAndStatusNot(
                        suiteId,
                        guestId,
                        checkIn,
                        checkOut,
                        ReservationStatus.CANCELLED
                );

        if (duplicateExists) {
            throw new IllegalArgumentException("A reservation with the same guest, suite, and date range already exists");
        }
    }

    private boolean requiresAvailabilityCheck(ReservationStatus status) {
        return status == ReservationStatus.PENDING
                || status == ReservationStatus.CONFIRMED
                || status == ReservationStatus.CHECKED_IN;
    }

    private ReservationResponse toResponse(Reservation reservation) {
        boolean guestAnonymized = reservation.getGuest().getAnonymizedAt() != null;
        String guestName = reservation.getGuest().getFirstName() + " " + reservation.getGuest().getLastName();
        String guestDisplayName = guestAnonymized
            ? "Anonymous guest #" + reservation.getGuest().getGuestId()
            : guestName;

        return ReservationResponse.builder()
                .reservationId(reservation.getReservationId())
                .suiteId(reservation.getSuite().getSuiteId())
                .suiteName(reservation.getSuite().getSuiteName())
                .guestId(reservation.getGuest().getGuestId())
            .guestName(guestName)
            .guestDisplayName(guestDisplayName)
            .guestAnonymized(guestAnonymized)
            .email(guestAnonymized ? null : reservation.getGuest().getEmail())
            .phone(guestAnonymized ? null : reservation.getGuest().getPhone())
            .guestNotes(guestAnonymized ? null : reservation.getGuest().getNotes())
                .checkIn(reservation.getCheckIn())
                .checkOut(reservation.getCheckOut())
                .numGuests(reservation.getNumGuests())
                .priceTotal(reservation.getPriceTotal())
                .channel(reservation.getChannel())
                .notes(reservation.getNotes())
                .status(reservation.getStatus().getValue())
                .statusLabel(reservation.getStatus().getLabel())
                .statusColor(reservation.getStatus().getColor())
                .createdAt(reservation.getCreatedAt())
                .build();
    }
}
