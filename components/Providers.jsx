"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }) {
  useEffect(() => {
    async function registerServiceWorker() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator)
      ) {
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/"
        });

        await registration.update();
      } catch {
        // PWA registration should not interrupt the main app.
      }
    }

    registerServiceWorker();
  }, []);

  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "18px",
            border: "1px solid #e2e8f0",
            padding: "14px 16px"
          }
        }}
      />
    </SessionProvider>
  );
}
