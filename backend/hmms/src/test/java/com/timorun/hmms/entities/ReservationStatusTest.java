package com.timorun.hmms.entities;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReservationStatusTest {

    // @Test
    // void statusCanTransitionToAnyDifferentStatus() {
    //     assertTrue(ReservationStatus.CANCELLED.canTransitionTo(ReservationStatus.PENDING));
    //     assertTrue(ReservationStatus.CANCELLED.canTransitionTo(ReservationStatus.CONFIRMED));
    //     assertTrue(ReservationStatus.CANCELLED.canTransitionTo(ReservationStatus.CHECKED_IN));
    //     assertTrue(ReservationStatus.CANCELLED.canTransitionTo(ReservationStatus.CHECKED_OUT));
    //     assertTrue(ReservationStatus.CANCELLED.canTransitionTo(ReservationStatus.NO_SHOW));
    //     assertTrue(ReservationStatus.CHECKED_OUT.canTransitionTo(ReservationStatus.PENDING));
    //     assertTrue(ReservationStatus.NO_SHOW.canTransitionTo(ReservationStatus.CONFIRMED));
    //     assertFalse(ReservationStatus.CANCELLED.canTransitionTo(ReservationStatus.CANCELLED));
    // }

    // @Test
    // void terminalStateHelperExcludesCancelled() {
    //     assertFalse(ReservationStatus.CANCELLED.isTerminalState());
    //     assertTrue(ReservationStatus.CHECKED_OUT.isTerminalState());
    //     assertTrue(ReservationStatus.NO_SHOW.isTerminalState());
    // }
}
