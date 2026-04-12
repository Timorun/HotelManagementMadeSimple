package com.timorun.hmms.entities;

import lombok.Getter;

/**
 * Enum representing the lifecycle states of a reservation.
 * 
 * Status transitions:
 * - PENDING -> CONFIRMED or CANCELLED
 * - CONFIRMED -> CHECKED_IN or CANCELLED
 * - CHECKED_IN -> CHECKED_OUT or CANCELLED
 * - CHECKED_OUT -> (terminal state)
 * - CANCELLED -> (terminal state)
 * - NO_SHOW -> (terminal state)
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
     * Check if this status can transition to another status.
     */
    public boolean canTransitionTo(ReservationStatus newStatus) {
        if (this == newStatus) {
            return false; // Same status, no transition needed
        }

        return switch (this) {
            case PENDING -> newStatus == CONFIRMED || newStatus == CANCELLED;
            case CONFIRMED -> newStatus == CHECKED_IN || newStatus == CANCELLED;
            case CHECKED_IN -> newStatus == CHECKED_OUT || newStatus == CANCELLED;
            case CHECKED_OUT -> false; // Terminal state
            case CANCELLED -> false; // Terminal state
            case NO_SHOW -> false; // Terminal state
        };
    }

    /**
     * Get user-friendly reason why transition is not allowed.
     */
    public String getTransitionError(ReservationStatus newStatus) {
        if (this == newStatus) {
            return "Status is already " + this.label;
        }

        return switch (this) {
            case CHECKED_OUT -> "Cannot change status of a checked-out reservation";
            case CANCELLED -> "Cannot change status of a cancelled reservation";
            case NO_SHOW -> "Cannot change status of a no-show reservation";
            default -> "Invalid status transition from " + this.label + " to " + newStatus.getLabel();
        };
    }

    /**
     * Check if this is a final/terminal state.
     */
    public boolean isTerminalState() {
        return this == CHECKED_OUT || this == CANCELLED || this == NO_SHOW;
    }
}
