import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendFCMToUser } from "../_shared/fcm.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const { userId, title, body, data = {}, categoryIdentifier } = await req.json();

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "userId, title, and body are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("fcm_token")
      .eq("id", userId)
      .single();

    if (profileErr || !profile?.fcm_token) {
      return new Response(
        JSON.stringify({ error: "No FCM token found for user" }),
        { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const type = data?.type as string | undefined;

    await sendFCMToUser(profile.fcm_token, {
      title,
      body,
      data:         { recipientUserId: userId, ...data },
      channelId:    channelId(type),
      highPriority: type === "call",
      collapseKey:  type === "message" && data.chatId
                      ? `chat_${data.chatId}`
                      : type === "call"
                      ? `call_${data.callId ?? userId}`
                      : undefined,
      ttl: type === "call" ? 30 : 604800,
    });

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[send-push] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
