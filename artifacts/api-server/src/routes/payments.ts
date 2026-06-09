/**
 * /api/payments/* — Pesapal payment routes (ported from Supabase Edge Functions)
 *
 * POST /api/payments/initiate   — start a payment (all methods)
 * POST /api/payments/webhook    — Pesapal IPN handler
 * GET  /api/payments/status/:merchantRef — poll order status
 */

import { Router, type Request, type Response } from "express";
import { getAdminClient } from "../lib/supabase-admin";
import { authedUser as verifyAuth } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

function getPesapalEnv() {
  return process.env.PESAPAL_ENV || "live";
}

function getPesapalBase() {
  return getPesapalEnv() === "sandbox"
    ? "https://cybqa.pesapal.com/pesapalv3"
    : "https://pay.pesapal.com/v3";
}

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
  const res = await fetch(`${getPesapalBase()}/api/Auth/RequestToken`, {
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
  const res = await fetch(`${getPesapalBase()}/api/URLSetup/RegisterIPN`, {
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
    `${getPesapalBase()}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(trackingId)}`,
    { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`GetTransactionStatus failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// ─── POST /api/payments/initiate ─────────────────────────────────────────────

router.post("/payments/initiate", async (req: Request, res: Response) => {
  if (!isPesapalConfigured()) {
    res.status(503).json({ error: "Payment service not configured" });
    return;
  }

  const authUser = await verifyAuth(req, res as any);
  if (!authUser) return;

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
    const merchantRef = `AFUCHAT-${authUser.userId.replace(/-/g, "").slice(0, 12)}-${Date.now()}`;

    const supabase = getAdminClient();

    const [profileResult, authResult] = await Promise.all([
      supabase.from("profiles").select("display_name, handle").eq("id", authUser.userId).single(),
      supabase.auth.admin.getUserById(authUser.userId),
    ]);

    const profile = profileResult.data;
    const authUserData = authResult.data?.user;

    const displayName = (
      profile?.display_name ||
      profile?.handle ||
      "AfuChat User"
    ).trim();
    const userEmail = authUserData?.email || "";
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
        email_address: userEmail,
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
      { merchantRef, userId: authUser.userId, method: payment_method, acoin_amount },
      "payments/initiate",
    );

    const orderRes = await fetch(`${getPesapalBase()}/api/Transactions/SubmitOrderRequest`, {
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

    try {
      const { error: insertErr } = await supabase.from("pesapal_orders").insert({
        user_id: authUser.userId,
        merchant_reference: merchantRef,
        tracking_id: orderData.order_tracking_id || null,
        acoin_amount,
        amount_usd,
        currency: finalCurrency,
        status: "pending",
      });
      if (insertErr) logger.error({ err: insertErr }, "pesapal_orders insert error");
    } catch (dbErr) {
      logger.error({ err: dbErr }, "pesapal_orders insert error");
    }

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
  if (!isPesapalConfigured()) {
    res.status(503).json({ error: "Payment service not configured" });
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const orderTrackingId: string | null =
      url.searchParams.get("OrderTrackingId") || (req.body?.OrderTrackingId as string) || null;
    const merchantReference: string | null =
      url.searchParams.get("OrderMerchantReference") || (req.body?.OrderMerchantReference as string) || null;

    logger.info({ orderTrackingId, merchantReference }, "[pesapal-ipn] received");

    if (!orderTrackingId && !merchantReference) {
      res.status(400).json({ error: "Missing OrderTrackingId or OrderMerchantReference" });
      return;
    }

    const supabase = getAdminClient();
    const ORDER_COLS = "id, user_id, acoin_amount, merchant_reference, tracking_id, status";
    let order: PesapalOrder | null = null;

    if (orderTrackingId) {
      const { data } = await supabase
        .from("pesapal_orders")
        .select(ORDER_COLS)
        .eq("tracking_id", orderTrackingId)
        .limit(1)
        .single();
      order = data as PesapalOrder | null;
    } else {
      const { data } = await supabase
        .from("pesapal_orders")
        .select(ORDER_COLS)
        .eq("merchant_reference", merchantReference!)
        .limit(1)
        .single();
      order = data as PesapalOrder | null;
    }

    if (!order) {
      if (orderTrackingId && merchantReference) {
        const { data: fallback } = await supabase
          .from("pesapal_orders")
          .select(ORDER_COLS)
          .eq("merchant_reference", merchantReference)
          .limit(1)
          .single();
        if (fallback) {
          const fb = fallback as PesapalOrder;
          if (!fb.tracking_id && orderTrackingId) {
            await supabase
              .from("pesapal_orders")
              .update({ tracking_id: orderTrackingId })
              .eq("id", fb.id);
          }
          res.json(await processIpnOrder({ ...fb, tracking_id: orderTrackingId || fb.tracking_id }));
          return;
        }
      }
      logger.warn({ orderTrackingId, merchantReference }, "[pesapal-ipn] order not found");
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const trackId = orderTrackingId || order.tracking_id;
    if (trackId && !order.tracking_id) {
      const supabase2 = getAdminClient();
      await supabase2
        .from("pesapal_orders")
        .update({ tracking_id: trackId })
        .eq("id", order.id);
    }

    const result = await processIpnOrder({ ...order, tracking_id: trackId });
    res.json(result);
  } catch (err: any) {
    logger.error({ err: err?.message }, "[pesapal-ipn] unhandled error");
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

interface PesapalOrder {
  id: string;
  user_id: string;
  acoin_amount: number;
  merchant_reference: string;
  tracking_id: string | null;
  status: string;
}

async function processIpnOrder(order: PesapalOrder): Promise<Record<string, unknown>> {
  if (order.status === "completed") {
    return { message: "Already processed" };
  }

  const supabase = getAdminClient();
  const trackId = order.tracking_id;
  if (!trackId) {
    await supabase.from("pesapal_orders").update({ status: "invalid" }).eq("id", order.id);
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
    try {
      await supabase
        .from("pesapal_orders")
        .update({ status: "completed", tracking_id: trackId })
        .eq("id", order.id)
        .eq("status", "pending");
    } catch (e) {
      logger.error({ err: e }, "[pesapal-ipn] order update error");
    }

    try {
      const { error: rpcErr } = await supabase.rpc("credit_acoin", {
        p_user_id: order.user_id,
        p_amount: order.acoin_amount,
      });
      if (rpcErr) throw rpcErr;
    } catch (rpcErr) {
      logger.error({ err: rpcErr }, "[pesapal-ipn] credit_acoin failed");
      await supabase.from("pesapal_orders").update({ status: "pending" }).eq("id", order.id);
      return { error: "Failed to credit wallet, will retry" };
    }

    await supabase.from("acoin_transactions").insert({
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
    await supabase
      .from("pesapal_orders")
      .update({ status: "failed", tracking_id: trackId })
      .eq("id", order.id);
    return { message: "Payment failed or reversed", pesapal_status: paymentStatusDesc };
  } else {
    return { message: "Payment still pending", pesapal_status: paymentStatusDesc };
  }
}

// ─── GET /api/payments/status/:merchantRef ────────────────────────────────────

router.get("/payments/status/:merchantRef", async (req: Request, res: Response) => {
  const authUser = await verifyAuth(req, res as any);
  if (!authUser) return;

  try {
    const supabase = getAdminClient();
    const { data: order, error } = await supabase
      .from("pesapal_orders")
      .select("status, acoin_amount")
      .eq("merchant_reference", req.params.merchantRef)
      .eq("user_id", authUser.userId)
      .limit(1)
      .single();

    if (error || !order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({ status: order.status, acoin_amount: order.acoin_amount });
  } catch (err: any) {
    logger.error({ err: err?.message }, "payments/status error");
    res.status(500).json({ error: "Status check failed" });
  }
});

export default router;
