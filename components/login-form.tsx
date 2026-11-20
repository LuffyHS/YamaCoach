"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export function LoginForm({ initialSignup = false }: { initialSignup?: boolean }) {
  const router = useRouter();
  const [signup, setSignup] = useState(initialSignup);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const address = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        if (signup) {
          const name = String(form.get("name") || "").trim();
          const { data, error: authError } = await supabase.auth.signUp({
            email: address,
            password,
            options: {
              data: { full_name: name, role: "student" },
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });
          if (authError) throw authError;
          if (!data.session) {
            setNotice("Conta criada. Se a confirmação por e-mail estiver ativada no Supabase, confira sua caixa de entrada e o spam; depois entre normalmente.");
            return;
          }
          router.refresh();
          router.push("/checkout");
          return;
        }

        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: address, password });
        if (authError) throw authError;
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role,is_active,subscription_expires_at")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (!profile) {
          await supabase.auth.signOut();
          throw new Error("Sua conta existe no Supabase Auth, mas falta o perfil em public.profiles. Não crie outra conta: execute supabase/auth-profile-trigger.sql no SQL Editor para corrigir e recuperar esse cadastro.");
        }

        const active = profile.role === "coach" || (
          profile.is_active && profile.subscription_expires_at &&
          new Date(profile.subscription_expires_at).getTime() > Date.now()
        );
        router.refresh();
        router.push(active ? "/dashboard" : "/checkout");
        return;
      }

      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: address,
          password,
          signup,
          ...(signup ? { name: String(form.get("name") || ""), role: "student" } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível autenticar.");
      if (result.message) setNotice(result.message);
      router.refresh();
      router.push(result.redirect);
    } catch (caught) {
      if (caught instanceof TypeError && /fetch/i.test(caught.message)) {
        setError("Não foi possível conectar ao Supabase. Confira sua internet e se o projeto Supabase está ativo e com a URL correta.");
      } else {
        setError(caught instanceof Error ? caught.message : "Falha ao conectar ao serviço de autenticação.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card form-card">
      <h1>{signup ? "Crie sua conta" : "Bem-vindo de volta"}</h1>
      <p>{signup ? "Comece sua jornada de evolução no VALORANT." : "Entre para continuar seu treino."}</p>
      <form onSubmit={submit}>
        {signup && <>
          <label className="label" htmlFor="signup-name">Nome completo</label>
          <input required id="signup-name" name="name" maxLength={100} className="field" placeholder="Seu nome" autoComplete="name" />
        </>}
        <label className="label" htmlFor="auth-email">E-mail</label>
        <input required id="auth-email" type="email" name="email" maxLength={254} autoComplete="email" className="field" placeholder="voce@email.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="label" htmlFor="auth-password">Senha</label>
        <input required minLength={8} maxLength={128} id="auth-password" type="password" name="password" autoComplete={signup ? "new-password" : "current-password"} className="field" placeholder="Mínimo 8 caracteres" />
        <button className="button primary" disabled={busy} style={{ width: "100%" }}>{busy ? "Aguarde…" : signup ? "Criar conta" : "Entrar"}</button>
        {error && <div className="recovery-error" role="alert">{error}</div>}
        {notice && <div className="recovery-success" role="status">{notice}</div>}
        {!signup && <Link className="forgot-link" href="/forgot-password">Esqueci minha senha</Link>}
      </form>
      <button className="nav-link" onClick={() => { setSignup(!signup); setError(""); setNotice(""); }}>
        {signup ? "Já tenho uma conta" : "Criar conta de aluno"}
      </button>
    </section>
  );
}
