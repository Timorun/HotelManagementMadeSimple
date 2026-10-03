-- One-time script: run it on a database created BEFORE October 2026, i.e. one that has
-- Flyway migrations V1 to V6 applied, right before deploying the version where those
-- migrations were merged into a single V1__schema.sql + V2__seed.sql.
--
-- What it does, all in one transaction (if anything fails, nothing changes):
--   1. Adds the schema that is new in the merged V1: suite details for the booking page
--      and the suite_photos table.
--   2. Rewrites Flyway's history so it matches the merged files: V3-V6 are now part of V1,
--      and V1/V2 get the checksums of the new files. Your data is not touched.
--
-- Run on the server, from the repository folder:
--   docker exec -i pg18 psql -U postgres -d postgres -v ON_ERROR_STOP=1 < backend/hmms/ops/realign-flyway-2026-10.sql
-- Then rebuild and restart the backend. A fresh (empty) database never needs this script.

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'suites' AND column_name = 'description_en') THEN
        RAISE EXCEPTION 'This script has already been applied to this database. Nothing was changed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version = '6' AND success) THEN
        RAISE EXCEPTION 'Expected Flyway migration V6 to be applied. This database does not need this script. Nothing was changed.';
    END IF;
END $$;

-- 1. Schema that the merged V1 has on top of the old V1-V6
ALTER TABLE suites
    ADD COLUMN description_en TEXT,
    ADD COLUMN description_es TEXT,
    ADD COLUMN size_m2 INT,
    ADD COLUMN amenities TEXT;

CREATE TABLE suite_photos (
  suite_id    BIGINT NOT NULL REFERENCES suites(suite_id) ON DELETE CASCADE,
  sort_order  INT NOT NULL,
  url         TEXT NOT NULL,
  PRIMARY KEY (suite_id, sort_order)
);

-- 2. Flyway history: V3-V6 are part of V1 now, and V1/V2 have new checksums
DELETE FROM flyway_schema_history WHERE version IN ('3', '4', '5', '6');
UPDATE flyway_schema_history SET checksum = -179189465 WHERE version = '1';
UPDATE flyway_schema_history SET checksum = -275701796 WHERE version = '2';

COMMIT;
