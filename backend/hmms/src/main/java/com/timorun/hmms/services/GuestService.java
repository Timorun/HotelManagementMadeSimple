package com.timorun.hmms.services;

import com.timorun.hmms.dto.GuestRequest;
import com.timorun.hmms.dto.GuestResponse;
import com.timorun.hmms.entities.Guest;
import com.timorun.hmms.entities.Nationality;
import com.timorun.hmms.repositories.GuestRepository;
import com.timorun.hmms.repositories.NationalityRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GuestService {
    private final GuestRepository guestRepository;
    private final NationalityRepository nationalityRepository;

    public GuestService(
            GuestRepository guestRepository,
            NationalityRepository nationalityRepository) {
        this.guestRepository = guestRepository;
        this.nationalityRepository = nationalityRepository;
    }

    /**
     * Create a new guest.
     */
    public GuestResponse createGuest(GuestRequest request) {
        validateGuestRequest(request);
        
        Guest guest = new Guest();
        guest.setFirstName(request.getFirstName());
        guest.setLastName(request.getLastName());
        guest.setEmail(request.getEmail());
        guest.setPhone(request.getPhone());
        guest.setNotes(request.getNotes());
        guest.setMarketingConsent(request.getMarketingConsent() != null ? request.getMarketingConsent() : false);
        guest.setCreatedAt(LocalDateTime.now());
        
        if (request.getNationalityCode() != null && !request.getNationalityCode().isBlank()) {
            Nationality nationality = nationalityRepository.findById(request.getNationalityCode())
                    .orElse(null);
            guest.setNationality(nationality);
        }
        
        Guest saved = guestRepository.save(guest);
        return toResponse(saved);
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
     * Search guests by last name.
     */
    public List<GuestResponse> searchByLastName(String lastName) {
        return guestRepository.findByLastNameIgnoreCase(lastName)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Find guest by email.
     */
    public GuestResponse findByEmail(String email) {
        Guest guest = guestRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Guest not found with email: " + email));
        return toResponse(guest);
    }

    /**
     * Update an existing guest.
     */
    public GuestResponse updateGuest(Long guestId, GuestRequest request) {
        validateGuestRequest(request);
        
        Guest guest = guestRepository.findById(guestId)
                .orElseThrow(() -> new IllegalArgumentException("Guest not found with ID: " + guestId));
        
        guest.setFirstName(request.getFirstName());
        guest.setLastName(request.getLastName());
        guest.setEmail(request.getEmail());
        guest.setPhone(request.getPhone());
        guest.setNotes(request.getNotes());
        guest.setMarketingConsent(request.getMarketingConsent() != null ? request.getMarketingConsent() : guest.getMarketingConsent());
        
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
        
        guest.setFirstName("[DELETED]");
        guest.setLastName("[DELETED]");
        guest.setEmail(null);
        guest.setPhone(null);
        guest.setNotes(null);
        guest.setNationality(null);
        guest.setAnonymizedAt(LocalDateTime.now());
        
        Guest updated = guestRepository.save(guest);
        return toResponse(updated);
    }

    // ===== PRIVATE HELPER METHODS =====

    private void validateGuestRequest(GuestRequest request) {
        if (request.getFirstName() == null || request.getFirstName().isBlank()) {
            throw new IllegalArgumentException("First name is required");
        }
        if (request.getLastName() == null || request.getLastName().isBlank()) {
            throw new IllegalArgumentException("Last name is required");
        }
    }

    private GuestResponse toResponse(Guest guest) {
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
                .build();
    }
}
