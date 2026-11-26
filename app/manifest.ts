import type { MetadataRoute } from "next";

/**
 * The app's install details: Next.js serves this at /manifest.webmanifest and links it from every page.
 * Phones and computers use it to install the app with its own name, icon and window.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "projecTracker",
    short_name: "projecTracker",
    description: "Projects, BOQ, drawings, materials, labour, equipment and payments for every site.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#111111", // the splash screen while the app opens: the logo's black tile
    theme_color: "#ffffff", // the phone's status bar: matches the app's white header
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}