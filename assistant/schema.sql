CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  session_hash TEXT NOT NULL,
  request_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('project','support')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  brief TEXT NOT NULL,
  conversation TEXT NOT NULL,
  delivery_status TEXT NOT NULL CHECK(delivery_status IN ('saved','sending','accepted','rejected','unknown')),
  UNIQUE(session_hash, request_id)
);
CREATE INDEX IF NOT EXISTS inquiry_expiry ON inquiries(expires_at);
