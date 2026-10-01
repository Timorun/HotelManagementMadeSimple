-- Booking.com calendar sync (iCal) and booking export import

-- Per suite: booking.com iCal export URL to import from, and a secret token for our own iCal feed
ALTER TABLE suites
    ADD COLUMN booking_ical_url TEXT,
    ADD COLUMN ical_export_token TEXT,
    ADD COLUMN ical_last_sync_at TIMESTAMP,
    ADD COLUMN ical_last_sync_error TEXT;

UPDATE suites SET ical_export_token = md5(random()::text || clock_timestamp()::text || suite_id::text);
ALTER TABLE suites ALTER COLUMN ical_export_token SET NOT NULL;
CREATE UNIQUE INDEX uq_suites_ical_export_token ON suites (ical_export_token);

-- Per reservation: UID of the imported iCal event, booking.com reservation number,
-- and a flag when an imported stay overlaps another reservation
ALTER TABLE reservations
    ADD COLUMN external_uid TEXT,
    ADD COLUMN external_ref TEXT,
    ADD COLUMN sync_conflict BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX uq_reservations_external_uid ON reservations (external_uid);
CREATE INDEX idx_reservations_external_ref ON reservations (external_ref);
