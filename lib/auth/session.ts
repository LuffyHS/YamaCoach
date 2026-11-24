import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/env";

const profileColumns =
  "id, email, full_name, role, initial_rank, current_rank, target_rank, rank_goal_start, coach_id, is_active, subscription_expires_at, created_at, setup, recurring_errors, riot_id, subscription_status, avatar_url";

const profileColumnsFallback =
  "id, email, full_name, role, initial_rank, current_rank, target_rank, rank_goal_start, coach_id, is_active, subscription_expires_at, created_at, setup, recurring_errors, riot_id, subscription_status";

export async function getSessionUser(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const primary = await supabase.from("profiles").select(profileColumns).eq("id", user.id).maybeSingle();
  let row: Record<string, unknown> | null = primary.data as Record<string, unknown> | null;
  if (primary.error && /avatar_url/i.test(primary.error.message || "")) {
    const fallback = await supabase.from("profiles").select(profileColumnsFallback).eq("id", user.id).maybeSingle();
    row = fallback.data;
    if (fallback.error) return null;
  } else if (primary.error) {
    return null;
  }
  return (row as Profile | null) ?? null;
}

export async function signOut() {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  await supabase.auth.signOut();
}
