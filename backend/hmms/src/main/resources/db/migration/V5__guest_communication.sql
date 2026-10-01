-- Communication preferences and GDPR requests on guests
ALTER TABLE guests
    ADD COLUMN preferred_language TEXT,
    ADD COLUMN marketing_opt_out_at TIMESTAMP,
    ADD COLUMN deletion_requested_at TIMESTAMP;
