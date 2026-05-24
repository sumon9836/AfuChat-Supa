/**
 * AfuAI Conversation Persistence
 *
 * Stores the AfuAI conversation locally in SQLite using a fixed synthetic
 * conversation ID so it appears in the Chats screen and messages survive
 * app restarts — no Supabase sync needed.
 */

import { getDB } from "./storage/db";

export const AFUAI_CONV_ID = "__afuai__";
export const AFUAI_BOT_ID  = "__afuai_bot__";

export type AISQLMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sent_at: string;
};

/** Ensure the AfuAI conversation row exists in the local conversations table. */
export async function ensureAIChatExists(): Promise<void> {
  try {
    const db = await getDB();
    await db.runAsync(
      `INSERT OR IGNORE INTO conversations
       (id, name, is_group, is_channel, other_id, other_display_name, other_avatar,
        last_message, last_message_at, last_message_is_mine, last_message_status,
        is_pinned, is_archived, avatar_url, unread_count, is_verified,
        is_organization_verified, other_last_seen, other_show_online, stored_at)
       VALUES (?, 'AfuAI', 0, 0, ?, 'AfuAI', null,
               'Ask me anything…', ?, 0, 'sent',
               0, 0, null, 0, 0, 0, null, 0, ?)`,
      [AFUAI_CONV_ID, AFUAI_BOT_ID, new Date().toISOString(), Date.now()],
    );
  } catch {}
}

/** Persist a single message under the AfuAI conversation. */
export async function saveAIMessage(msg: {
  id: string;
  role: "user" | "assistant";
  content: string;
  sentAt: string;
  userId: string;
}): Promise<void> {
  await ensureAIChatExists();
  try {
    const db = await getDB();
    const senderId = msg.role === "user" ? msg.userId : AFUAI_BOT_ID;
    await db.runAsync(
      `INSERT OR IGNORE INTO messages
       (id, conversation_id, sender_id, content, attachment_url, attachment_type,
        reply_to_id, status, sent_at, edited_at, is_pending, synced, stored_at)
       VALUES (?, ?, ?, ?, null, null, null, 'sent', ?, null, 0, 1, ?)`,
      [msg.id, AFUAI_CONV_ID, senderId, msg.content, msg.sentAt, Date.now()],
    );
  } catch {}
}

/** Update the conversation row's last_message preview. */
export async function updateAILastMessage(
  preview: string,
  sentAt: string,
  isMine: boolean,
): Promise<void> {
  try {
    const db = await getDB();
    await db.runAsync(
      `UPDATE conversations
       SET last_message = ?, last_message_at = ?,
           last_message_is_mine = ?, stored_at = ?
       WHERE id = ?`,
      [preview.slice(0, 120), sentAt, isMine ? 1 : 0, Date.now(), AFUAI_CONV_ID],
    );
  } catch {}
}

/** Mark AfuAI messages as read (clear unread badge). */
export async function clearAIUnread(): Promise<void> {
  try {
    const db = await getDB();
    await db.runAsync(
      "UPDATE conversations SET unread_count = 0 WHERE id = ?",
      [AFUAI_CONV_ID],
    );
  } catch {}
}

/** Increment AfuAI unread counter (call when AI sends a reply and app is not focused on AfuAI). */
export async function incrementAIUnread(): Promise<void> {
  try {
    const db = await getDB();
    await db.runAsync(
      "UPDATE conversations SET unread_count = unread_count + 1 WHERE id = ?",
      [AFUAI_CONV_ID],
    );
  } catch {}
}

/** Load the last N messages from the AfuAI conversation for display. */
export async function loadAIHistory(limit = 80): Promise<AISQLMessage[]> {
  await ensureAIChatExists();
  try {
    const db = await getDB();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM (
         SELECT * FROM messages WHERE conversation_id = ?
         ORDER BY sent_at DESC LIMIT ?
       ) ORDER BY sent_at ASC`,
      [AFUAI_CONV_ID, limit],
    );
    return rows.map((r: any) => ({
      id: r.id,
      role: (r.sender_id === AFUAI_BOT_ID ? "assistant" : "user") as "user" | "assistant",
      content: r.content ?? "",
      sent_at: r.sent_at,
    }));
  } catch {
    return [];
  }
}

/** Return the conversation metadata for the ChatItem in the chats list. */
export async function getAIChatSnapshot(): Promise<{
  last_message: string;
  last_message_at: string;
  last_message_is_mine: boolean;
  unread_count: number;
} | null> {
  try {
    const db = await getDB();
    const row = await db.getFirstAsync<any>(
      `SELECT last_message, last_message_at, last_message_is_mine, unread_count
       FROM conversations WHERE id = ?`,
      [AFUAI_CONV_ID],
    );
    return row ?? null;
  } catch {
    return null;
  }
}

/** Delete all AfuAI messages (clear conversation). */
export async function clearAIHistory(): Promise<void> {
  try {
    const db = await getDB();
    await db.runAsync("DELETE FROM messages WHERE conversation_id = ?", [AFUAI_CONV_ID]);
    await db.runAsync(
      `UPDATE conversations SET last_message = 'Ask me anything…', last_message_at = ?, unread_count = 0 WHERE id = ?`,
      [new Date().toISOString(), AFUAI_CONV_ID],
    );
  } catch {}
}
