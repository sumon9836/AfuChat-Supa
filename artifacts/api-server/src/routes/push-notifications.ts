/**
 * Push notification webhook — ported from Supabase Edge Function.
 *
 * POST /api/push/webhook
 *   Called by PostgreSQL pg_net triggers on INSERT into:
 *     • messages      → chat push to all non-sender members
 *     • calls         → incoming-call push to callee (bypasses quiet hours)
 *     • notifications → social/system push to target user
 *
 * POST /api/push/register-token
 *   Saves the user's Expo push token into their profile row.
 */

import { Router, type Request, type Response } from "express";
import { authedUser as verifyAuth } from "../lib/auth";
import { query, queryOne } from "../lib/db";
import { logger } from "../lib/logger";

const router = Router();

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// ── Quiet hours ──────────────────────────────────────────────────────────────

function isQuietNow(start: string, end: string, tz: string): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const h = parts.find((p) => p.type === "hour")?.value ?? "00";
    const m = parts.find((p) => p.type === "minute")?.value ?? "00";
    const now = `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    if (start <= end) return now >= start && now < end;
    return now >= start || now < end;
  } catch {
    return false;
  }
}

// ── Channel routing ──────────────────────────────────────────────────────────

function pushChannelId(type?: string): string {
  switch (type) {
    case "message":  return "messages";
    case "call":     return "calls";
    case "follow":
    case "like":
    case "reply":
    case "mention":  return "social";
    case "order":
    case "escrow":
    case "payment":  return "marketplace";
    default:         return "default";
  }
}

// ── Single push sender ───────────────────────────────────────────────────────

async function sendExpoPush(payload: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.error({ status: res.status }, "[push] Expo HTTP error");
      return null;
    }
    const json = (await res.json()) as { data?: { status?: string; id?: string; details?: { error?: string }; message?: string } };
    const ticket = json?.data;
    if (ticket?.status === "error") {
      if (ticket?.details?.error === "DeviceNotRegistered") return "stale";
      logger.error({ msg: ticket.message, details: ticket.details }, "[push] Expo ticket error");
    }
    return ticket?.id ?? null;
  } catch (e) {
    logger.error({ err: e }, "[push] sendExpoPush failed");
    return null;
  }
}

// ── Push to user with prefs / quiet-hours checks ─────────────────────────────

type NotifPrefs = {
  push_enabled: boolean;
  push_messages: boolean;
  push_likes: boolean;
  push_follows: boolean;
  push_gifts: boolean;
  push_mentions: boolean;
  push_replies: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_timezone: string;
};

async function pushToUser(
  userId: string,
  push: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    categoryIdentifier?: string;
    type?: string;
    collapseKey?: string;
    prefKey?: keyof NotifPrefs;
    bypassQuietHours?: boolean;
  },
): Promise<void> {
  const profile = await queryOne<{ expo_push_token: string | null }>(
    `SELECT expo_push_token FROM public.profiles WHERE id = $1 LIMIT 1`,
    [userId],
  );

  if (!profile?.expo_push_token) return;

  let prefs: Partial<NotifPrefs> | null = null;
  try {
    prefs = await queryOne<NotifPrefs>(
      `SELECT push_enabled, push_messages, push_likes, push_follows, push_gifts,
              push_mentions, push_replies, quiet_hours_enabled, quiet_hours_start,
              quiet_hours_end, quiet_hours_timezone
       FROM public.notification_preferences WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
  } catch {
    // table may not exist yet — proceed with defaults
  }

  if (prefs?.push_enabled === false) return;
  if (push.prefKey && prefs?.[push.prefKey] === false) return;

  if (!push.bypassQuietHours && prefs?.quiet_hours_enabled) {
    const tz = prefs.quiet_hours_timezone || "UTC";
    const start = prefs.quiet_hours_start || "22:00";
    const end = prefs.quiet_hours_end || "08:00";
    if (isQuietNow(start, end, tz)) {
      logger.debug({ userId, tz }, "[push] quiet hours active, suppressed");
      return;
    }
  }

  const type = push.type ?? (push.data?.type as string | undefined);
  const isCall = type === "call";

  const payload: Record<string, unknown> = {
    to: (profile as any).expo_push_token,
    title: (push.title ?? "").substring(0, 100),
    body: (push.body ?? "").substring(0, 200),
    data: { recipientUserId: userId, ...(push.data ?? {}) },
    badge: 1,
    sound: "default",
    priority: isCall ? "high" : "normal",
    channelId: pushChannelId(type),
    ttl: isCall ? 30 : 604_800,
    expiration: Math.floor(Date.now() / 1000) + (isCall ? 30 : 604_800),
  };

  if (push.categoryIdentifier) payload.categoryIdentifier = push.categoryIdentifier;
  if (push.collapseKey) {
    payload.collapseId = push.collapseKey;
    payload["thread-id"] = push.collapseKey;
  }

  const result = await sendExpoPush(payload);
  if (result === "stale") {
    await query(`UPDATE public.profiles SET expo_push_token = NULL WHERE id = $1`, [userId]);
    logger.info({ userId }, "[push] cleared stale token");
  }
}

