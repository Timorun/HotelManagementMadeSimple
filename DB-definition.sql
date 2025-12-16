--Room/suite table
suite (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  capacity        INT NOT NULL,
  active          BOOLEAN DEFAULT true
)


--Guests table
guest (
  id                  SERIAL PRIMARY KEY,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  email               TEXT,
  phone               TEXT,
  nationality         TEXT,
  notes               TEXT,
  marketing_consent   BOOLEAN DEFAULT false,    --GDPR
  created_at          TIMESTAMP DEFAULT now(),  --GDPR
  anonymized_at       TIMESTAMP                 --future GDPR delete
)

reservation (
  id              SERIAL PRIMARY KEY,
  suite_id        INT REFERENCES suite(id),
  guest_id        INT REFERENCES guest(id),
  check_in        DATE NOT NULL,
  check_out       DATE NOT NULL,
  num_guests      INT NOT NULL,
  price_total     NUMERIC(10,2),
  channel         TEXT,     -- Reservation channel (ie Booking.com, Airbnb, direct)
  status          TEXT,     -- confirmed | completed | cancelled | no_show
  created_at      TIMESTAMP DEFAULT now()
)

--Login users
user (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL
)

--Operating costs (add later)
-- operating_costs (
--     name,
--     month
-- )
