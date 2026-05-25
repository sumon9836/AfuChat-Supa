/**
 * AfuAI Long-Term Memory
 *
 * Stores user preferences and facts that AfuAI should remember across sessions.
 * Persisted locally in SQLite — survives app restarts, never synced to server.
 *
 * Examples:
 *   "prefers dark theme"
 *   "shop is called AfuTech Store"
 *   "favorite color: blue"
 */

import { getDB } from "./storage/db";

export type AIMemory = {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
};

/**
 * Save or update a memory. Uses `key` as unique identifier — saving the same
 * key again overwrites the previous value.
 */
export async function saveMemory(key: string, value: string): Promise<void> {
  try {
    const db = await getDB();
    const now = new Date().toISOString();
    const normalizedKey = key.toLowerCase().trim().slice(0, 120);
    const normalizedVal = value.trim().slice(0, 500);
    if (!normalizedKey || !normalizedVal) return;
    await db.runAsync(
      `INSERT INTO ai_memories (id, key, value, created_at, updated_at)
       VALUES (lower(hex(randomblob(8))), ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [normalizedKey, normalizedVal, now, now],
    );
  } catch {}
}

/** Load all stored memories, newest first (max 50). */
export async function loadMemories(): Promise<AIMemory[]> {
  try {
    const db = await getDB();
    return await db.getAllAsync<AIMemory>(
      "SELECT * FROM ai_memories ORDER BY updated_at DESC LIMIT 50",
    );
  } catch {
    return [];
  }
}

/** Delete a single memory by key. */
export async function deleteMemory(key: string): Promise<void> {
  try {
    const db = await getDB();
    await db.runAsync("DELETE FROM ai_memories WHERE key = ?", [key.toLowerCase().trim()]);
  } catch {}
}

/** Wipe all memories. */
export async function clearMemories(): Promise<void> {
  try {
    const db = await getDB();
    await db.runAsync("DELETE FROM ai_memories");
  } catch {}
}

/**
 * Format memories for inclusion in the AI system prompt.
 * Returns empty string if there are no memories.
 */
export function formatMemoriesForPrompt(memories: AIMemory[]): string {
  if (memories.length === 0) return "";
  return memories.map((m) => `• ${m.key}: ${m.value}`).join("\n");
}
