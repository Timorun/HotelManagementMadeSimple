-- Dev-only sample data (loaded by the dev profile, see application-dev.yml).
-- Dates are relative to CURRENT_DATE so the Today, Calendar and Reservations views
-- always have data around "now". Only runs when the guests table is empty.
DO $$
DECLARE
    d DATE := CURRENT_DATE;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM guests LIMIT 1) THEN
        INSERT INTO guests (guest_id, first_name, last_name, email, phone, nationality_code, marketing_consent, notes) OVERRIDING SYSTEM VALUE VALUES
        (1, 'Emma', 'Jansen', 'emma.jansen@example.com', '+31612345678', 'NL', true, 'Prefers ground floor'),
        (2, 'Lucas', 'Bakker', 'lucas.bakker@example.com', '+31687654321', 'NL', true, NULL),
        (3, 'Sofia', 'de Vries', 'sofia.devries@example.com', '+31698765432', 'NL', false, NULL),
        (4, 'María', 'García López', 'maria.garcia@example.es', '+34612345678', 'ES', true, 'Allergic to feathers'),
        (5, 'José Luis', 'Fernández Martín', 'joseluis.fernandez@example.es', '+34687654321', 'ES', false, NULL),
        (6, 'Noah', 'Smit', 'noah.smit@example.com', '+31645678901', 'NL', true, NULL),
        (7, 'Hannah', 'Visser', 'hannah.visser@example.com', '+31656789012', 'NL', true, NULL),
        (8, 'Anna', 'Schmidt', 'anna.schmidt@example.de', '+4915112345678', 'DE', true, NULL),
        (9, 'Max', 'Müller', 'max.mueller@example.de', '+4915187654321', 'DE', false, NULL),
        (10, 'Marie', 'Dupont', 'marie.dupont@example.fr', '+33612345678', 'FR', true, NULL),
        (11, 'Thomas', 'Martin', 'thomas.martin@example.fr', '+33687654321', 'FR', true, NULL),
        (12, 'Sophie', 'Dubois', 'sophie.dubois@example.be', '+32470123456', 'BE', false, NULL),
        (13, 'James', 'Smith', 'james.smith@example.co.uk', '+447911123456', 'GB', true, NULL),
        (14, 'Emily', 'Johnson', 'emily.johnson@example.com', '+12025550123', 'US', true, NULL),
        (15, 'Carmen', 'Ruiz Pérez', 'carmen.ruiz@example.es', '+34655443322', 'ES', true, NULL);

        PERFORM setval(pg_get_serial_sequence('guests', 'guest_id'), (SELECT MAX(guest_id) FROM guests));

        INSERT INTO reservations (suite_id, guest_id, check_in, check_out, num_guests, price_total, channel, status, notes) VALUES
        -- Past stays
        (1, 1, d - 30, d - 25, 2, 750.00, 'direct', 'checked_out', NULL),
        (2, 2, d - 28, d - 24, 2, 800.00, 'booking.com', 'checked_out', NULL),
        (3, 3, d - 26, d - 21, 3, 950.00, 'airbnb', 'checked_out', NULL),
        (4, 8, d - 20, d - 17, 2, 600.00, 'direct', 'checked_out', NULL),
        (5, 9, d - 18, d - 14, 3, 760.00, 'booking.com', 'no_show', NULL),
        (1, 10, d - 12, d - 8, 2, 640.00, 'booking.com', 'checked_out', NULL),
        (2, 11, d - 10, d - 7, 2, 450.00, 'direct', 'cancelled', 'Cancelled by phone'),
        -- In house: leaving today, staying on, arriving today
        (1, 4, d - 3, d, 2, 480.00, 'direct', 'checked_in', 'Late checkout requested'),
        (2, 5, d - 2, d + 2, 2, 640.00, 'booking.com', 'checked_in', NULL),
        (3, 6, d - 1, d + 3, 3, 720.00, 'airbnb', 'confirmed', NULL),
        (1, 7, d, d + 4, 2, 600.00, 'booking.com', 'confirmed', 'Arrives around 22:00'),
        (4, 12, d, d + 2, 2, 300.00, 'direct', 'confirmed', NULL),
        (5, 13, d - 4, d, 3, 620.00, 'direct', 'confirmed', NULL),
        -- Upcoming
        (4, 14, d + 3, d + 7, 2, 640.00, 'direct', 'confirmed', NULL),
        (5, 15, d + 5, d + 9, 3, 820.00, 'booking.com', 'confirmed', NULL),
        (2, 1, d + 8, d + 12, 2, 700.00, 'direct', 'pending', NULL),
        (3, 2, d + 10, d + 14, 2, 680.00, 'airbnb', 'confirmed', NULL),
        (1, 3, d + 15, d + 20, 2, 820.00, 'booking.com', 'confirmed', NULL),
        (4, 10, d + 18, d + 21, 2, 450.00, 'direct', 'confirmed', NULL),
        (5, 11, d + 22, d + 27, 3, 900.00, 'booking.com', 'confirmed', NULL),
        (2, 8, d + 25, d + 28, 2, 480.00, 'direct', 'confirmed', NULL);
    END IF;
END $$;
