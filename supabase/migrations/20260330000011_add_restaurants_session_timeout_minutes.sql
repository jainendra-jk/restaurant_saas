ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER NOT NULL DEFAULT 60
CHECK (session_timeout_minutes >= 0 AND session_timeout_minutes <= 240);
