package com.timorun.hmms.exceptions;

import lombok.Getter;

/**
 * Thrown when the guest details in a request clash with an existing guest
 * (same email with a different name, or the exact same name).
 * Mapped to HTTP 409 so the UI can offer to use the existing guest instead.
 */
@Getter
public class GuestConflictException extends RuntimeException {
    private final Long existingGuestId;
    private final String existingGuestName;

    public GuestConflictException(String message, Long existingGuestId, String existingGuestName) {
        super(message);
        this.existingGuestId = existingGuestId;
        this.existingGuestName = existingGuestName;
    }
}
