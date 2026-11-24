import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/env";
import { getPublicOrigin } from "@/lib/public-origin";

const bodySchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  signup: z.boolean().optional().default(false),
  name: z.string().trim().min(1).max(100).optional(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const limit = rateLimit(`auth:${ip}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json(
    { error: "Muitas tentativas. Aguarde um minuto." },
    { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
  );

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (parsed.data.signup && !parsed.data.name)) {
    return NextResponse.json({ error: "Dados de acesso inválidos." }, { status: 400 });
  }
  const body = parsed.data;
  const email = body.email.toLowerCase();

  if (isSupabaseConfigured()) {
    try {
      let response = NextResponse.json({});
      const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return (request.headers.get("cookie") || "").split(";").filter(Boolean).map((entry) => {
                const separator = entry.indexOf("=");
                const name = entry.slice(0, separator).trim();
                const rawValue = entry.slice(separator + 1).trim();
                try { return { name, value: decodeURIComponent(rawValue) }; }
                catch { return { name, value: rawValue }; }
              });
            },
            setAll(cookies) { pendingCookies.push(...cookies); },
          },
        },
      );

      if (body.signup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: body.password,
          options: {
            data: { full_name: body.name, role: "student" },
            emailRedirectTo: `${getPublicOrigin(request)}/auth/callback`,
          },
        });
        if (error || !data.user) return NextResponse.json({ error: error?.message || "Não foi possível criar a conta." }, { status: 400 });
        if (!data.session) {
          response = NextResponse.json({ redirect: "/login?registered=1", message: "Confirme seu e-mail para entrar." });
          response.cookies.set("yama_signup_notice", "1", { path: "/", sameSite: "lax", httpOnly: true, maxAge: 120 });
          return response;
        }
        response = NextResponse.json({ redirect: "/checkout" });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: body.password });
        if (error || !data.user) return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
        const { data: profile, error: profileError } = await supabase.from("profiles")
          .select("role,is_active,subscription_expires_at").eq("id", data.user.id).maybeSingle();
        if (profileError) return NextResponse.json({ error: "Não foi possível carregar seu perfil." }, { status: 500 });
        if (!profile) return NextResponse.json({ error: "Perfil não encontrado. Verifique se a migração do Supabase foi aplicada." }, { status: 409 });
        const active = profile.role === "coach" || (
          profile.is_active && profile.subscription_expires_at && new Date(profile.subscription_expires_at).getTime() > Date.now()
        );
        response = NextResponse.json({ redirect: active ? "/dashboard" : "/checkout" });
      }

      pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      return response;
    } catch {
      return NextResponse.json({ error: "Não foi possível conectar ao Supabase. Confira a conexão e se o projeto está ativo." }, { status: 503 });
    }
  }
  return NextResponse.json({ error: "Autenticação indisponível. Configure as variáveis do Supabase." }, { status: 503 });
}
