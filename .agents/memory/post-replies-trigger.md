---
name: Post replies notification trigger bug
description: Stale DB trigger on post_replies caused all comment inserts to fail
---

## The rule
The `post_replies` table must NOT have any trigger that writes to the `notifications` table. That table has been dropped.

## Why
A legacy Postgres trigger (e.g. `notify_post_reply`, `create_post_reply_notification`) tried to INSERT into `public.notifications` with a `post_id` column that didn't exist → error 42703 → entire comment INSERT was rolled back.

## What was done
- Migration `20260526_comment_media.sql`: added `voice_url`, `voice_duration`, `image_url` columns to `post_replies` (for comment media uploads).
- Migration `20260527_drop_post_replies_notification_trigger.sql`: dropped all notification-referencing triggers on `post_replies` and the `notifications` table itself.
- Both applied via Supabase Management API (`POST /v1/projects/{ref}/database/query`).

## How to apply
If comment submissions start failing with error code `42703` and a message mentioning `notifications`, run the migration script again in the Supabase SQL Editor. The trigger was completely removed so this should be permanent.
