import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { DESKTOP_COOKIE, DESKTOP_QUERY_PARAM, isDesktopServerSide } from "@/lib/is-desktop";

export default async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const isDesktop = isDesktopServerSide(request.headers, request.cookies, url.searchParams);

  // Persist desktop mode in cookie when detected via query/UA.
  const response = NextResponse.next();
  if (isDesktop && request.cookies.get(DESKTOP_COOKIE)?.value !== "1") {
    response.cookies.set(DESKTOP_COOKIE, "1", { path: "/", sameSite: "lax" });
  }

  // Root route: desktop never sees the landing page.
  if (url.pathname === "/" && isDesktop) {
    const supabase = createServerClient(
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
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
