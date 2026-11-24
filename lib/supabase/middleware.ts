import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasAccess } from "@/lib/access";
import type { Profile } from "@/lib/types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isDashboard = pathname.startsWith("/dashboard");
  const isCheckout = pathname.startsWith("/checkout");
  const isLogin = pathname.startsWith("/login");

  if ((isDashboard || isCheckout) && !user) {
    return redirectTo(request, response, "/login");
  }

  if (user && (isDashboard || isLogin)) {
    const { data } = await supabase
      .from("profiles")
      .select("role, is_active, subscription_expires_at")
      .eq("id", user.id)
      .maybeSingle();
    const profile = data as Pick<Profile, "role" | "is_active" | "subscription_expires_at"> | null;
    if (isDashboard && (!profile || !hasAccess(profile))) {
      return redirectTo(request, response, "/checkout");
    }
    if (isLogin) {
      return redirectTo(request, response, profile && hasAccess(profile) ? "/dashboard" : "/checkout");
    }
  }

  return response;
}

import { getPublicOrigin } from "@/lib/public-origin";

// ... (keep updateSession as is, but fix redirectTo)

function redirectTo(request: NextRequest, response: NextResponse, pathname: string) {
  const url = new URL(pathname, getPublicOrigin(request));
  const redirect = NextResponse.redirect(url, 303);
  response.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });
  return redirect;
}
