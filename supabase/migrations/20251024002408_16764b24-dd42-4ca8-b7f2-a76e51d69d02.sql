-- Add cancelled_at column to clients table to track when a client was deactivated
ALTER TABLE clients ADD COLUMN cancelled_at timestamp with time zone DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN clients.cancelled_at IS 'Timestamp when the client was deactivated/cancelled. NULL means client is active or was never cancelled.';