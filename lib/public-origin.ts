export function getPublicOrigin(request?: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/$/, "");
  }

  if (request) {
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (forwardedHost && !forwardedHost.includes("localhost") && !forwardedHost.includes("127.0.0.1")) {
      const proto = forwardedProto || "https";
      return `${proto}://${forwardedHost}`;
    }
    try {
      const url = new URL(request.url);
      if (!url.hostname.includes("localhost") && !url.hostname.includes("127.0.0.1") && url.hostname !== "0.0.0.0") {
        return url.origin;
      }
    } catch {
      // ignore
    }
  }

  return "https://yamacoach.onrender.com";
}
