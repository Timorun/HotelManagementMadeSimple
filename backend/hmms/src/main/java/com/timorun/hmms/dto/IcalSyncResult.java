package com.timorun.hmms.dto;

/**
 * Outcome of importing one suite's booking.com calendar.
 */
public record IcalSyncResult(Long suiteId, String suiteName, int created, int updated, int cancelled, int conflicts, String error) {
}
