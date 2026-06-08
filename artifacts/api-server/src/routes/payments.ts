/**
 * /api/payments/* — Pesapal payment routes (ported from Supabase Edge Functions)
 *
 * POST /api/payments/initiate   — start a payment (all methods)
 * POST /api/payments/webhook    — Pesapal IPN handler
 * GET  /api/payments/status/:merchantRef — poll order status
 */

import { Router, type Request, type Response } from "express";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";

const router = Router();

const PESAPAL_ENV = process.env.PESAPAL_ENV || "live";
const PESAPAL_BASE =
  PESAPAL_ENV === "sandbox"
    ? "https://cybqa.pesapal.com/pesapalv3"
    : "https://pay.pesapal.com/v3";

const CALLBACK_URL = "https://afuchat.com/wallet/payment-complete";

function getPesapalKeys() {
  return {
    consumerKey: process.env.PESAPAL_CONSUMER_KEY || "",
    consumerSecret: process.env.PESAPAL_CONSUMER_SECRET || "",
    ipnId: process.env.PESAPAL_IPN_ID || "",
  };
}

function isPesapalConfigured(): boolean {
  const { consumerKey, consumerSecret } = getPesapalKeys();
  return Boolean(consumerKey && consumerSecret);
}

async function pesapalToken(): Promise<string> {
  const { consumerKey, consumerSecret } = getPesapalKeys();
  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
  });
  if (!res.ok) throw new Error(`Pesapal auth failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error(`No token in Pesapal response`);
  return data.token;
}

async function getOrRegisterIPN(token: string, serverDomain: string): Promise<string> {
  const { ipnId } = getPesapalKeys();
  if (ipnId) return ipnId;
  const ipnUrl = `https://${serverDomain}/api/payments/webhook`;
  const res = await fetch(`${PESAPAL_BASE}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url: ipnUrl, ipn_notification_type: "POST" }),
  });
  if (!res.ok) throw new Error(`IPN registration failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { ipn_id?: string; id?: string };
  const id = data.ipn_id || data.id;
  if (!id) throw new Error(`No IPN ID: ${JSON.stringify(data)}`);
  return id;
}

async function getTransactionStatus(token: string, trackingId: string) {
  const res = await fetch(
    `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(trackingId)}`,
    { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`GetTransactionStatus failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// ─── POST /api/payments/initiate ─────────────────────────────────────────────

router.post("/payments/initiate", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }

  if (!isPesapalConfigured()) {
    res.status(503).json({ error: "Payment service not configured" });
    return;
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: "Server not configured" });
    return;
  }

  const jwt = authHeader.slice(7);
  const { data: { user }, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  try {
    const body = req.body as {
      acoin_amount?: number;
      currency?: string;
      payment_method?: "google_pay" | "card" | "mtn" | "airtel";
      payment_data?: Record<string, string>;
    };

    const { acoin_amount, currency, payment_method, payment_data } = body;

    if (!acoin_amount || typeof acoin_amount !== "number" || acoin_amount < 50) {
      res.status(400).json({ error: "Minimum top-up is 50 ACoin" });
      return;
    }

    const amount_usd = parseFloat((acoin_amount * 0.01).toFixed(2));
    const finalCurrency = (currency || "USD").toUpperCase();
    const merchantRef = `AFUCHAT-${user.id.replace(/-/g, "").slice(0, 12)}-${Date.now()}`;

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, handle")
      .eq("id", user.id)
      .single();

    const displayName = (
      (profile as any)?.display_name ||
      (profile as any)?.handle ||
      "AfuChat User"
    ).trim();
    const nameParts = displayName.split(" ");
    const firstName = nameParts[0] || "AfuChat";
    const lastName = nameParts.slice(1).join(" ") || "User";

    const token = await pesapalToken();
    const serverDomain =
      process.env.REPLIT_DEV_DOMAIN || req.hostname || "localhost";
    const ipnId = await getOrRegisterIPN(token, serverDomain);

    const orderPayload: Record<string, unknown> = {
      id: merchantRef,
      currency: finalCurrency,
      amount: amount_usd,
      description: `${acoin_amount} ACoin top-up`,
      callback_url: CALLBACK_URL,
      notification_id: ipnId,
      billing_address: {
        email_address: user.email || "",
        first_name: firstName,
        last_name: lastName,
      },
    };

    if (payment_method === "mtn" || payment_method === "airtel") {
      const phone = payment_data?.phone_number || "";
      if (!phone) {
        res.status(400).json({ error: "Phone number is required" });
        return;
      }
      const normalized = phone.startsWith("+")
        ? phone.replace(/[^\d+]/g, "")
        : `+${phone.replace(/\D/g, "")}`;
      (orderPayload.billing_address as any).phone_number = normalized;
      orderPayload.payment_method = payment_method === "mtn" ? "MTN" : "AIRTEL";
    } else if (payment_method === "card") {
      const { number, expiry_month, expiry_year, cvv, name_on_card } = payment_data || {};
      if (!number || !expiry_month || !expiry_year || !cvv) {
        res.status(400).json({ error: "Card details are incomplete" });
        return;
      }
      orderPayload.payment_method = "card";
      orderPayload.card = {
        number: number.replace(/\s/g, ""),
        expiry_month,
        expiry_year,
        cvv,
        name_on_card: name_on_card || displayName,
      };
    } else if (payment_method === "google_pay") {
      const gpToken = payment_data?.token;
      if (!gpToken) {
        res.status(400).json({ error: "Google Pay token is required" });
        return;
      }
      orderPayload.payment_method = "googlepay";
      orderPayload.google_pay_token = gpToken;
    }

    logger.info(
      { merchantRef, userId: user.id, method: payment_method, acoin_amount },
      "payments/initiate",
    );

    const orderRes = await fetch(`${PESAPAL_BASE}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const orderText = await orderRes.text();
    if (!orderRes.ok) {
      throw new Error(`Order submission failed (${orderRes.status}): ${orderText}`);
    }
    const orderData = JSON.parse(orderText) as {
      order_tracking_id?: string;
      redirect_url?: string;
    };

    const { error: insertErr } = await admin.from("pesapal_orders").insert({
      user_id: user.id,
      merchant_reference: merchantRef,
      tracking_id: orderData.order_tracking_id || null,
      acoin_amount,
      amount_usd,
      currency: finalCurrency,
      status: "pending",
    });
    if (insertErr) logger.error({ err: insertErr }, "pesapal_orders insert error");

    res.json({
      merchant_reference: merchantRef,
      order_tracking_id: orderData.order_tracking_id || null,
      redirect_url: orderData.redirect_url || null,
      status: "pending",
    });
  } catch (err: any) {
    logger.error({ err: err?.message }, "payments/initiate error");
    res.status(500).json({ error: err?.message || "Payment could not be started. Please try again." });
  }
});

// ─── POST /api/payments/webhook — Pesapal IPN ────────────────────────────────

router.post("/payments/webhook", async (req: Request, res: Response) => {
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: "Service unavailable" });
    return;
  }

  if (!isPesapalConfigured()) {
    res.status(503).json({ error: "Payment service not configured" });
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let orderTrackingId: string | null =
      url.searchParams.get("OrderTrackingId") || (req.body?.OrderTrackingId as string) || null;
    let merchantReference: string | null =
      url.searchParams.get("OrderMerchantReference") || (req.body?.OrderMerchantReference as string) || null;

    logger.info({ orderTrackingId, merchantReference }, "[pesapal-ipn] received");

    if (!orderTrackingId && !merchantReference) {
      res.status(400).json({ error: "Missing OrderTrackingId or OrderMerchantReference" });
      return;
    }

    let orderQuery = admin
      .from("pesapal_orders")
      .select("id, user_id, acoin_amount, merchant_reference, tracking_id, status");

    if (orderTrackingId) {
      orderQuery = (orderQuery as any).eq("tracking_id", orderTrackingId);
    } else {
      orderQuery = (orderQuery as any).eq("merchant_reference", merchantReference!);
    }

    const { data: order, error: orderError } = await (orderQuery as any).maybeSingle();

    if (orderError) {
      logger.error({ err: orderError }, "[pesapal-ipn] DB error");
      res.status(500).json({ error: "Database error" });
      return;
    }

    if (!order) {
      if (orderTrackingId && merchantReference) {
        const { data: fallback } = await admin
          .from("pesapal_orders")
          .select("id, user_id, acoin_amount, merchant_reference, tracking_id, status")
          .eq("merchant_reference", merchantReference)
          .maybeSingle();
        if (fallback) {
          if (!(fallback as any).tracking_id && orderTrackingId) {
            await admin
              .from("pesapal_orders")
              .update({ tracking_id: orderTrackingId })
              .eq("id", (fallback as any).id);
          }
          res.json(
            await processIpnOrder(
              admin,
              { ...(fallback as any), tracking_id: orderTrackingId || (fallback as any).tracking_id },
            ),
          );
          return;
        }
      }
      logger.warn({ orderTrackingId, merchantReference }, "[pesapal-ipn] order not found");
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const trackId = orderTrackingId || (order as any).tracking_id;
    if (trackId && !(order as any).tracking_id) {
      await admin.from("pesapal_orders").update({ tracking_id: trackId }).eq("id", (order as any).id);
    }

    const result = await processIpnOrder(admin, { ...(order as any), tracking_id: trackId });
    res.json(result);
  } catch (err: any) {
    logger.error({ err: err?.message }, "[pesapal-ipn] unhandled error");
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

async function processIpnOrder(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  order: {
    id: string;
    user_id: string;
    acoin_amount: number;
    merchant_reference: string;
    tracking_id: string | null;
    status: string;
  },
): Promise<Record<string, unknown>> {
  if (order.status === "completed") {
    return { message: "Already processed" };
  }

  const trackId = order.tracking_id;
  if (!trackId) {
    await admin.from("pesapal_orders").update({ status: "invalid" }).eq("id", order.id);
    return { error: "No tracking ID — cannot verify payment" };
  }

  const token = await pesapalToken();
  const statusData = (await getTransactionStatus(token, trackId)) as {
    status_code?: number;
    payment_status_description?: string;
  };

  logger.info({ statusData }, "[pesapal-ipn] Pesapal status response");

  const statusCode = statusData.status_code ?? 0;
  const paymentStatusDesc = (statusData.payment_status_description || "").toUpperCase();

  if (statusCode === 1 || paymentStatusDesc === "COMPLETED") {
    const { error: updateErr } = await admin
      .from("pesapal_orders")
      .update({ status: "completed", tracking_id: trackId })
      .eq("id", order.id)
      .eq("status", "pending");
    if (updateErr) logger.error({ err: updateErr }, "[pesapal-ipn] order update error");

    const { error: rpcErr } = await admin.rpc("credit_acoin", {
      p_user_id: order.user_id,
      p_amount: order.acoin_amount,
    });

    if (rpcErr) {
      logger.error({ err: rpcErr }, "[pesapal-ipn] credit_acoin RPC failed");
      await admin.from("pesapal_orders").update({ status: "pending" }).eq("id", order.id);
      return { error: "Failed to credit wallet, will retry" };
    }

    await admin.from("acoin_transactions").insert({
      user_id: order.user_id,
      amount: order.acoin_amount,
      transaction_type: "topup",
      metadata: {
        merchant_reference: order.merchant_reference,
        tracking_id: trackId,
        payment_provider: "pesapal",
        pesapal_status_code: statusCode,
      },
    });

    logger.info({ userId: order.user_id, acoin: order.acoin_amount }, "[pesapal-ipn] wallet credited");
    return { message: "Payment confirmed, wallet credited" };
  } else if ([2, 3, 4].includes(statusCode) || ["FAILED", "REVERSED", "INVALID"].includes(paymentStatusDesc)) {
    await admin.from("pesapal_orders").update({ status: "failed", tracking_id: trackId }).eq("id", order.id);
    return { message: "Payment failed or reversed", pesapal_status: paymentStatusDesc };
  } else {
    return { message: "Payment still pending", pesapal_status: paymentStatusDesc };
  }
}

// ─── GET /api/payments/status/:merchantRef ────────────────────────────────────

router.get("/payments/status/:merchantRef", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(503).json({ error: "Service unavailable" });
    return;
  }

  const jwt = authHeader.slice(7);
  const { data: { user }, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !user) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  try {
    const { merchantRef } = req.params;
    const { data: order } = await admin
      .from("pesapal_orders")
      .select("status, acoin_amount, tracking_id")
      .eq("merchant_reference", merchantRef)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({ status: (order as any).status, acoin_amount: (order as any).acoin_amount });
  } catch (err: any) {
    logger.error({ err: err?.message }, "payments/status error");
    res.status(500).json({ error: "Status check failed" });
  }
});

export default router;
