package com.timorun.hmms.services;

import com.timorun.hmms.config.HotelSettings;
import com.timorun.hmms.dto.PublicPreferencesResponse;
import com.timorun.hmms.entities.Guest;
import com.timorun.hmms.mail.GuestMails;
import com.timorun.hmms.mail.MailService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Guest-facing communication preferences: opt out of marketing and request data deletion
 * through signed links, without an account.
 */
@Service
public class GuestPreferencesService {
    private final GuestService guestService;
    private final GuestLinkTokens tokens;
    private final MailService mailService;
    private final GuestMails guestMails;
    private final HotelSettings settings;

    public GuestPreferencesService(GuestService guestService, GuestLinkTokens tokens, MailService mailService,
                                   GuestMails guestMails, HotelSettings settings) {
        this.guestService = guestService;
        this.tokens = tokens;
        this.mailService = mailService;
        this.guestMails = guestMails;
        this.settings = settings;
    }

    /** Personal preferences link to include in messages to a guest. */
    public String preferencesLink(Long guestId) {
        return settings.publicUrl("/preferences/" + tokens.create(guestId, GuestLinkTokens.EMBEDDED_LINK_VALIDITY));
    }

    /**
     * Emails a preferences link if the address belongs to a guest. Always succeeds silently,
     * so the public page can't be used to find out which emails are guests.
     */
    public void sendPreferencesLink(String email) {
        guestService.findActiveGuestByEmail(email).ifPresent(guest -> {
            String link = settings.publicUrl("/preferences/" + tokens.create(guest.getGuestId(), GuestLinkTokens.MAGIC_LINK_VALIDITY));
            mailService.send(guestMails.preferencesLink(guest, link));
        });
    }

    public PublicPreferencesResponse getPreferences(String token) {
        return toResponse(guestFor(token));
    }

    @Transactional
    public PublicPreferencesResponse optOut(String token) {
        return toResponse(guestService.optOutOfMarketing(guestFor(token).getGuestId()));
    }

    @Transactional
    public PublicPreferencesResponse requestDeletion(String token) {
        Guest guest = guestFor(token);
        boolean alreadyRequested = guest.getDeletionRequestedAt() != null;
        Guest updated = guestService.requestDeletion(guest.getGuestId());
        if (!alreadyRequested) {
            mailService.send(guestMails.deletionRequestedForOwner(updated));
        }
        return toResponse(updated);
    }

    private Guest guestFor(String token) {
        Long guestId = tokens.verify(token)
                .orElseThrow(() -> new IllegalArgumentException("This link is invalid or has expired"));
        Guest guest = guestService.getGuestEntity(guestId);
        if (guest.getAnonymizedAt() != null) {
            throw new IllegalArgumentException("This link is invalid or has expired");
        }
        return guest;
    }

    private PublicPreferencesResponse toResponse(Guest guest) {
        return new PublicPreferencesResponse(
                guest.getFirstName(),
                Boolean.TRUE.equals(guest.getMarketingConsent()),
                guest.getDeletionRequestedAt() != null,
                settings.getHotelName());
    }
}
