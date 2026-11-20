import type { Profile } from "@/lib/types";

export function hasAccess(profile: Pick<Profile, "role" | "is_active" | "subscription_expires_at">) {
  if (profile.role === "coach") return true;
  if (!profile.is_active || !profile.subscription_expires_at) return false;
  return new Date(profile.subscription_expires_at).getTime() > Date.now();
}

export function accessLabel(profile: Pick<Profile, "role" | "is_active" | "subscription_expires_at">) {
  if (profile.role === "coach") return "Coach";
  if (hasAccess(profile)) return "Ativo";
  if (profile.subscription_expires_at && new Date(profile.subscription_expires_at).getTime() < Date.now()) {
    return "Expirado";
  }
  return "Sem plano";
}
