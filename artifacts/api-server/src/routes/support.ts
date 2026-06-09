import { Router, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../lib/logger";
import { emailUserStaffReply } from "../lib/email";
import { SUPABASE_URL } from "../lib/constants";
import { generateAiDraft } from "../services/aiAutoResponder";

const router = Router();

const supabaseUrl = SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * POST /api/support/inbound-email
 * Webhook endpoint for Resend inbound email processing.
 */
router.post("/support/inbound-email", async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    logger.info({ from: payload?.from }, "[support] Inbound email received");

    const toAddresses: string[] = payload?.to || [];
    let ticketId: string | null = null;
    for (const addr of toAddresses) {
      const match = addr.match(/support\+([0-9a-f-]{36})@afuchat\.com/i);
      if (match) { ticketId = match[1]; break; }
    }

    if (!ticketId) {
      res.status(200).json({ ok: true, note: "No ticket ID found in To address" });
      return;
    }

    const admin = getAdmin();

    const { data: ticket, error: ticketErr } = await admin
      .from("support_tickets")
      .select("id, user_id, status, subject")
      .eq("id", ticketId)
      .single();

    if (ticketErr || !ticket) {
      res.status(200).json({ ok: true, note: "Ticket not found" });
      return;
    }

    const messageBody = (payload?.text || payload?.html_body || "").trim();
    if (!messageBody) {
      res.status(200).json({ ok: true, note: "Empty message" });
      return;
    }

    await admin.from("support_messages").insert({
      ticket_id: ticketId,
      sender_id: ticket.user_id,
      sender_type: "user",
      message: messageBody.substring(0, 5000),
    });

    if (ticket.status === "resolved") {
      await admin
        .from("support_tickets")
        .update({ status: "open", updated_at: new Date().toISOString() })
        .eq("id", ticketId);
    }

    logger.info({ ticketId }, "[support] Inbound email added to ticket");
    res.status(200).json({ ok: true });
  } catch (err: any) {
    logger.error(err, "[support] Inbound email error");
    res.status(200).json({ ok: true });
  }
});

/**
 * POST /api/support/staff-reply
 * Staff-only: submit a reply to a ticket.
 */
router.post("/support/staff-reply", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const jwt = authHeader.slice(7);
    const admin = getAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !user) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin, is_support_staff, display_name, handle")
      .eq("id", user.id)
      .single();

    if (!profile || (!(profile as any).is_admin && !(profile as any).is_support_staff)) {
      res.status(403).json({ error: "Forbidden: not support staff" });
      return;
    }

    const { ticketId, message, isInternal = false, newStatus } = req.body;
    if (!ticketId || !message) {
      res.status(400).json({ error: "ticketId and message required" });
      return;
    }

    await admin.from("support_messages").insert({
      ticket_id: ticketId,
      sender_id: user.id,
      sender_type: "staff",
      message: String(message).substring(0, 5000),
      is_internal: Boolean(isInternal),
    });

    const updates: any = { updated_at: new Date().toISOString() };
    if (newStatus) updates.status = newStatus;
    if (newStatus === "in_progress" || newStatus === "resolved") updates.assigned_to = user.id;
    if (newStatus === "resolved") updates.resolved_at = new Date().toISOString();
    await admin.from("support_tickets").update(updates).eq("id", ticketId);

    if (!isInternal) {
      const { data: ticket } = await admin
        .from("support_tickets")
        .select("email, subject")
        .eq("id", ticketId)
        .single();

      if ((ticket as any)?.email) {
        const staffName = (profile as any).display_name || (profile as any).handle || "AfuChat Support";
        emailUserStaffReply({
          to: (ticket as any).email,
          ticketId,
          ticketSubject: (ticket as any).subject,
          staffName,
          replyText: message,
        }).catch((e) => logger.error(e, "[support] emailUserStaffReply failed"));
      }
    }

    res.json({ ok: true });
  } catch (err: any) {
    logger.error(err, "[support] staff-reply error");
    res.status(500).json({ error: "Internal error", detail: err.message });
  }
});

/**
 * PATCH /api/support/ticket/:id
 * Staff-only: update ticket status, priority, or assignment.
 */
router.patch("/support/ticket/:id", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
    const jwt = authHeader.slice(7);
    const admin = getAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !user) { res.status(401).json({ error: "Invalid token" }); return; }

    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin, is_support_staff")
      .eq("id", user.id)
      .single();

    if (!profile || (!(profile as any).is_admin && !(profile as any).is_support_staff)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const allowedFields = ["status", "priority", "assigned_to"];
    const updates: any = { updated_at: new Date().toISOString() };
    for (const f of allowedFields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    if (updates.status === "resolved") updates.resolved_at = new Date().toISOString();

    await admin.from("support_tickets").update(updates).eq("id", req.params.id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Internal error", detail: err.message });
  }
});

/**
 * POST /api/support/ai-draft/:id
 * Staff-only: (re)generate an AI draft reply for a ticket.
 * Useful when the automatic draft was skipped or needs refreshing.
 */
router.post("/support/ai-draft/:id", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
    const jwt = authHeader.slice(7);
    const admin = getAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !user) { res.status(401).json({ error: "Invalid token" }); return; }

    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin, is_support_staff")
      .eq("id", user.id)
      .single();

    if (!profile || (!(profile as any).is_admin && !(profile as any).is_support_staff)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const ticketId = req.params.id;
    const { data: ticket } = await admin
      .from("support_tickets")
      .select("id, subject, category")
      .eq("id", ticketId)
      .single();

    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

    const msgs = await admin
      .from("support_messages")
      .select("message")
      .eq("ticket_id", ticketId)
      .eq("sender_type", "user")
      .order("created_at", { ascending: true })
      .limit(1);

    const userMessage = (msgs.data?.[0] as any)?.message || "(no message)";

    // Delete any existing AI draft so it regenerates fresh
    if (req.body.force) {
      await admin
        .from("support_messages")
        .delete()
        .eq("ticket_id", ticketId)
        .eq("sender_type", "ai");
    }

    const ok = await generateAiDraft({
      ticketId: (ticket as any).id,
      subject: (ticket as any).subject,
      category: (ticket as any).category,
      userMessage,
    });

    res.json({ ok, regenerated: req.body.force ?? false });
  } catch (err: any) {
    logger.error(err, "[support] ai-draft error");
    res.status(500).json({ error: "Internal error", detail: err.message });
  }
});

export default router;
