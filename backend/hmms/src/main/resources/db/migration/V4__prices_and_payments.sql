-- Per-date prices of the suites, payment details the owner edits in the app, and payment
-- tracking for booking requests (accepted requests wait for payment before they are confirmed).

-- Price of one night in a suite on a date. A stay costs the sum of its nights; a stay with a
-- night without a price shows "price on request" on the booking page.
CREATE TABLE suite_rates (
  suite_id   BIGINT NOT NULL REFERENCES suites(suite_id) ON DELETE CASCADE,
  rate_date  DATE NOT NULL,
  price      NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  PRIMARY KEY (suite_id, rate_date)
);

-- Settings edited in the app (Settings page), e.g. payment.iban
CREATE TABLE app_settings (
  setting_key    TEXT PRIMARY KEY,
  setting_value  TEXT
);

-- An accepted request has status 'awaiting_payment' with a payment deadline; it becomes
-- 'confirmed' when the owner marks it as paid.
ALTER TABLE reservations
  ADD COLUMN payment_due_date DATE,
  ADD COLUMN paid_at TIMESTAMP;

ALTER TABLE reservations DROP CONSTRAINT chk_reservation_status;
ALTER TABLE reservations ADD CONSTRAINT chk_reservation_status CHECK (
  status IN ('pending', 'awaiting_payment', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')
);
