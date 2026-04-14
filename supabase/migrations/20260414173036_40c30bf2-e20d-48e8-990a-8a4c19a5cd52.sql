ALTER TABLE client_payments ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE salaries ADD COLUMN IF NOT EXISTS paid_at timestamptz;