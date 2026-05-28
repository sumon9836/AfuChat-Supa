// push-notification-trigger — Supabase Edge Function
//
// Called by PostgreSQL pg_net triggers on INSERT into:
//   • messages       → chat push to all non-sender members
//   • calls          → incoming-call push to callee
//   • notifications  → social/system push to target user
//
// Security: every request must carry the header
//   X-Webhook-Token: <PUSH_WEBHOOK_TOKEN env var>
// Set PUSH_WEBHOOK_TOKEN in:
//   Supabase Dashboard → Edge Functions → Secrets

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-token",
};

// ── Expo push channel routing ────────────────────────────────────────────────

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
    console.error("[push-trigger] Expo HTTP error:", res.status, await res.text());
    return null;
  }

  const json = await res.json();
  const ticket = json?.data;
  if (ticket?.status === "error") {
    if (ticket?.details?.error === "DeviceNotRegistered") return "stale";
    console.error("[push-trigger] Expo ticket error:", ticket.message, ticket.details);
  }
  return ticket?.id ?? null;
}

// ── Lookup push token and fire push ─────────────────────────────────────────

type NotifPrefs = {
  push_enabled: boolean;
  push_messages: boolean;
  push_likes: boolean;
  push_follows: boolean;
  push_gifts: boolean;
  push_mentions: boolean;
  push_replies: boolean;
};

async function pushToUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  push: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    categoryIdentifier?: string;
    type?: string;
    collapseKey?: string;
    prefKey?: keyof NotifPrefs;
  },
): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("expo_push_token")
    .eq("id", userId)
    .single();

  if (!profile?.expo_push_token) return;

  if (push.prefKey) {
    try {
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("push_enabled, " + push.prefKey)
        .eq("user_id", userId)
        .single();

      if (prefs?.push_enabled === false) return;
      if (prefs?.[push.prefKey] === false) return;
    } catch {
      // table may not exist yet — proceed
    }
  }

  const type = push.type ?? (push.data?.type as string | undefined);
  const isCall = type === "call";

  const payload: Record<string, unknown> = {
    to: profile.expo_push_token,
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
    await supabase
      .from("profiles")
      .update({ expo_push_token: null })
      .eq("id", userId);
    console.log("[push-trigger] Cleared stale token for user:", userId);
  }
}

// ── Body preview for a message ────────────────────────────────────────────────

function messagePreview(
  content: string | undefined,
  attachmentType: string | undefined,
): string {
  if (attachmentType === "image")   return "📷 Photo";
  if (attachmentType === "video")   return "🎥 Video";
  if (attachmentType === "audio")   return "🎤 Voice message";
  if (attachmentType === "file")    return "📎 File";
  if (attachmentType === "gif")     return "GIF";
  if (attachmentType === "payment") return "💸 Payment";
  if (attachmentType === "sticker") return "🎭 Sticker";

  if (!content) return "Sent a message";

  const trimmed = content.trim();
  // Ciphertext heuristic — base64-looking blob with no spaces
  if (trimmed.length > 80 && !/\s/.test(trimmed) && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return "New message";
  }

  return trimmed.length > 100 ? trimmed.substring(0, 97) + "…" : trimmed;
}

// ── Table handlers ────────────────────────────────────────────────────────────

async function handleMessage(
  supabase: ReturnType<typeof createClient>,
  record: Record<string, unknown>,
): Promise<void> {
  const chatId         = record["chat_id"]          as string | undefined;
  const senderId       = record["sender_id"]         as string | undefined;
  const rawContent     = record["encrypted_content"] as string | undefined;
  const attachmentType = record["attachment_type"]   as string | undefined;

  if (!chatId || !senderId) return;

  const body = messagePreview(rawContent, attachmentType);

  const [chatRes, senderRes] = await Promise.all([
    supabase
      .from("chats")
      .select("id, is_group, name, chat_members(user_id)")
      .eq("id", chatId)
      .single(),
    supabase
      .from("profiles")
      .select("display_name, handle")
      .eq("id", senderId)
      .single(),
  ]);

  if (!chatRes.data) return;

  const chat       = chatRes.data;
  const sender     = senderRes.data;
  const senderName = (sender?.display_name || sender?.handle || "Someone") as string;

  const title = (chat.is_group && chat.name)
    ? `${senderName} in ${chat.name}`
    : senderName;

  const members    = (chat.chat_members as { user_id: string }[] | null) ?? [];
  const recipients = members.filter((m) => m.user_id !== senderId);

  await Promise.allSettled(
    recipients.map((m) =>
      pushToUser(supabase, m.user_id, {
        title,
        body,
        type: "message",
        prefKey: "push_messages",
        data: {
          type: "message",
          chatId,
          actorId: senderId,
          notifType: "new_message",
          url: `/chat/${chatId}`,
        },
        categoryIdentifier: "afuchat_message_reply",
        collapseKey: `chat_${chatId}`,
      }),
    ),
  );
}

