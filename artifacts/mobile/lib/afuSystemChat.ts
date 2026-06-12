import { supabase } from "@/lib/supabase";

export const AFUCHAT_SYSTEM_ID = "54dfbcea-2b4b-4f25-bcff-d09084b5b65a";

/**
 * Ensure the system notification chat from @afuchat exists for this user.
 * Returns the chat ID so callers can navigate directly to it.
 * Idempotent — safe to call multiple times.
 */
export async function ensureAfuSystemChat(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("get_or_create_system_chat", {
      p_user_id: userId,
    });
    if (error || !data) return null;
    return data as string;
  } catch {
    return null;
  }
}
