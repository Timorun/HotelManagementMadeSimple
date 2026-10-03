package com.timorun.hmms.dto;

import java.util.List;

/**
 * What an import did (or would do, for a dry run) per row.
 */
public record BookingImportResult(boolean dryRun, int updated, int created, int skipped, List<RowResult> rows) {

    public enum Action { UPDATE, CREATE, SKIP }

    public record RowResult(int index, String bookingNumber, Action action, Long reservationId, String message) {
    }
}
