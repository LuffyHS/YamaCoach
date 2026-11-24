import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) return <main className="content"><div className="recovery-error">Sessão expirada. Entre novamente.</div></main>;

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id, full_name, email, riot_id, avatar_url, role, current_rank, target_rank").eq("id", user.id).maybeSingle();

  return <main className="content">
    <div className="page-heading"><div><h1>Meu Perfil</h1><p>Gerencie sua foto, nome, Riot ID e senha.</p></div></div>
    <ProfileForm profile={profile} />
  </main>;
}
