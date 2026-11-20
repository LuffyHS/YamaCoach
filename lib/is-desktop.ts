export const DESKTOP_QUERY_PARAM = "desktop";
export const DESKTOP_COOKIE = "yama_desktop";
export const DESKTOP_UA_MARKER = "YamaCoachDesktop";

export function isDesktopClient(): boolean {
  if (typeof window === "undefined") return false;
  if ((window as unknown as { __YAMA_DESKTOP__?: boolean }).__YAMA_DESKTOP__) return true;
  const ua = window.navigator?.userAgent ?? "";
  return ua.includes("Electron") || ua.includes(DESKTOP_UA_MARKER);
}

export function isDesktopServerSide(
  headers: Headers,
  cookies: { get: (name: string) => { value: string } | undefined },
  searchParams?: URLSearchParams
): boolean {
  if (searchParams?.get(DESKTOP_QUERY_PARAM) === "1") return true;
  if (cookies.get(DESKTOP_COOKIE)?.value === "1") return true;
  const ua = headers.get("user-agent") ?? "";
  return ua.includes("Electron") || ua.includes(DESKTOP_UA_MARKER);
}
