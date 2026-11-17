CREATE TABLE IF NOT EXISTS booking_confirmation_emails (
 booking_id TEXT PRIMARY KEY REFERENCES bookings(id),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','review')),
 payload_json TEXT NOT NULL,
 idempotency_key TEXT NOT NULL UNIQUE,
 created_at INTEGER NOT NULL DEFAULT (unixepoch()),
 lease_until INTEGER NOT NULL DEFAULT 0,
 attempts INTEGER NOT NULL DEFAULT 0,
 provider_id TEXT,
 sent_at INTEGER,
 last_error TEXT
);
