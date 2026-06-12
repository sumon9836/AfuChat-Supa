-- Rename the @afuchat system account display name to "AfuChat Notifications"
-- This is the account used for in-app system notification messages.
UPDATE public.profiles
SET display_name = 'AfuChat Notifications'
WHERE id = '54dfbcea-2b4b-4f25-bcff-d09084b5b65a'
  AND handle = 'afuchat';
