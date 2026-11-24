import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { DESKTOP_COOKIE, DESKTOP_QUERY_PARAM, isDesktopServerSide } from "@/lib/is-desktop";
import { getPublicOrigin } from "@/lib/public-origin";

function createSupabase(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
}

export default async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const isDesktop = isDesktopServerSide(request.headers, request.cookies, url.searchParams);

  // Persist desktop mode in cookie when detected via query/UA.
  const response = NextResponse.next();
  if (isDesktop && request.cookies.get(DESKTOP_COOKIE)?.value !== "1") {
    response.cookies.set(DESKTOP_COOKIE, "1", { path: "/", sameSite: "lax" });
  }

  // If Supabase is not configured, skip auth checks.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Root route: desktop never sees the landing page.
    if (url.pathname === "/" && isDesktop) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  const supabase = createSupabase(request, response);
  const { data: { user } } = await supabase.auth.getUser();

  // Root route: desktop never sees the landing page.
  if (url.pathname === "/" && isDesktop) {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", getPublicOrigin(request)), 303);
    }
    return NextResponse.redirect(new URL("/login", getPublicOrigin(request)), 303);
  }

  // /login: redirect authenticated users to /dashboard (no redirect loop).
  if (url.pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/dashboard", getPublicOrigin(request)), 303);
  }

  // /dashboard/*: redirect unauthenticated users to /login.
  if (url.pathname.startsWith("/dashboard") && !user) {
    return NextResponse.redirect(new URL("/login", getPublicOrigin(request)), 303);
  }

  // When desktop query param present on any route, set cookie (already done above).
  if (url.searchParams.get(DESKTOP_QUERY_PARAM) === "1" && !request.cookies.get(DESKTOP_COOKIE)) {
    response.cookies.set(DESKTOP_COOKIE, "1", { path: "/", sameSite: "lax" });
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/checkout"],
};
