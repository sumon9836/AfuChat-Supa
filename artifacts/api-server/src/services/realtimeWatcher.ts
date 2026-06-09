/**
 * Realtime watcher — polls the database for events that require
 * email notifications (support tickets, orders, etc.).
 *
 * Uses polling via the direct Postgres connection (DATABASE_URL).
 * Email notifications are sent via Resend (RESEND_API_KEY).
 */

import { logger } from "../lib/logger";
import { query } from "../lib/db";
import {
  emailUserTicketCreated,
  emailStaffNewTicket,
} from "../lib/email";

let watcherStarted = false;

export function startRealtimeWatcher() {
  if (watcherStarted) return;

  const hasDb = !!process.env.DATABASE_URL;
  const hasResend = !!process.env.RESEND_API_KEY;

  if (!hasDb) {
    logger.info("[watcher] DATABASE_URL not configured — email watcher not started");
    return;
  }

  watcherStarted = true;
  logger.info("[watcher] Email watcher started (polling mode)");

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
        if (!hasResend) continue;

        const msgs = await query<any>(
          `SELECT message FROM public.support_messages
           WHERE ticket_id = $1 AND sender_type = 'user'
           ORDER BY created_at ASC LIMIT 1`,
          [ticket.id],
        );
        const preview = msgs[0]?.message || "(no message)";
        const userName = ticket.display_name || ticket.handle || "User";

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
    } catch (err) {
      logger.warn({ err }, "[watcher] ticket polling error (non-fatal)");
    }
  }, 30_000);

  logger.info("[watcher] Polling watchers active");
}
