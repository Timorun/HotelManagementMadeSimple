-- Update suites to match Carmen Suites
-- Update existing suites with actual Carmen Suites names and capacities
-- Preserving suite_id to maintain existing reservation references

UPDATE suites SET suite_name = 'Suite 0ºA', capacity = 3 WHERE suite_id = 1;
UPDATE suites SET suite_name = 'Suite 1ºA', capacity = 2 WHERE suite_id = 2;
UPDATE suites SET suite_name = 'Suite 1ºB', capacity = 3 WHERE suite_id = 3;
UPDATE suites SET suite_name = 'Suite 2ºA', capacity = 2 WHERE suite_id = 4;
UPDATE suites SET suite_name = 'Suite 2ºB', capacity = 3 WHERE suite_id = 5;

--Delete Suite 6 as Carmen Suites only has 5 suites
-- Delete existing reservations for suite_id 6 to avoid foreign key constraint issues before deleting the suite
DELETE from reservations where suite_id = 6;
DELETE FROM suites WHERE suite_id = 6;