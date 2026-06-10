/**
 * navigateToProfile — instant mention-tap navigation for logged-in users.
 *
 * For a logged-in user tapping @username in a post:
 *   1. Check the in-memory handle→id index (populated from every profile the
 *      user has already visited this session). If found → push directly to
 *      /contact/[id], completely skipping the [handle].tsx route.
 *   2. If the handle is not cached yet → fire a single Supabase lookup,
 *      seed both the id-index and profile cache, then navigate.
 *   3. For unauthenticated users → fall back to router.push("/@{handle}") so
 *      the public profile page renders as before.
 */

import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import {
  getProfileIdByHandle,
  setHandleId,
  setProfileCache,
} from "@/lib/profileCache";

export async function navigateToProfile(
  handle: string,
  isLoggedIn: boolean
): Promise<void> {
  const clean = handle.replace(/^@/, "").toLowerCase();

  if (!isLoggedIn) {
    router.push(`/@${clean}` as any);
    return;
  }

  const cachedId = getProfileIdByHandle(clean);
  if (cachedId) {
    router.push({ pathname: "/contact/[id]", params: { id: cachedId } });
    return;
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, handle, avatar_url, is_verified, is_organization_verified, is_business_mode")
    .eq("handle", clean)
    .maybeSingle();

  if (data?.id) {
    setHandleId(clean, data.id);
    setProfileCache(data.id, data as any);
    router.push({ pathname: "/contact/[id]", params: { id: data.id } });
    return;
  }

  const { data: alias } = await supabase
    .from("owned_usernames")
    .select("owner_id")
    .eq("handle", clean)
    .maybeSingle();

  if (alias?.owner_id) {
    setHandleId(clean, alias.owner_id);
    router.push({ pathname: "/contact/[id]", params: { id: alias.owner_id } });
    return;
  }

  router.push(`/@${clean}` as any);
}
