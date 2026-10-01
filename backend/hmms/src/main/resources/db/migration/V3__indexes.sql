-- Indexes for the columns reservations and guests are queried on.
-- Postgres does not index foreign key columns automatically.

-- Date-range lists (reservation list, analytics) and today's arrivals/departures
CREATE INDEX idx_reservations_check_in ON reservations (check_in);
CREATE INDEX idx_reservations_check_out ON reservations (check_out);

-- Availability / overlap checks per suite
CREATE INDEX idx_reservations_suite_dates ON reservations (suite_id, check_in, check_out);

-- Reservations of a guest
CREATE INDEX idx_reservations_guest_id ON reservations (guest_id);

-- Status filters
CREATE INDEX idx_reservations_status ON reservations (status);

-- Guest lookups by email (case-insensitive) and duplicate-name checks
CREATE INDEX idx_guests_email_lower ON guests (lower(email));
CREATE INDEX idx_guests_name_lower ON guests (lower(first_name), lower(last_name));
