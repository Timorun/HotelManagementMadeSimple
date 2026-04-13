-- V8__normalize_reservation_status_enum.sql
-- Normalize reservation.status and set a defautlt value to 'pending' for any existing records with null or invalid status values
-- PostgreSQL syntax


-- Ensure column is VARCHAR (in case of previous enum or other type)
ALTER TABLE reservations 
ALTER COLUMN status TYPE character varying(50);

-- Map any 'completed' status to 'checked_out'
UPDATE reservations SET status = 'checked_out' WHERE status = 'completed';

-- Ensure no invalid status values exist
UPDATE reservations SET status = 'pending'
WHERE status IS NULL OR status NOT IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');

-- Set NOT NULL and default constraint for VARCHAR
ALTER TABLE reservations 
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN status SET DEFAULT 'pending';

