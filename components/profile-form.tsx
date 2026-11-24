"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Camera, Save } from "lucide-react";
import Image from "next/image";
import { ValorantRankBadge } from "@/components/valorant-rank-badge";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  riot_id: string | null;
  avatar_url: string | null;
  role: string;
  current_rank: string | null;
  target_rank: string | null;
};

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [riotId, setRiotId] = useState(profile?.riot_id || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    setError("");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `avatars/${profile.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const newUrl = urlData.publicUrl;
      setAvatarUrl(newUrl);

      await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", profile.id);
      setMessage("Foto atualizada.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ full_name: fullName, riot_id: riotId || null })
        .eq("id", profile.id);
      if (updateError) throw updateError;
      setMessage("Perfil salvo com sucesso.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const initials = (fullName || profile?.full_name || "?").slice(0, 1).toUpperCase();

  return (
    <div className="profile-form">
      <div className="profile-avatar-section">
        <div className="profile-avatar-wrapper">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Avatar" width={96} height={96} className="profile-avatar-img" />
          ) : (
            <span className="profile-avatar-initials">{initials}</span>
          )}
          <label className="profile-avatar-upload" title="Alterar foto">
            <Camera size={16} />
            <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} style={{ display: "none" }} />
          </label>
        </div>
        {uploading && <span className="profile-upload-status">Enviando…</span>}
      </div>

      <div className="profile-fields">
        <label className="label">Nome completo
          <input className="field" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={100} />
        </label>
        <label className="label">E-mail
          <input className="field" value={profile?.email || ""} disabled />
        </label>
        <label className="label">Riot ID
          <input className="field" value={riotId} onChange={e => setRiotId(e.target.value)} maxLength={80} placeholder="Nome#TAG" />
        </label>
        {profile?.role === "student" && (
          <div className="profile-ranks">
            <span>Elo atual: <ValorantRankBadge rank={profile.current_rank} size="sm" /></span>
            <span>Meta: <ValorantRankBadge rank={profile.target_rank} size="sm" /></span>
          </div>
        )}
      </div>

      {message && <div className="recovery-success" role="status">{message}</div>}
      {error && <div className="recovery-error" role="alert">{error}</div>}

      <div className="profile-save-row">
        <button className="button primary" onClick={() => void handleSave()} disabled={saving}>
          <Save size={16} /> {saving ? "Salvando…" : "Salvar perfil"}
        </button>
      </div>
    </div>
  );
}