async function handleCall(
  supabase: ReturnType<typeof createClient>,
  record: Record<string, unknown>,
): Promise<void> {
  const calleeId = record["callee_id"]  as string | undefined;
  const callerId = record["caller_id"]  as string | undefined;
  const callId   = record["id"]         as string | undefined;
  const callType = (record["call_type"] as string | undefined) ?? "voice";

  if (!calleeId || !callerId || !callId) return;

  const { data: caller } = await supabase
    .from("profiles")
    .select("display_name, handle")
    .eq("id", callerId)
    .single();

  const callerName = (caller?.display_name || caller?.handle || "Someone") as string;

  await pushToUser(supabase, calleeId, {
    title: `Incoming ${callType === "video" ? "Video" : "Voice"} Call`,
    body: `${callerName} is calling you`,
    type: "call",
    data: {
      type: "call",
      callId,
      callType,
      actorId: callerId,
      notifType: "call",
      url: `/call/${callId}`,
    },
    categoryIdentifier: "afuchat_incoming_call",
    collapseKey: `call_${callId}`,
  });
}

// ── Notification type → push copy map ────────────────────────────────────────

const NOTIF_TYPE_MAP: Record<
  string,
  (
    record: Record<string, unknown>,
    actorName: string,
  ) => {
    title: string;
    body: string;
    category?: string;
    pushType: string;
    url?: string;
    prefKey?: keyof NotifPrefs;
  }
> = {
  new_follower: (_r, n) => ({
    title: "New Follower",
    body: `${n} started following you`,
    category: "afuchat_new_follower",
    pushType: "follow",
    prefKey: "push_follows",
  }),
  follow: (_r, n) => ({
    title: "New Follower",
    body: `${n} started following you`,
    category: "afuchat_new_follower",
    pushType: "follow",
    prefKey: "push_follows",
  }),
  like: (r, n) => ({
    title: "Post Liked",
    body: `${n} liked your post`,
    category: "afuchat_post_interact",
    pushType: "like",
    prefKey: "push_likes",
    url: r["entity_id"] ? `/p/${r["entity_id"]}` : undefined,
  }),
  new_like: (r, n) => ({
    title: "Post Liked",
    body: `${n} liked your post`,
    category: "afuchat_post_interact",
    pushType: "like",
    prefKey: "push_likes",
    url: r["entity_id"] ? `/p/${r["entity_id"]}` : undefined,
  }),
  comment: (r, n) => ({
    title: n,
    body: (r["data"] as Record<string, unknown>)?.body as string ?? "Replied to your post",
    category: "afuchat_post_interact",
    pushType: "reply",
    prefKey: "push_replies",
    url: r["entity_id"] ? `/p/${r["entity_id"]}` : undefined,
  }),
  new_reply: (r, n) => ({
    title: n,
    body: (r["data"] as Record<string, unknown>)?.body as string ?? "Replied to your post",
    category: "afuchat_post_interact",
    pushType: "reply",
    prefKey: "push_replies",
    url: r["entity_id"] ? `/p/${r["entity_id"]}` : undefined,
  }),
  mention: (r, n) => ({
    title: `${n} mentioned you`,
    body: "Tap to see the post",
    category: "afuchat_mention",
    pushType: "mention",
    prefKey: "push_mentions",
    url: r["entity_id"] ? `/p/${r["entity_id"]}` : undefined,
  }),
  new_mention: (r, n) => ({
    title: `${n} mentioned you`,
    body: "Tap to see the post",
    category: "afuchat_mention",
    pushType: "mention",
    prefKey: "push_mentions",
    url: r["entity_id"] ? `/p/${r["entity_id"]}` : undefined,
  }),
  gift: (_r, n) => ({
    title: "Gift Received! 🎁",
    body: `${n} sent you a gift`,
    category: "afuchat_gift_received",
    pushType: "gift",
    prefKey: "push_gifts",
  }),
  message: (r, n) => ({
    title: n,
    body: "Sent you a message",
    category: "afuchat_message_reply",
    pushType: "message",
    prefKey: "push_messages",
    url: r["entity_id"] ? `/chat/${r["entity_id"]}` : undefined,
  }),
  new_message: (r, n) => ({
    title: n,
    body: "Sent you a message",
    category: "afuchat_message_reply",
    pushType: "message",
    prefKey: "push_messages",
    url: r["entity_id"] ? `/chat/${r["entity_id"]}` : undefined,
  }),
  order_placed: (r, n) => ({
    title: "New Order Received! 🛍️",
    body: `${n} placed an order`,
    category: "afuchat_order_update",
    pushType: "order",
    url: r["entity_id"] ? `/shop/order/${r["entity_id"]}` : undefined,
  }),
  order_shipped: (r, n) => ({
    title: "Your Order Has Shipped! 📦",
    body: `${n} shipped your order`,
    category: "afuchat_order_shipped",
    pushType: "order",
    url: r["entity_id"] ? `/shop/order/${r["entity_id"]}` : undefined,
  }),
  order_update: (r) => ({
    title: "Order Update",
    body: (r["data"] as Record<string, unknown>)?.message as string ?? "Your order status has changed",
    category: "afuchat_order_update",
    pushType: "order",
    url: r["entity_id"] ? `/shop/order/${r["entity_id"]}` : undefined,
  }),
  escrow_released: (r, n) => ({
    title: "Payment Released! 💰",
    body: `${n} confirmed delivery`,
    category: "afuchat_order_update",
    pushType: "escrow",
    url: r["entity_id"] ? `/shop/order/${r["entity_id"]}` : undefined,
  }),
  acoin_received: () => ({
    title: "AC Received 💰",
    body: "You received AfuCoins",
    pushType: "payment",
    url: "/me",
  }),
  system: (r) => ({
    title: (r["data"] as Record<string, unknown>)?.title as string ?? "AfuChat",
    body: (r["data"] as Record<string, unknown>)?.body as string ?? "You have a new notification",
    pushType: "system",
  }),
  call: (r, n) => ({
    title: "Incoming Call",
    body: `${n} is calling you`,
    category: "afuchat_incoming_call",
    pushType: "call",
    url: r["entity_id"] ? `/call/${r["entity_id"]}` : undefined,
  }),
  incoming_call: (r, n) => ({
    title: "Incoming Call",
    body: `${n} is calling you`,
    category: "afuchat_incoming_call",
    pushType: "call",
    url: r["entity_id"] ? `/call/${r["entity_id"]}` : undefined,
  }),
};

