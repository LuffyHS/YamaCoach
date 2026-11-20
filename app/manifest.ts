import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yama Coach",
    short_name: "Yama Coach",
    description: "Coaching e evolução competitiva no VALORANT.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#07090b",
    theme_color: "#07090b",
    icons: [{ src: "/icons/yama-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
