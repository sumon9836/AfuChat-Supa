import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendFCMToUser } from "../_shared/fcm.ts";

// Called by Supabase Database Webhooks whenever a row is inserted into:
//   - messages       → sends a chat push to all non-sender participants
//   - calls          → sends an incoming-call push to the callee
//   - notifications  → sends a social/system push to the target user
//
// Required Supabase secrets:
//   FIREBASE_PROJECT_ID           — Firebase project ID
//   FIREBASE_SERVICE_ACCOUNT_KEY  — Firebase service account JSON string

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function channelId(type?: string): string {
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

async function pushToUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  push: {
    title: string;
    body: string;
    data?: Record<string, string>;
    type?: string;
    collapseKey?: string;
  },
): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("fcm_token")
    .eq("id", userId)
    .single();

  if (!profile?.fcm_token) return;

  const type = push.type ?? (push.data?.type as string | undefined);

  await sendFCMToUser(profile.fcm_token, {
    title:        push.title,
    body:         push.body,
    data:         { recipientUserId: userId, ...(push.data ?? {}) },
    channelId:    channelId(type),
    highPriority: type === "call",
    collapseKey:  push.collapseKey,
    ttl:          type === "call" ? 30 : 604800,
  });
}

// ── Handlers per table ──────────────────────────────────────────────

async function handleMessage(
  supabase: ReturnType<typeof createClient>,
  record: Record<string, unknown>,
): Promise<void> {
  const chatId   = record["chat_id"] as string | undefined;
  const senderId = record["sender_id"] as string | undefined;
  const content  = (record["content"] as string | undefined) ?? "Sent an attachment";

  if (!chatId || !senderId) return;

  const { data: chat } = await supabase
    .from("chats")
    .select("id, is_group, name, chat_participants(user_id)")
    .eq("id", chatId)
    .single();

  if (!chat) return;

  const { data: sender } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", senderId)
    .single();

  const senderName = (sender?.display_name || sender?.username || "Someone") as string;
  const title = (chat.is_group && chat.name)
    ? `${senderName} in ${chat.name}`
    : senderName;
  const body  = content.length > 100 ? content.substring(0, 97) + "..." : content;

  const participants = (chat.chat_participants as { user_id: string }[] | null) ?? [];
  const recipients   = participants.filter((p) => p.user_id !== senderId);

  await Promise.allSettled(
    recipients.map((p) =>
      pushToUser(supabase, p.user_id, {
        title,
        body,
        type: "message",
        data: {
          type:       "message",
          chatId,
          actorId:    senderId,
          notifType:  "new_message",
        },
        collapseKey: `chat_${chatId}`,
      }),
    ),
  );
}

async function handleCall(
  supabase: ReturnType<typeof createClient>,
  record: Record<string, unknown>,
): Promise<void> {
  const calleeId = record["callee_id"] as string | undefined;
  const callerId = record["caller_id"] as string | undefined;
  const callId   = record["id"]        as string | undefined;
  const callType = (record["call_type"] as string | undefined) ?? "voice";

  if (!calleeId || !callerId || !callId) return;

  const { data: caller } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", callerId)
    .single();

  const callerName = (caller?.display_name || caller?.username || "Someone") as string;

  await pushToUser(supabase, calleeId, {
    title: `Incoming ${callType === "video" ? "Video" : "Voice"} Call`,
    body:  `${callerName} is calling you`,
    type:  "call",
    data: {
      type:      "call",
      callId,
      callType,
      actorId:   callerId,
      notifType: "call",
      url:       `/call/${callId}`,
    },
    collapseKey: `call_${callId}`,
  });
}

const TYPE_MAP: Record<
  string,
  (record: Record<string, unknown>, actorName: string) => {
    title:    string;
    body:     string;
    category?: string;
    pushType: string;
    url?:     string;
  }
