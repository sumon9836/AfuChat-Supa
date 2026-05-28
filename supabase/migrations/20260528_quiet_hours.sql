-- Add per-user quiet hours window to notification_preferences.
-- quiet_hours_start / quiet_hours_end are stored as TIME in 24h format (e.g. '22:00', '08:00').
-- quiet_hours_timezone stores the IANA tz string auto-detected from the user's device (e.g. 'Africa/Nairobi').
-- Default window: 22:00 → 08:00 local time (overnight).
-- Calls bypass quiet hours regardless (urgent / time-sensitive).

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS quiet_hours_start    time NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end      time NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_timezone text NOT NULL DEFAULT 'UTC';
