import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Planster",
    short_name: "Planster",
    description:
      "The most complete writing environment for authors and beta readers.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2C2153",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