> = {
  new_follower: (_r, n) => ({
    title: "New Follower",
    body:  `${n} started following you`,
    category: "afuchat_new_follower",
    pushType: "follow",
  }),
  new_like: (r, n) => ({
    title: "Post Liked",
    body:  `${n} liked your post`,
    category: "afuchat_post_interact",
    pushType: "like",
    url: r["post_id"] ? `/p/${r["post_id"]}` : undefined,
  }),
  new_reply: (r, n) => ({
    title: n,
    body:  "Replied to your post",
    category: "afuchat_post_interact",
    pushType: "reply",
    url: r["post_id"] ? `/p/${r["post_id"]}` : undefined,
  }),
  new_mention: (r, n) => ({
    title: `${n} mentioned you`,
    body:  "Tap to see the post",
    category: "afuchat_mention",
    pushType: "mention",
    url: r["post_id"] ? `/p/${r["post_id"]}` : undefined,
  }),
  gift: (_r, n) => ({
    title: "Gift Received! 🎁",
    body:  `${n} sent you a gift`,
    category: "afuchat_gift_received",
    pushType: "gift",
  }),
  order_placed: (r, n) => ({
    title: "New Order Received! 🛍️",
    body:  `${n} placed an order`,
    category: "afuchat_order_update",
    pushType: "order",
    url: r["reference_id"] ? `/shop/order/${r["reference_id"]}` : undefined,
  }),
  order_shipped: (r, n) => ({
    title: "Your Order Has Shipped! 📦",
    body:  `${n} has shipped your order`,
    category: "afuchat_order_shipped",
    pushType: "order",
    url: r["reference_id"] ? `/shop/order/${r["reference_id"]}` : undefined,
  }),
  escrow_released: (r, n) => ({
    title: "Payment Released! 💰",
    body:  `${n} confirmed delivery`,
    category: "afuchat_order_update",
    pushType: "escrow",
    url: r["reference_id"] ? `/shop/order/${r["reference_id"]}` : undefined,
  }),
  dispute_raised: (r, n) => ({
    title: "Order Dispute Opened ⚠️",
    body:  `${n} raised a dispute`,
    category: "afuchat_order_update",
    pushType: "order",
    url: r["reference_id"] ? `/shop/order/${r["reference_id"]}` : undefined,
  }),
  refund_issued: (r, _n) => ({
    title: "Refund Issued ✅",
    body:  "Your refund has been returned to your wallet",
    category: "afuchat_order_update",
    pushType: "payment",
    url: r["reference_id"] ? `/shop/order/${r["reference_id"]}` : undefined,
  }),
  acoin_received: (_r, _n) => ({
    title: "AC Received 💰",
    body:  "You received AfuCoins",
    pushType: "payment",
    url: "/me",
  }),
  system: (_r, _n) => ({
    title: "AfuChat",
    body:  "You have a new notification",
    pushType: "system",
    url: "/",
  }),
  channel_post: (r, n) => ({
    title: n,
    body:  "Posted in your channel",
    pushType: "channel",
    url: r["reference_id"] ? `/channel/${r["reference_id"]}` : undefined,
  }),
  live_started: (r, n) => ({
    title: `${n} is live! 🔴`,
    body:  "Tap to join the stream",
    pushType: "live",
    url: r["reference_id"] ? `/channel/${r["reference_id"]}` : undefined,
  }),
  new_message: (r, n) => ({
    title: n,
    body:  "Sent you a message",
    category: "afuchat_message_reply",
    pushType: "message",
    url: r["reference_id"] ? `/chat/${r["reference_id"]}` : undefined,
  }),
  call: (r, n) => ({
    title: "Incoming Call",
    body:  `${n} is calling you`,
    category: "afuchat_incoming_call",
    pushType: "call",
    url: r["reference_id"] ? `/call/${r["reference_id"]}` : undefined,
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

  const mapper = TYPE_MAP[type];
  if (!mapper) {
    console.warn(`[push-trigger] No push mapping for notification type: ${type}`);
    return;
  }

  let actorName = "Someone";
  if (actorId) {
    const { data: actor } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", actorId)
      .single();
    actorName = (actor?.display_name || actor?.username || "Someone") as string;
  }

  const mapped = mapper(record, actorName);

  await pushToUser(supabase, userId, {
    title: mapped.title,
    body:  mapped.body,
    type:  mapped.pushType,
    data: {
      type:        mapped.pushType,
      actorId:     actorId ?? "",
      notifType:   type,
      postId:      (record["post_id"]      as string | undefined) ?? "",
      referenceId: (record["reference_id"] as string | undefined) ?? "",
      url:         mapped.url ?? "",
    },
  });
}

// Supabase webhook payload
type WebhookPayload = {
  type:       "INSERT" | "UPDATE" | "DELETE";
  table:      string;
  schema:     string;
  record:     Record<string, unknown>;
  old_record: Record<string, unknown> | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const webhook = (await req.json()) as WebhookPayload;

    if (webhook.type !== "INSERT") {
      return new Response(JSON.stringify({ ok: true, skipped: "not an INSERT" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
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
        console.warn(`[push-trigger] Unhandled table: ${webhook.table}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[push-trigger] Unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
