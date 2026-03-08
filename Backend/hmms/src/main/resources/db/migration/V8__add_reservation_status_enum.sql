-- V8__add_reservation_status_enum.sql
-- Migration to convert reservation.status from VARCHAR to ENUM with new status values
-- PostgreSQL syntax

-- Create ENUM type if it doesn't exist
CREATE TYPE reservation_status_enum AS ENUM(
    'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'
);

-- Map any 'completed' status to 'checked_out' before conversion
UPDATE reservations SET status = 'checked_out' WHERE status = 'completed';

-- Ensure no invalid status values exist
UPDATE reservations SET status = 'pending' 
WHERE status NOT IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');

-- Convert column to use the ENUM type
ALTER TABLE reservations 
ALTER COLUMN status TYPE reservation_status_enum USING status::reservation_status_enum,
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN status SET DEFAULT 'pending'::reservation_status_enum;

