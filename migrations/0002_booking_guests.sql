CREATE TABLE IF NOT EXISTS booking_guests (
  booking_id TEXT PRIMARY KEY REFERENCES bookings(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL
);
