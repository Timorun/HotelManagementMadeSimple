--Room/suite table
suite (
  id
  name
  capacity
  active
)

--Guests table
guest (
  id
  first_name
  last_name
  email
  phone
  nationality
  notes
  marketing_consent --GDPR
  created_at        --GDPR
)


--Reservations table
reservation (
  id
  suite_id
  guest_id
  check_in
  check_out
  num_guests
  price_total
  channel       --Reservation channel (ie Booking.com, Airbnb, direct)
  status
  created_at
)

--Login users
user (
  id
  name
  email
  password_hash
)

--Operating costs (add later)
-- operating_costs (
--     name,
--     month
-- )
