package com.timorun.hmms.services;

import com.timorun.hmms.dto.GuestRequest;
import com.timorun.hmms.dto.GuestResponse;
import com.timorun.hmms.entities.Guest;
import com.timorun.hmms.exceptions.GuestConflictException;
import com.timorun.hmms.util.NameUtils;
import com.timorun.hmms.entities.Nationality;
import com.timorun.hmms.repositories.GuestRepository;
import com.timorun.hmms.repositories.NationalityRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class GuestService {
    private final GuestRepository guestRepository;
    private final NationalityRepository nationalityRepository;
    private final PhoneNormalizer phoneNormalizer;

    public GuestService(
            GuestRepository guestRepository,
            NationalityRepository nationalityRepository,
            PhoneNormalizer phoneNormalizer) {
        this.guestRepository = guestRepository;
        this.nationalityRepository = nationalityRepository;
        this.phoneNormalizer = phoneNormalizer;
    }

    /**
     * Create a new guest.
     */
    public GuestResponse createGuest(GuestRequest request) {
        return toResponse(createGuestEntity(request));
    }

    /**
     * Create and save a new guest, applying the same normalization and duplicate checks
     * whether the guest is created on its own or inline while creating a reservation.
     */
    public Guest createGuestEntity(GuestRequest request) {
        return createGuestEntity(request, true);
    }

    /**
     * @param checkDuplicateName false to allow a guest with the same name as an existing one
     *                           (used for public booking requests, where we can't ask the guest)
     */
    public Guest createGuestEntity(GuestRequest request, boolean checkDuplicateName) {
        validateGuestRequest(request);
        String normalizedFirstName = NameUtils.normalize(request.getFirstName());
        String normalizedLastName = NameUtils.normalize(request.getLastName());
        if (checkDuplicateName) {
            validateDuplicateGuestName(normalizedFirstName, normalizedLastName, null);
        }
        
        Guest guest = new Guest();
        guest.setFirstName(normalizedFirstName);
        guest.setLastName(normalizedLastName);
        guest.setEmail(NameUtils.normalizeEmail(request.getEmail()));
        guest.setPhone(phoneNormalizer.normalize(request.getPhone()));
        guest.setNotes(request.getNotes());
        guest.setMarketingConsent(request.getMarketingConsent() != null ? request.getMarketingConsent() : false);
        guest.setPreferredLanguage(normalizeLanguage(request.getPreferredLanguage()));
        guest.setCreatedAt(LocalDateTime.now());
        
        if (request.getNationalityCode() != null && !request.getNationalityCode().isBlank()) {
            Nationality nationality = nationalityRepository.findById(request.getNationalityCode())
                    .orElse(null);
            guest.setNationality(nationality);
        }
        
        return guestRepository.save(guest);
    }

    /**
     * Find a non-anonymized guest by email (case-insensitive).
     */
    public Optional<Guest> findActiveGuestByEmail(String email) {
        String normalizedEmail = NameUtils.normalizeEmail(email);
        if (normalizedEmail == null) {
            return Optional.empty();
        }
        return guestRepository.findByEmailIgnoreCaseAndAnonymizedAtIsNull(normalizedEmail)
                .stream()
                .findFirst();
    }

    /**
     * True when the given first/last name refer to the same person as the guest,
     * ignoring case, accents and extra whitespace.
     */
    public static boolean hasSameName(Guest guest, String firstName, String lastName) {
        return NameUtils.fold(NameUtils.normalize(guest.getFirstName())).equals(NameUtils.fold(NameUtils.normalize(firstName)))
                && NameUtils.fold(NameUtils.normalize(guest.getLastName())).equals(NameUtils.fold(NameUtils.normalize(lastName)));
    }

    public static String fullName(Guest guest) {
        return guest.getFirstName() + " " + guest.getLastName();
    }

    /**
     * Get a single guest by ID.
     */
    public GuestResponse getGuest(Long guestId) {
        Guest guest = guestRepository.findById(guestId)
                .orElseThrow(() -> new IllegalArgumentException("Guest not found with ID: " + guestId));
        return toResponse(guest);
    }

    /**
     * Get all guests.
     */
    public List<GuestResponse> getAllGuests() {
        return guestRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Search guests by name. Every word in the query must appear somewhere in the full name,
     * so "maria garcia lopez" and "garcia lopez" both find "María" "García López".
     */
    public List<GuestResponse> searchByName(String query) {
        List<String> tokens = NameUtils.searchTokens(query);
        if (tokens.isEmpty()) {
            return List.of();
        }

        return guestRepository
                .findByAnonymizedAtIsNull()
                .stream()
                .filter(guest -> {
                    String fullName = NameUtils.fold(fullName(guest));
                    return tokens.stream().allMatch(fullName::contains);
                })
                .sorted(Comparator
                    .comparing(Guest::getLastName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                    .thenComparing(Guest::getFirstName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Find guest by email.
     */
    public GuestResponse findByEmail(String email) {
        Guest guest = findActiveGuestByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Guest not found with email: " + email));
        return toResponse(guest);
    }

    /**
     * Update an existing guest.
     */
    public GuestResponse updateGuest(Long guestId, GuestRequest request) {
        validateGuestRequest(request);
        String normalizedFirstName = NameUtils.normalize(request.getFirstName());
        String normalizedLastName = NameUtils.normalize(request.getLastName());
        validateDuplicateGuestName(normalizedFirstName, normalizedLastName, guestId);
        
        Guest guest = guestRepository.findById(guestId)
                .orElseThrow(() -> new IllegalArgumentException("Guest not found with ID: " + guestId));
        
        guest.setFirstName(normalizedFirstName);
        guest.setLastName(normalizedLastName);
        guest.setEmail(NameUtils.normalizeEmail(request.getEmail()));
        guest.setPhone(phoneNormalizer.normalize(request.getPhone()));
        guest.setNotes(request.getNotes());
        Boolean previousConsent = guest.getMarketingConsent();
        guest.setMarketingConsent(request.getMarketingConsent() != null ? request.getMarketingConsent() : previousConsent);
        if (Boolean.TRUE.equals(guest.getMarketingConsent()) && !Boolean.TRUE.equals(previousConsent)) {
            // Consent given again (e.g. confirmed in person): clear the earlier opt-out
            guest.setMarketingOptOutAt(null);
        }
        if (request.getPreferredLanguage() != null) {
            guest.setPreferredLanguage(normalizeLanguage(request.getPreferredLanguage()));
        }
        
        if (request.getNationalityCode() != null && !request.getNationalityCode().isBlank()) {
            Nationality nationality = nationalityRepository.findById(request.getNationalityCode())
                    .orElse(null);
            guest.setNationality(nationality);
        } else {
            guest.setNationality(null);
        }
        
        Guest updated = guestRepository.save(guest);
        return toResponse(updated);
    }

    /**
     * Anonymize a guest (GDPR delete).
     * Keeps the record but removes personal data.
     */
    public GuestResponse anonymizeGuest(Long guestId) {
        Guest guest = guestRepository.findById(guestId)
                .orElseThrow(() -> new IllegalArgumentException("Guest not found with ID: " + guestId));
        
        guest.setFirstName("Anonymized");
        guest.setLastName("Guest");
        guest.setEmail(null);
        guest.setPhone(null);
        guest.setNotes(null);
        guest.setMarketingConsent(false);
        guest.setPreferredLanguage(null);
        guest.setAnonymizedAt(LocalDateTime.now());
        
        Guest updated = guestRepository.save(guest);
        return toResponse(updated);
    }

    /**
     * Guest opted out of marketing through their preferences link.
     */
    public Guest optOutOfMarketing(Long guestId) {
        Guest guest = guestRepository.findById(guestId)
                .orElseThrow(() -> new IllegalArgumentException("Guest not found with ID: " + guestId));
        guest.setMarketingConsent(false);
        if (guest.getMarketingOptOutAt() == null) {
            guest.setMarketingOptOutAt(LocalDateTime.now());
        }
        return guestRepository.save(guest);
    }

    /**
     * Guest asked for their personal data to be deleted. The owner confirms by anonymizing.
     */
    public Guest requestDeletion(Long guestId) {
        Guest guest = guestRepository.findById(guestId)
                .orElseThrow(() -> new IllegalArgumentException("Guest not found with ID: " + guestId));
        guest.setMarketingConsent(false);
        if (guest.getMarketingOptOutAt() == null) {
            guest.setMarketingOptOutAt(LocalDateTime.now());
        }
        if (guest.getDeletionRequestedAt() == null) {
            guest.setDeletionRequestedAt(LocalDateTime.now());
        }
        return guestRepository.save(guest);
    }

    public Guest getGuestEntity(Long guestId) {
        return guestRepository.findById(guestId)
                .orElseThrow(() -> new IllegalArgumentException("Guest not found with ID: " + guestId));
    }

    // ===== PRIVATE HELPER METHODS =====

    private static String normalizeLanguage(String language) {
        if (language == null || language.isBlank()) {
            return null;
        }
        String normalized = language.trim().toLowerCase();
        return normalized.startsWith("es") ? "es" : "en";
    }

    private void validateGuestRequest(GuestRequest request) {
        if (request.getFirstName() == null || request.getFirstName().isBlank()) {
            throw new IllegalArgumentException("First name is required");
        }
        if (request.getLastName() == null || request.getLastName().isBlank()) {
            throw new IllegalArgumentException("Last name is required");
        }
    }

    private void validateDuplicateGuestName(String firstName, String lastName, Long excludeGuestId) {
        List<Guest> duplicates = guestRepository
                .findByFirstNameIgnoreCaseAndLastNameIgnoreCaseAndAnonymizedAtIsNull(firstName, lastName);

        duplicates.stream()
                .filter((guest) -> excludeGuestId == null || !guest.getGuestId().equals(excludeGuestId))
                .findFirst()
                .ifPresent((guest) -> {
                    throw new GuestConflictException(
                            "A guest named " + fullName(guest) + " already exists",
                            guest.getGuestId(),
                            fullName(guest));
                });
    }

    public GuestResponse toResponse(Guest guest) {
        boolean anonymized = guest.getAnonymizedAt() != null;
        return GuestResponse.builder()
                .guestId(guest.getGuestId())
                .firstName(guest.getFirstName())
                .lastName(guest.getLastName())
                .email(guest.getEmail())
                .phone(guest.getPhone())
                .nationalityCode(guest.getNationality() != null ? guest.getNationality().getNationalityCode() : null)
                .nationalityName(guest.getNationality() != null ? guest.getNationality().getName() : null)
                .notes(guest.getNotes())
                .marketingConsent(guest.getMarketingConsent())
                .createdAt(guest.getCreatedAt())
                .anonymizedAt(guest.getAnonymizedAt())
                .anonymized(anonymized)
                .reservationCount(guest.getReservations() != null ? guest.getReservations().size() : 0)
                .preferredLanguage(guest.getPreferredLanguage())
                .marketingOptOutAt(guest.getMarketingOptOutAt())
                .deletionRequestedAt(guest.getDeletionRequestedAt())
                .build();
    }
}