// ── Message preview ───────────────────────────────────────────────────────────

function messagePreview(content: string | undefined, attachmentType: string | undefined): string {
  if (attachmentType === "image")   return "📷 Photo";
  if (attachmentType === "video")   return "🎥 Video";
  if (attachmentType === "audio")   return "🎤 Voice message";
  if (attachmentType === "file")    return "📎 File";
  if (attachmentType === "gif")     return "GIF";
  if (attachmentType === "payment") return "💸 Payment";
  if (attachmentType === "sticker") return "🎭 Sticker";
  if (!content) return "Sent a message";
  const trimmed = content.trim();
  if (trimmed.length > 80 && !/\s/.test(trimmed) && /^[A-Za-z0-9+/=]+$/.test(trimmed)) return "New message";
  return trimmed.length > 100 ? trimmed.substring(0, 97) + "…" : trimmed;
}

// ── Table handlers ─────────────────────────────────────────────────────────

async function handleMessage(record: Record<string, unknown>): Promise<void> {
  const chatId = record["chat_id"] as string | undefined;
  const senderId = record["sender_id"] as string | undefined;
  const rawContent = record["encrypted_content"] as string | undefined;
  const attachmentType = record["attachment_type"] as string | undefined;

  if (!chatId || !senderId) return;

  const body = messagePreview(rawContent, attachmentType);

  const [chats, senders] = await Promise.all([
    query<{ id: string; is_group: boolean; name: string | null }>(
      `SELECT id, is_group, name FROM public.chats WHERE id = $1 LIMIT 1`, [chatId],
    ),
    query<{ display_name: string | null; handle: string | null }>(
      `SELECT display_name, handle FROM public.profiles WHERE id = $1 LIMIT 1`, [senderId],
    ),
  ]);

  if (!chats.length) return;

  const chat = chats[0];
  const sender = senders[0];
  const senderName = (sender?.display_name || sender?.handle || "Someone") as string;
  const title = (chat.is_group && chat.name) ? `${senderName} in ${chat.name}` : senderName;

  const members = await query<{ user_id: string }>(
    `SELECT user_id FROM public.chat_members WHERE chat_id = $1`, [chatId],
  );
  const allRecipients = members.filter((m) => m.user_id !== senderId);

  let mutedUserIds = new Set<string>();
  if (allRecipients.length > 0) {
    try {
      const userIdList = allRecipients.map((m) => m.user_id);
      const placeholders = userIdList.map((_, i) => `$${i + 2}`).join(",");
      const muteRows = await query<{ user_id: string; muted_until: string | null }>(
        `SELECT user_id, muted_until FROM public.chat_mutes WHERE chat_id = $1 AND user_id IN (${placeholders})`,
        [chatId, ...userIdList],
      );
      const now = new Date().toISOString();
      mutedUserIds = new Set(
        muteRows
          .filter((m) => m.muted_until === null || m.muted_until > now)
          .map((m) => m.user_id),
      );
    } catch { /* chat_mutes may not exist yet */ }
  }

  const recipients = allRecipients.filter((m) => !mutedUserIds.has(m.user_id));

  await Promise.allSettled(
    recipients.map((m) =>
      pushToUser(m.user_id, {
        title,
        body,
        type: "message",
        prefKey: "push_messages",
        data: { type: "message", chatId, actorId: senderId, notifType: "new_message", url: `/chat/${chatId}` },
        categoryIdentifier: "afuchat_message_reply",
        collapseKey: `chat_${chatId}`,
      }),
    ),
  );
}

