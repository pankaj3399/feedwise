import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Feedwise — doomscroll, but wiser",
    short_name: "Feedwise",
    description:
      "An endless feed of ideas worth remembering, pulled from the best engineering essays.",
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08080a",
    theme_color: "#08080a",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "My feed", short_name: "Feed", url: "/feed" },
      { name: "Saved ideas", short_name: "Saved", url: "/saved" },
      { name: "Daily quiz", short_name: "Quiz", url: "/quiz" },
    ],
  };
}
