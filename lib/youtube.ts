export function youtubeId(url: string) {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
      if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
      else if (/^\/(embed|shorts|live)\/[A-Za-z0-9_-]{11}\/?$/.test(parsed.pathname)) id = parsed.pathname.split("/")[2];
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function embedUrl(url: string) {
  const id = youtubeId(url);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
