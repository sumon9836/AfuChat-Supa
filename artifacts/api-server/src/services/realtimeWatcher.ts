/**
 * Realtime watcher — polls Supabase for events that need async processing:
 *   • New support tickets  → send confirmation emails + generate AI draft reply
 *
 * Uses polling via the Supabase JS admin client (HTTPS/PostgREST).
 * Email notifications are sent via Resend (RESEND_API_KEY).
 * AI drafts are generated via Groq/Gemini (GROQ_API_KEY / GEMINI_API_KEY).
 */

import { logger } from "../lib/logger";
import { getAdminClient } from "../lib/supabase-admin";
import {
  emailUserTicketCreated,
  emailStaffNewTicket,
} from "../lib/email";
import { generateAiDraft } from "./aiAutoResponder";

let watcherStarted = false;

export function startRealtimeWatcher() {
  if (watcherStarted) return;

  const hasResend = !!process.env.RESEND_API_KEY;
  const hasAi = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY);

  watcherStarted = true;
  logger.info(
    { hasResend, hasAi },
    "[watcher] Support watcher started (polling mode, 30s interval)",
  );

  let lastTicketCheck = new Date();

  setInterval(async () => {
    try {
      const cutoff = lastTicketCheck.toISOString();
      lastTicketCheck = new Date();

      const supabase = getAdminClient();

      const { data: tickets, error: ticketsErr } = await supabase
        .from("support_tickets")
        .select("*, profiles:user_id(display_name, handle)")
        .gt("created_at", cutoff)
        .order("created_at", { ascending: true });

      if (ticketsErr) {
        logger.warn({ err: ticketsErr }, "[watcher] ticket query error (non-fatal)");
        return;
      }

      for (const ticket of tickets ?? []) {
        const profile = (ticket as any).profiles as { display_name: string | null; handle: string | null } | null;

        const { data: msgs } = await supabase
          .from("support_messages")
          .select("message")
          .eq("ticket_id", ticket.id)
          .eq("sender_type", "user")
          .order("created_at", { ascending: true })
          .limit(1);

        const preview = msgs?.[0]?.message || "(no message)";
        const userName = profile?.display_name || profile?.handle || "User";

        if (hasResend) {
          if (ticket.email) {
            emailUserTicketCreated({
              to: ticket.email,
              ticketId: ticket.id,
              subject: ticket.subject,
              category: ticket.category,
              preview,
            }).catch((e) => logger.error(e, "[watcher] emailUserTicketCreated failed"));
          }

          emailStaffNewTicket({
            ticketId: ticket.id,
            subject: ticket.subject,
            category: ticket.category,
            priority: ticket.priority,
            userEmail: ticket.email || "",
            userName,
            preview,
          }).catch((e) => logger.error(e, "[watcher] emailStaffNewTicket failed"));
        }

        if (hasAi && preview !== "(no message)") {
          generateAiDraft({
            ticketId: ticket.id,
            subject: ticket.subject,
            category: ticket.category,
            userMessage: preview,
            userName,
          }).catch((e) => logger.error(e, "[watcher] generateAiDraft failed"));
        }
      }

      if ((tickets?.length ?? 0) > 0) {
        logger.info({ count: tickets!.length }, "[watcher] Processed new tickets");
      }
    } catch (err) {
      logger.warn({ err }, "[watcher] ticket polling error (non-fatal)");
    }
  }, 30_000);

  logger.info("[watcher] Polling watchers active");
}
