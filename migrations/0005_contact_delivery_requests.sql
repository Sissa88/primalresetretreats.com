CREATE TABLE IF NOT EXISTS contact_delivery_requests (
 id TEXT PRIMARY KEY,
 fingerprint TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 created_at INTEGER NOT NULL DEFAULT (unixepoch()),
 updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