async function handleNotification(
  supabase: ReturnType<typeof createClient>,
  record: Record<string, unknown>,
): Promise<void> {
  const userId  = record["user_id"]  as string | undefined;
  const actorId = record["actor_id"] as string | undefined;
  const type    = record["type"]     as string | undefined;

  if (!userId || !type) return;

  const mapper = NOTIF_TYPE_MAP[type];
  if (!mapper) {
    console.warn("[push-trigger] No push mapping for notification type:", type);
    return;
  }

  let actorName = "Someone";
  if (actorId) {
    const { data: actor } = await supabase
      .from("profiles")
      .select("display_name, handle")
      .eq("id", actorId)
      .single();
    actorName = (actor?.display_name || actor?.handle || "Someone") as string;
  }

  const mapped = mapper(record, actorName);

  await pushToUser(supabase, userId, {
    title: mapped.title,
    body: mapped.body,
    type: mapped.pushType,
    prefKey: mapped.prefKey,
    data: {
      type:       mapped.pushType,
      actorId:    actorId    ?? "",
      notifType:  type,
      entityId:   (record["entity_id"]   as string | undefined) ?? "",
      entityType: (record["entity_type"] as string | undefined) ?? "",
      url:        mapped.url ?? "",
    },
    categoryIdentifier: mapped.category,
  });
}

// ── Webhook payload from Supabase / pg_net ────────────────────────────────────

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
};

// ── Entry point ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // ── Auth: verify webhook token ─────────────────────────────────────────────
  const webhookToken = Deno.env.get("PUSH_WEBHOOK_TOKEN");
  if (webhookToken) {
    const incoming = req.headers.get("x-webhook-token");
    if (incoming !== webhookToken) {
      console.warn("[push-trigger] Unauthorized: invalid webhook token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  } else {
    // Fallback: accept service-role Bearer when no dedicated token is set
    const auth = req.headers.get("authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (auth !== `Bearer ${serviceKey}`) {
      console.warn("[push-trigger] Unauthorized: missing auth");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const webhook = (await req.json()) as WebhookPayload;

    if (webhook.type !== "INSERT") {
      return new Response(
        JSON.stringify({ ok: true, skipped: "not an INSERT" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    switch (webhook.table) {
      case "messages":
        await handleMessage(supabase, webhook.record);
        break;
      case "calls":
        await handleCall(supabase, webhook.record);
        break;
      case "notifications":
        await handleNotification(supabase, webhook.record);
        break;
      default:
        console.warn("[push-trigger] Unhandled table:", webhook.table);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[push-trigger] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
