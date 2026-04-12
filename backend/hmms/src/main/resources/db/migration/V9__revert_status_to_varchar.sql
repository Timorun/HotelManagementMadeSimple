-- V9__revert_status_to_varchar.sql
-- Revert status column to VARCHAR to work with JPA converter
-- The JPA converter will handle enum serialization/deserialization

-- First, remove the default constraint that depends on the ENUM type
ALTER TABLE reservations 
ALTER COLUMN status DROP DEFAULT;

-- Alter column back to VARCHAR
ALTER TABLE reservations 
ALTER COLUMN status TYPE character varying(50);

-- Set default to the string value
ALTER TABLE reservations 
ALTER COLUMN status SET DEFAULT 'pending';

-- Drop the ENUM type
DROP TYPE IF EXISTS reservation_status_enum;
