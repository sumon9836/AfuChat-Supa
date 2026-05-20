-- Drop in-app notifications feature.
-- All notification records and related preferences are removed.
-- Push notifications still work via the send-push-notification edge function
-- invoked directly from the mobile client — the notifications table is no
-- longer required.

DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
