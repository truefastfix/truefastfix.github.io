-- Apply only to pre-existing databases without delivery_evidence.
-- New databases use assistant/schema.sql, which already includes this column.
ALTER TABLE inquiries ADD COLUMN delivery_evidence TEXT NOT NULL DEFAULT 'unconfirmed';
