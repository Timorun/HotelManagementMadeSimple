-- Add audit fields to reservations and active flag to suites
ALTER TABLE suites ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS updated_by BIGINT;

-- Add foreign key for audit trail
ALTER TABLE reservations ADD CONSTRAINT fk_reservations_updated_by 
FOREIGN KEY (updated_by) REFERENCES app_users(user_id);
