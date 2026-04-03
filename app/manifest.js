export default function manifest() {
  return {
    id: "/",
    name: "VivaInventory",
    short_name: "VivaInventory",
    description: "Inventory management for construction teams.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#f97316",
    lang: "en-US",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any maskable"
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ],
    shortcuts: [
      {
        name: "Sign In",
        short_name: "Login",
        url: "/login"
      },
      {
        name: "Offline Info",
        short_name: "Offline",
        url: "/offline.html"
      }
    ]
  };
}
