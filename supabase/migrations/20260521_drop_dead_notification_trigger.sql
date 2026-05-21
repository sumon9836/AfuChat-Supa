-- The notification_preferences table was dropped in 20260520_drop_notifications_table.sql
-- but the trigger create_notification_preferences_on_signup was left behind.
-- Every new user signup was failing with "Database error saving new user"
-- because this trigger fired on profiles INSERT and tried to write to the
-- non-existent notification_preferences table.

DROP TRIGGER IF EXISTS create_notification_preferences_on_signup ON public.profiles;
DROP FUNCTION IF EXISTS create_default_notification_preferences();
