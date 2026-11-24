import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

const profileColumns =
  "id, email, full_name, role, initial_rank, current_rank, target_rank, rank_goal_start, coach_id, is_active, subscription_expires_at, created_at, setup, recurring_errors, riot_id, subscription_status, avatar_url";

export async function getSessionUser(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select(profileColumns).eq("id", user.id).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function signOut() {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  await supabase.auth.signOut();
}
