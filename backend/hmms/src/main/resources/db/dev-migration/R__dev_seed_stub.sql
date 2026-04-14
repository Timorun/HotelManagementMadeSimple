DO $$
BEGIN
    --If the guests table is empty, insert ssample data.
    --This script is only ran with spring boot dev profile.
	IF NOT EXISTS (SELECT 1 FROM guests LIMIT 1) THEN
		INSERT INTO guests (first_name, last_name, email, phone, nationality_code, marketing_consent) VALUES
		('Emma', 'Jansen', 'emma.jansen@example.com', '+31612345678', 'NL', true),
		('Lucas', 'Bakker', 'lucas.bakker@example.com', '+31687654321', 'NL', true),
		('Sofia', 'de Vries', 'sofia.devries@example.com', '+31698765432', 'NL', false),
		('Liam', 'van Dijk', 'liam.vandijk@example.com', '+31623456789', 'NL', true),
		('Mila', 'Peters', 'mila.peters@example.com', '+31634567890', 'NL', false),
		('Noah', 'Smit', 'noah.smit@example.com', '+31645678901', 'NL', true),
		('Hannah', 'Visser', 'hannah.visser@example.com', '+31656789012', 'NL', true),
		('Oliver', 'Hendriks', 'oliver.hendriks@example.com', '+31667890123', 'NL', false),
		('Anna', 'Schmidt', 'anna.schmidt@example.de', '+4915112345678', 'DE', true),
		('Max', 'Müller', 'max.mueller@example.de', '+4915187654321', 'DE', false),
		('Marie', 'Dupont', 'marie.dupont@example.fr', '+33612345678', 'FR', true),
		('Thomas', 'Martin', 'thomas.martin@example.fr', '+33687654321', 'FR', true),
		('Sophie', 'Dubois', 'sophie.dubois@example.be', '+32470123456', 'BE', false),
		('James', 'Smith', 'james.smith@example.co.uk', '+447700900123', 'GB', true),
		('Emily', 'Johnson', 'emily.johnson@example.com', '+12025550123', 'US', true);

		INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status) VALUES
		(1, 1, '2026-05-15', '2026-05-20', 2, 750.00, 'direct', 'checked_out'),
		(2, 2, '2026-05-18', '2026-05-22', 2, 800.00, 'booking.com', 'checked_out'),
		(3, 3, '2026-05-20', '2026-05-25', 3, 950.00, 'airbnb', 'checked_out');

		INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status) VALUES
		(4, 4, '2026-04-01', '2026-04-04', 2, 600.00, 'direct', 'checked_in'),
		(5, 5, '2026-04-02', '2026-04-04', 4, 800.00, 'booking.com', 'checked_in'),
		(1, 6, '2026-04-03', '2026-04-05', 2, 400.00, 'airbnb', 'checked_in');

		INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status) VALUES
		(2, 7, '2026-04-04', '2026-04-08', 2, 800.00, 'direct', 'confirmed'),
		(3, 8, '2026-04-04', '2026-04-07', 2, 600.00, 'booking.com', 'confirmed');

		INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status) VALUES
		(2, 9, '2026-04-01', '2026-04-04', 2, 600.00, 'airbnb', 'checked_in');

		INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status) VALUES
		(1, 10, '2026-04-10', '2026-04-15', 2, 1000.00, 'direct', 'confirmed'),
		(2, 11, '2026-04-12', '2026-04-17', 2, 1000.00, 'booking.com', 'confirmed'),
		(3, 12, '2026-04-15', '2026-04-20', 3, 1200.00, 'airbnb', 'confirmed'),
		(4, 13, '2026-04-18', '2026-04-22', 2, 800.00, 'direct', 'confirmed'),
		(5, 14, '2026-04-20', '2026-04-25', 4, 1500.00, 'booking.com', 'confirmed'),
		(3, 15, '2026-04-22', '2026-04-27', 2, 1000.00, 'airbnb', 'confirmed');

		INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status) VALUES
		(1, 1, '2026-04-25', '2026-04-30', 2, 1000.00, 'direct', 'cancelled'),
		(2, 2, '2026-04-28', '2026-05-02', 2, 1000.00, 'booking.com', 'cancelled');

		INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status) VALUES
		(1, 3, '2026-04-05', '2026-04-10', 2, 1000.00, 'direct', 'confirmed'),
		(2, 4, '2026-04-08', '2026-04-12', 2, 800.00, 'booking.com', 'confirmed'),
		(4, 5, '2026-04-25', '2026-04-30', 2, 1000.00, 'airbnb', 'confirmed'),
		(5, 6, '2026-04-27', '2026-05-01', 4, 1500.00, 'direct', 'confirmed');
	END IF;
END $$;