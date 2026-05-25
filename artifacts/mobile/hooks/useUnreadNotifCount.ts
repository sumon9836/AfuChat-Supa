import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUnreadNotifCount(userId: string | undefined): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)
      .then(({ count: c }) => { setCount(c ?? 0); });
    const ch = supabase
      .channel(`notif-badge-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => setCount((c) => c + 1))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("read", false).then(({ count: c }) => setCount(c ?? 0));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);
  return count;
}