async function handleCall(record: Record<string, unknown>): Promise<void> {
  const calleeId = record["callee_id"] as string | undefined;
  const callerId = record["caller_id"] as string | undefined;
  const callId = record["id"] as string | undefined;
  const callType = (record["call_type"] as string | undefined) ?? "voice";

  if (!calleeId || !callerId || !callId) return;

  const callers = await query<{ display_name: string | null; handle: string | null }>(
    `SELECT display_name, handle FROM public.profiles WHERE id = $1 LIMIT 1`, [callerId],
  );
  const callerName = (callers[0]?.display_name || callers[0]?.handle || "Someone") as string;

  await pushToUser(calleeId, {
    title: `Incoming ${callType === "video" ? "Video" : "Voice"} Call`,
    body: `${callerName} is calling you`,
    type: "call",
    bypassQuietHours: true,
    data: { type: "call", callId, callType, actorId: callerId, notifType: "call", url: `/call/${callId}` },
    categoryIdentifier: "afuchat_incoming_call",
    collapseKey: `call_${callId}`,
  });
}

const NOTIF_TYPE_MAP: Record<string, (record: Record<string, unknown>, actorName: string) => {
  title: string; body: string; category?: string; pushType: string; url?: string; prefKey?: keyof NotifPrefs;
}> = {
  new_follower: (_r, n) => ({ title: "New Follower", body: `${n} started following you`, category: "afuchat_new_follower", pushType: "follow", prefKey: "push_follows" }),
  follow:       (_r, n) => ({ title: "New Follower", body: `${n} started following you`, category: "afuchat_new_follower", pushType: "follow", prefKey: "push_follows" }),
  like:     (r, n) => ({ title: "Post Liked", body: `${n} liked your post`, category: "afuchat_post_interact", pushType: "like", prefKey: "push_likes", url: r["entity_id"] ? `/p/${r["entity_id"]}` : undefined }),
  new_like: (r, n) => ({ title: "Post Liked", body: `${n} liked your post`, category: "afuchat_post_interact", pushType: "like", prefKey: "push_likes", url: r["entity_id"] ? `/p/${r["entity_id"]}` : undefined }),
  comment:   (r, n) => ({ title: n, body: (r["data"] as any)?.body ?? "Replied to your post", category: "afuchat_post_interact", pushType: "reply", prefKey: "push_replies", url: r["entity_id"] ? `/p/${r["entity_id"]}` : undefined }),
  new_reply: (r, n) => ({ title: n, body: (r["data"] as any)?.body ?? "Replied to your post", category: "afuchat_post_interact", pushType: "reply", prefKey: "push_replies", url: r["entity_id"] ? `/p/${r["entity_id"]}` : undefined }),
  mention:     (r, n) => ({ title: `${n} mentioned you`, body: "Tap to see the post", category: "afuchat_mention", pushType: "mention", prefKey: "push_mentions", url: r["entity_id"] ? `/p/${r["entity_id"]}` : undefined }),
  new_mention: (r, n) => ({ title: `${n} mentioned you`, body: "Tap to see the post", category: "afuchat_mention", pushType: "mention", prefKey: "push_mentions", url: r["entity_id"] ? `/p/${r["entity_id"]}` : undefined }),
  gift: (_r, n) => ({ title: "Gift Received! 🎁", body: `${n} sent you a gift`, category: "afuchat_gift_received", pushType: "gift", prefKey: "push_gifts" }),
  message:     (r, n) => ({ title: n, body: "Sent you a message", category: "afuchat_message_reply", pushType: "message", prefKey: "push_messages", url: r["entity_id"] ? `/chat/${r["entity_id"]}` : undefined }),
  new_message: (r, n) => ({ title: n, body: "Sent you a message", category: "afuchat_message_reply", pushType: "message", prefKey: "push_messages", url: r["entity_id"] ? `/chat/${r["entity_id"]}` : undefined }),
  order_placed:    (r, n) => ({ title: "New Order Received! 🛍️", body: `${n} placed an order`, category: "afuchat_order_update", pushType: "order", url: r["entity_id"] ? `/shop/order/${r["entity_id"]}` : undefined }),
  order_shipped:   (r, n) => ({ title: "Your Order Has Shipped! 📦", body: `${n} shipped your order`, category: "afuchat_order_shipped", pushType: "order", url: r["entity_id"] ? `/shop/order/${r["entity_id"]}` : undefined }),
  order_update:    (r)    => ({ title: "Order Update", body: (r["data"] as any)?.message ?? "Your order status has changed", category: "afuchat_order_update", pushType: "order", url: r["entity_id"] ? `/shop/order/${r["entity_id"]}` : undefined }),
  escrow_released: (r, n) => ({ title: "Payment Released! 💰", body: `${n} confirmed delivery`, category: "afuchat_order_update", pushType: "escrow", url: r["entity_id"] ? `/shop/order/${r["entity_id"]}` : undefined }),
  acoin_received:  ()     => ({ title: "AC Received 💰", body: "You received AfuCoins", pushType: "payment", url: "/me" }),
  system:          (r)    => ({ title: (r["data"] as any)?.title ?? "AfuChat", body: (r["data"] as any)?.body ?? "You have a new notification", pushType: "system" }),
  call:          (r, n) => ({ title: "Incoming Call", body: `${n} is calling you`, category: "afuchat_incoming_call", pushType: "call", url: r["entity_id"] ? `/call/${r["entity_id"]}` : undefined }),
  incoming_call: (r, n) => ({ title: "Incoming Call", body: `${n} is calling you`, category: "afuchat_incoming_call", pushType: "call", url: r["entity_id"] ? `/call/${r["entity_id"]}` : undefined }),
};

