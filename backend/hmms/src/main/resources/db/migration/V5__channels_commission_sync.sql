-- Booking channels reduced to what matters: direct bookings (no commission) or an outside
-- platform; dated commission rates per platform; when booking.com last read a suite's calendar.

-- Bookings from the own website, by phone or at the door are all direct
UPDATE reservations SET channel = lower(trim(channel))
WHERE channel IS NOT NULL AND channel <> lower(trim(channel));
UPDATE reservations SET channel = 'direct'
WHERE channel IN ('website', 'phone', 'walk in', 'walk_in', 'walk-in', 'email');

-- Commission % a platform charges. A booking uses the rate that was valid on the day it was
-- booked, so a later rate change doesn't change older bookings. Channels without a row of
-- their own use 'other'; direct bookings have no commission.
CREATE TABLE platform_commission_rates (
  channel     TEXT NOT NULL,
  valid_from  DATE NOT NULL,
  rate        NUMERIC(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
  PRIMARY KEY (channel, valid_from)
);

-- Starting values for the owner to adjust in Settings (2000-01-01 = since the start)
INSERT INTO platform_commission_rates (channel, valid_from, rate) VALUES
  ('booking.com', DATE '2000-01-01', 15.00),
  ('airbnb', DATE '2000-01-01', 15.00),
  ('expedia', DATE '2000-01-01', 18.00),
  ('other', DATE '2000-01-01', 15.00);

-- Last time booking.com (or anyone with the link) downloaded the suite's availability feed
ALTER TABLE suites ADD COLUMN ical_export_read_at TIMESTAMP;
