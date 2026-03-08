-- Seed sample reservations for development/demo
-- Using date ranges around current date (March 2026) for realistic testing

-- Past reservations (completed)
INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status) VALUES
(1, 1, '2026-02-15', '2026-02-20', 2, 750.00, 'direct', 'completed'),
(2, 2, '2026-02-18', '2026-02-22', 2, 800.00, 'booking.com', 'completed'),
(3, 3, '2026-02-20', '2026-02-25', 3, 950.00, 'airbnb', 'completed');

-- Current/recent reservations (checked in or departing soon)
INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status) VALUES
(4, 4, '2026-03-01', '2026-03-04', 2, 600.00, 'direct', 'checked_in'),
(5, 5, '2026-03-02', '2026-03-04', 4, 800.00, 'booking.com', 'checked_in'),
(1, 6, '2026-03-03', '2026-03-05', 2, 400.00, 'airbnb', 'checked_in');

-- Arriving today (March 4, 2026)
INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status) VALUES
(2, 7, '2026-03-04', '2026-03-08', 2, 800.00, 'direct', 'confirmed'),
(3, 8, '2026-03-04', '2026-03-07', 2, 600.00, 'booking.com', 'confirmed');

-- Departing today (March 4, 2026)
INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status) VALUES
(6, 9, '2026-03-01', '2026-03-04', 2, 600.00, 'airbnb', 'checked_in');

-- Future reservations (confirmed)
INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status) VALUES
(1, 10, '2026-03-10', '2026-03-15', 2, 1000.00, 'direct', 'confirmed'),
(2, 11, '2026-03-12', '2026-03-17', 2, 1000.00, 'booking.com', 'confirmed'),
(3, 12, '2026-03-15', '2026-03-20', 3, 1200.00, 'airbnb', 'confirmed'),
(4, 13, '2026-03-18', '2026-03-22', 2, 800.00, 'direct', 'confirmed'),
(5, 14, '2026-03-20', '2026-03-25', 4, 1500.00, 'booking.com', 'confirmed'),
(6, 15, '2026-03-22', '2026-03-27', 2, 1000.00, 'airbnb', 'confirmed');

-- Some cancelled reservations for reference
INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status) VALUES
(1, 1, '2026-03-25', '2026-03-30', 2, 1000.00, 'direct', 'cancelled'),
(2, 2, '2026-03-28', '2026-04-02', 2, 1000.00, 'booking.com', 'cancelled');

-- Reservations spanning the whole month for analytics
INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status) VALUES
(1, 3, '2026-03-05', '2026-03-10', 2, 1000.00, 'direct', 'confirmed'),
(2, 4, '2026-03-08', '2026-03-12', 2, 800.00, 'booking.com', 'confirmed'),
(4, 5, '2026-03-25', '2026-03-30', 2, 1000.00, 'airbnb', 'confirmed'),
(5, 6, '2026-03-27', '2026-04-01', 4, 1500.00, 'direct', 'confirmed');

-- ON CONFLICT DO NOTHING handles re-running the migration
