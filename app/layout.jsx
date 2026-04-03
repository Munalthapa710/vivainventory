import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "VivaInventory",
    template: "%s | VivaInventory"
  },
  description: "Inventory management for construction teams.",
  applicationName: "VivaInventory",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VivaInventory"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f97316"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
