import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getPublicOrigin } from "@/lib/public-origin";

export async function GET(request: NextRequest) {
  const pending: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies) {
          cookies.forEach((c) => {
            request.cookies.set(c.name, c.value);
            pending.push(c);
          });
        },
      },
    }
  );
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  let destination = safeNext;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user && safeNext === "/dashboard") {
      const { data: p } = await supabase.from("profiles").select("role, is_active, subscription_expires_at").eq("id", data.user.id).maybeSingle();
      destination = p?.role === "coach" || (p?.is_active && p.subscription_expires_at && new Date(p.subscription_expires_at) > new Date()) ? "/dashboard" : "/checkout";
    }
  }
  const origin = getPublicOrigin(request);
  const response = NextResponse.redirect(new URL(destination, origin), 303);
  pending.forEach((c) => response.cookies.set(c.name, c.value, c.options));
  return response;
}
