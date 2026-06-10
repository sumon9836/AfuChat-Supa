// Shared FCM HTTP v1 helper used by push-notification-trigger and send-push-notification.
// Requires two Supabase secrets:
//   FIREBASE_PROJECT_ID        — your Firebase project ID (e.g. "afuchat-12345")
//   FIREBASE_SERVICE_ACCOUNT_KEY — the full JSON string of a Firebase service account key
//                                  with the "Firebase Cloud Messaging API" role

function base64url(data: Uint8Array | string): string {
  const str = typeof data === "string" ? data : String.fromCharCode(...data);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** Exchange a service-account JSON key for a short-lived OAuth2 bearer token. */
export async function getFCMAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header  = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss:   sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  }));

  const signingInput = `${header}.${payload}`;

  const pemContents = (sa.private_key as string)
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${base64url(new Uint8Array(sigBytes))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }).toString(),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`[FCM] OAuth2 token exchange failed: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token as string;
}

export type FCMSendOptions = {
  title:       string;
  body:        string;
  data?:       Record<string, string>;
  channelId?:  string;
  highPriority?: boolean;
  collapseKey?: string;
  ttl?:        number;
};

/**
 * Send a single FCM message to one device token.
 * Logs errors but does not throw — stale / unregistered tokens return 404
 * from FCM and should not crash the calling function.
 */
export async function sendFCM(
  projectId:   string,
  accessToken: string,
  fcmToken:    string,
  opts:        FCMSendOptions,
): Promise<void> {
  const ttl = opts.ttl ?? 604800;

  const message: Record<string, unknown> = {
    token: fcmToken,
    notification: {
      title: opts.title,
      body:  opts.body,
    },
    android: {
      priority:    opts.highPriority ? "high" : "normal",
      ttl:         `${ttl}s`,
      ...(opts.collapseKey && { collapse_key: opts.collapseKey }),
      notification: {
        channel_id:                opts.channelId ?? "default",
        sound:                     "default",
        notification_priority:     "PRIORITY_HIGH",
        default_sound:             true,
        default_vibrate_timings:   true,
        default_light_settings:    true,
      },
    },
    apns: {
      headers: {
        "apns-priority": "10",
        "apns-expiration": String(Math.floor(Date.now() / 1000) + ttl),
        ...(opts.collapseKey && { "apns-collapse-id": opts.collapseKey }),
      },
      payload: {
        aps: {
          alert: { title: opts.title, body: opts.body },
          sound: "default",
          badge: 1,
          ...(opts.collapseKey && { "thread-id": opts.collapseKey }),
        },
      },
    },
    // data fields must all be strings for FCM
    data: Object.fromEntries(
      Object.entries(opts.data ?? {}).map(([k, v]) => [k, String(v)])
    ),
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ message }),
    },
  );

  if (!res.ok) {
    const errBody = await res.text();
    // 404 = token not registered (device uninstalled app) — not fatal
    if (res.status !== 404) {
      console.error(`[FCM] send failed ${res.status}:`, errBody);
    }
  }
}

/** Convenience: get credentials from env, obtain token, send. */
export async function sendFCMToUser(
  fcmToken: string,
  opts: FCMSendOptions,
): Promise<void> {
  const projectId  = Deno.env.get("FIREBASE_PROJECT_ID");
  const saKey      = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");

  if (!projectId || !saKey) {
    console.error("[FCM] FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_KEY not set");
    return;
  }

  const accessToken = await getFCMAccessToken(saKey);
  await sendFCM(projectId, accessToken, fcmToken, opts);
}
