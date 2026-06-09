/**
 * Realtime watcher — polls Supabase for events that need async processing:
 *   • New support tickets  → send confirmation emails + generate AI draft reply
 *
 * Uses polling via the direct Supabase PostgreSQL connection (SUPABASE_DB_URL).
 * Email notifications are sent via Resend (RESEND_API_KEY).
 * AI drafts are generated via Groq/Gemini (GROQ_API_KEY / GEMINI_API_KEY).
 */

import { logger } from "../lib/logger";
import { query } from "../lib/db";
import {
  emailUserTicketCreated,
  emailStaffNewTicket,
} from "../lib/email";
import { generateAiDraft } from "./aiAutoResponder";

let watcherStarted = false;

export function startRealtimeWatcher() {
  if (watcherStarted) return;

  const hasDb = !!(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL);
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasAi = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY);

  if (!hasDb) {
    logger.info("[watcher] DATABASE_URL not configured — watcher not started");
    return;
  }

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

      const tickets = await query<any>(
        `SELECT t.*, p.display_name, p.handle
         FROM public.support_tickets t
         LEFT JOIN public.profiles p ON p.id = t.user_id
         WHERE t.created_at > $1
         ORDER BY t.created_at ASC`,
        [cutoff],
      );

      for (const ticket of tickets) {
        // Fetch the first user message for this ticket
        const msgs = await query<any>(
          `SELECT message FROM public.support_messages
           WHERE ticket_id = $1 AND sender_type = 'user'
           ORDER BY created_at ASC LIMIT 1`,
          [ticket.id],
        ).catch(() => []);

        const preview = msgs[0]?.message || "(no message)";
        const userName = ticket.display_name || ticket.handle || "User";

        // ── Email notifications ──────────────────────────────────────────
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

        // ── AI draft generation ──────────────────────────────────────────
        // Fire-and-forget: a failed draft never blocks email delivery.
        // The draft appears in the ticket thread as sender_type = 'ai'.
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

      if (tickets.length > 0) {
        logger.info({ count: tickets.length }, "[watcher] Processed new tickets");
      }
    } catch (err) {
      logger.warn({ err }, "[watcher] ticket polling error (non-fatal)");
    }
  }, 30_000);

  logger.info("[watcher] Polling watchers active");
}
