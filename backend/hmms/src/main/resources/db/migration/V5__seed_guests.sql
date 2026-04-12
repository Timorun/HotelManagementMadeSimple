-- Seed sample guests for development/demo
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
('Emily', 'Johnson', 'emily.johnson@example.com', '+12025550123', 'US', true)
ON CONFLICT DO NOTHING;
