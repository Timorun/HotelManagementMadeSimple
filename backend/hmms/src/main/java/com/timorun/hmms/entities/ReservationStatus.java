package com.timorun.hmms.entities;

import lombok.Getter;

/**
 * Enum representing the lifecycle states of a reservation.
 *
 * Backend policy: status corrections are always allowed.
 * Frontend should surface warnings for unusual transitions.
 */
@Getter
public enum ReservationStatus {
    PENDING("pending", "Pending Confirmation", "#F39C12"),
    CONFIRMED("confirmed", "Confirmed", "#27AE60"),
    CHECKED_IN("checked_in", "Checked In", "#3498DB"),
    CHECKED_OUT("checked_out", "Checked Out", "#95A5A6"),
    CANCELLED("cancelled", "Cancelled", "#E74C3C"),
    NO_SHOW("no_show", "No Show", "#E67E22");

    private final String value;
    private final String label;
    private final String color;

    ReservationStatus(String value, String label, String color) {
        this.value = value;
        this.label = label;
        this.color = color;
    }

    /**
     * Convert from string value to enum.
     */
    public static ReservationStatus fromValue(String value) {
        if (value == null) {
            return PENDING;
        }
        for (ReservationStatus status : ReservationStatus.values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid reservation status: " + value);
    }

    /**
     * Get user-friendly reason why transition is not allowed.
     */
    public String getTransitionError(ReservationStatus newStatus) {
        if (this == newStatus) {
            return "Status is already " + this.label;
        }

        return "Status transitions are unrestricted";
    }

    /**
     * Check if this is a final/terminal state.
     */
    public boolean isTerminalState() {
        return this == CHECKED_OUT || this == NO_SHOW;
    }
}