async function handleNotification(record: Record<string, unknown>): Promise<void> {
  const userId = record["user_id"] as string | undefined;
  const actorId = record["actor_id"] as string | undefined;
  const type = record["type"] as string | undefined;

  if (!userId || !type) return;

  const mapper = NOTIF_TYPE_MAP[type];
  if (!mapper) {
    logger.debug({ type }, "[push] no mapping for notification type");
    return;
  }

  let actorName = "Someone";
  if (actorId) {
    const actors = await query<{ display_name: string | null; handle: string | null }>(
      `SELECT display_name, handle FROM public.profiles WHERE id = $1 LIMIT 1`, [actorId],
    );
    actorName = (actors[0]?.display_name || actors[0]?.handle || "Someone") as string;
  }

  const mapped = mapper(record, actorName);

  await pushToUser(userId, {
    title: mapped.title,
    body: mapped.body,
    type: mapped.pushType,
    prefKey: mapped.prefKey,
    data: {
      type: mapped.pushType,
      actorId: actorId ?? "",
      notifType: type,
      entityId: (record["entity_id"] as string | undefined) ?? "",
      entityType: (record["entity_type"] as string | undefined) ?? "",
      url: mapped.url ?? "",
    },
    categoryIdentifier: mapped.category,
  });
}

// ── POST /api/push/webhook ────────────────────────────────────────────────────

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
};

router.post("/push/webhook", async (req: Request, res: Response) => {
  // Verify webhook token
  const webhookToken = process.env.PUSH_WEBHOOK_TOKEN || "";
  if (webhookToken) {
    const incoming = req.headers["x-webhook-token"] as string | undefined;
    if (incoming !== webhookToken) {
      logger.warn("[push/webhook] Unauthorized: invalid webhook token");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  try {
    const webhook = req.body as WebhookPayload;

    if (webhook.type !== "INSERT") {
      res.json({ ok: true, skipped: "not an INSERT" });
      return;
    }

    switch (webhook.table) {
      case "messages":
        await handleMessage(webhook.record);
        break;
      case "calls":
        await handleCall(webhook.record);
        break;
      case "notifications":
        await handleNotification(webhook.record);
        break;
      default:
        logger.debug({ table: webhook.table }, "[push] unhandled table");
    }

    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err }, "[push/webhook] unhandled error");
    res.status(500).json({ error: String(err) });
  }
});

// ── POST /api/push/register-token ─────────────────────────────────────────────

router.post("/push/register-token", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }

  const authUser = await verifyAuth(req, res as any);
  if (!authUser) return;

  const { token } = req.body as { token?: string };
  if (!token || typeof token !== "string" || !token.startsWith("ExponentPushToken[")) {
    res.status(400).json({ error: "Invalid push token format" });
    return;
  }

  try {
    await query(`UPDATE public.profiles SET expo_push_token = $1 WHERE id = $2`, [token, authUser.userId]);
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err }, "[push] failed to save push token");
    res.status(500).json({ error: "Failed to save push token" });
  }
});

export default router;
