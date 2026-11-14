CREATE TABLE IF NOT EXISTS retreat_capacity (
  room_id TEXT PRIMARY KEY,
  capacity INTEGER NOT NULL CHECK(capacity >= 0)
);
INSERT OR IGNORE INTO retreat_capacity VALUES ('private',5),('shared',10);
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES retreat_capacity(room_id),
  status TEXT NOT NULL CHECK(status IN ('held','processing','paid','cancelled')),
  expires_at INTEGER NOT NULL,
  base_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  deposit_cents INTEGER NOT NULL,
  balance_cents INTEGER NOT NULL,
  promo_code TEXT NOT NULL DEFAULT '',
  terms_url TEXT,
  terms_accepted_at INTEGER,
  paypal_order_id TEXT UNIQUE,
  paypal_capture_id TEXT UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  paid_at INTEGER
);
CREATE INDEX IF NOT EXISTS bookings_capacity ON bookings(room_id,status,expires_at);
