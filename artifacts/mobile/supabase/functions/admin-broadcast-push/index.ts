// admin-broadcast-push — FCM HTTP v1 rewrite
// Sends a push notification to all (or premium) users via Firebase Cloud Messaging.
// Requires: FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_KEY secrets.

function base64url(data: Uint8Array | string): string {
  const str = typeof data === "string" ? data : String.fromCharCode(...(data as Uint8Array));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getFCMAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header  = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  }));
  const si = `${header}.${payload}`;
  const pem = (sa.private_key as string).replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8", Uint8Array.from(atob(pem), c => c.charCodeAt(0)).buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(si));
  const jwt = `${si}.${base64url(new Uint8Array(sig))}`;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }).toString(),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error("[FCM] OAuth2 failed: " + JSON.stringify(d));
  return d.access_token as string;
}

async function sendFCM(
  projectId: string, accessToken: string, fcmToken: string,
  title: string, body: string,
): Promise<"ok" | "stale" | "error"> {
  const message = {
    token: fcmToken,
    notification: { title, body },
    android: { priority: "high", ttl: "604800s", notification: { channel_id: "default", sound: "default", notification_priority: "PRIORITY_HIGH", default_sound: true, default_vibrate_timings: true, default_light_settings: true } },
    apns: { headers: { "apns-priority": "10" }, payload: { aps: { alert: { title, body }, sound: "default", badge: 1 } } },
    data: { type: "broadcast" },
  };
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ message }),
  });
  if (res.status === 404) return "stale";
  if (!res.ok) { console.error(`[FCM broadcast] ${res.status}`, await res.text()); return "error"; }
  return "ok";
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

async function authedUserId(req: Request, supabaseUrl: string, serviceKey: string): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!jwt) return null;
  const resp = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: `Bearer ${jwt}`, apikey: serviceKey } });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const projectId   = Deno.env.get("FIREBASE_PROJECT_ID") || "";
  const saKey       = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY") || "";
  if (!supabaseUrl || !serviceKey) return json({ error: "Service not configured" }, 503);
  if (!projectId || !saKey) return json({ error: "Firebase not configured" }, 503);

  const userId = await authedUserId(req, supabaseUrl, serviceKey);
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const dbHeaders = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json" };

  const profileResp = await fetch(`${supabaseUrl}/rest/v1/profiles?select=is_admin&id=eq.${userId}&limit=1`, { headers: dbHeaders });
  if (!profileResp.ok) return json({ error: "Unauthorized" }, 401);
  const profiles = await profileResp.json();
  if (!profiles?.[0]?.is_admin) return json({ error: "Admin access required" }, 403);

  let body: { title?: string; body?: string; target?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { title, body: msgBody, target = "all" } = body || {};
  if (!title?.trim() || !msgBody?.trim()) return json({ error: "title and body are required" }, 400);

  // Fetch eligible profiles (those with FCM token)
  let profilesUrl = `${supabaseUrl}/rest/v1/profiles?select=id,fcm_token&fcm_token=not.is.null&account_deleted=eq.false`;
  if (target === "premium") {
    profilesUrl = `${supabaseUrl}/rest/v1/profiles?select=id,fcm_token,user_subscriptions!inner(id)&fcm_token=not.is.null&account_deleted=eq.false&user_subscriptions.is_active=eq.true`;
  }

  const allProfilesResp = await fetch(profilesUrl, { headers: dbHeaders });
  if (!allProfilesResp.ok) return json({ error: "Failed to fetch profiles" }, 500);
  const allProfiles: { id: string; fcm_token: string }[] = await allProfilesResp.json();
  if (!allProfiles.length) return json({ sent: 0, total: 0, message: "No eligible users with push tokens" });

  // Check notification preferences
  const allIds = allProfiles.map(p => p.id);
  const prefsResp = await fetch(
    `${supabaseUrl}/rest/v1/notification_preferences?select=user_id,push_enabled&user_id=in.(${allIds.join(",")})`,
    { headers: dbHeaders },
  );
  const prefs: { user_id: string; push_enabled: boolean }[] = prefsResp.ok ? await prefsResp.json() : [];
  const disabledSet = new Set(prefs.filter(p => p.push_enabled === false).map(p => p.user_id));
  const eligible = allProfiles.filter(p => !disabledSet.has(p.id));
  if (!eligible.length) return json({ sent: 0, total: allProfiles.length, message: "All users have push disabled" });

  // Get FCM access token once for all sends
  const accessToken = await getFCMAccessToken(saKey);

  // Send in concurrent batches of 50
  let sent = 0;
  const staleIds: string[] = [];

  for (let i = 0; i < eligible.length; i += 50) {
    const batch = eligible.slice(i, i + 50);
    const results = await Promise.allSettled(
      batch.map(p => sendFCM(projectId, accessToken, p.fcm_token, title.trim().substring(0, 100), msgBody.trim().substring(0, 200))),
    );
    results.forEach((r, idx) => {
      if (r.status === "fulfilled" && r.value === "ok") sent++;
      else if (r.status === "fulfilled" && r.value === "stale") staleIds.push(batch[idx].id);
    });
  }

  // Clear stale FCM tokens
  if (staleIds.length) {
    await fetch(`${supabaseUrl}/rest/v1/profiles?id=in.(${staleIds.join(",")})`, {
      method: "PATCH", headers: dbHeaders,
      body: JSON.stringify({ fcm_token: null }),
    });
  }

  return json({ sent, total: eligible.length, stale_cleared: staleIds.length, message: `Broadcast sent to ${sent} of ${eligible.length} eligible devices` });
});
