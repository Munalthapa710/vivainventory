"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster, toast } from "react-hot-toast";

const SW_VERSION = "2026-04-04-v2";

export default function Providers({ children }) {
  useEffect(() => {
    let isRefreshing = false;
    let updateIntervalId = null;
    let focusHandler = null;
    let controllerChangeHandler = null;

    function promptForUpdate(registration) {
      toast.custom(
        (currentToast) => (
          <div className="w-full max-w-sm rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/70">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
              App Update Ready
            </p>
            <h3 className="mt-2 text-base font-bold text-slate-900">
              A newer VivaInventory build is available.
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Refresh now to update the installed PWA shell and load the latest
              UI and fixes.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => toast.dismiss(currentToast.id)}
              >
                Later
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  toast.dismiss(currentToast.id);
                  registration.waiting?.postMessage({
                    type: "SKIP_WAITING"
                  });
                }}
              >
                Refresh app
              </button>
            </div>
          </div>
        ),
        {
          id: "vivainventory-pwa-update",
          duration: Number.POSITIVE_INFINITY
        }
      );
    }

    async function registerServiceWorker() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator)
      ) {
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register(
          `/sw.js?v=${SW_VERSION}`,
          {
            scope: "/"
          }
        );

        function watchInstallingWorker(worker) {
          if (!worker) {
            return;
          }

          worker.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              promptForUpdate(registration);
            }
          });
        }

        if (registration.waiting) {
          promptForUpdate(registration);
        }

        if (registration.installing) {
          watchInstallingWorker(registration.installing);
        }

        registration.addEventListener("updatefound", () => {
          watchInstallingWorker(registration.installing);
        });

        controllerChangeHandler = () => {
          if (isRefreshing) {
            return;
          }

          isRefreshing = true;
          window.location.reload();
        };

        navigator.serviceWorker.addEventListener(
          "controllerchange",
          controllerChangeHandler
        );

        focusHandler = () => {
          registration.update().catch(() => {
            // Ignore manual update failures.
          });
        };

        window.addEventListener("focus", focusHandler);

        updateIntervalId = window.setInterval(() => {
          registration.update().catch(() => {
            // Ignore periodic update failures.
          });
        }, 300000);

        await registration.update();
      } catch {
        // PWA registration should not interrupt the main app.
      }
    }

    registerServiceWorker();

    return () => {
      if (updateIntervalId) {
        window.clearInterval(updateIntervalId);
      }

      if (focusHandler) {
        window.removeEventListener("focus", focusHandler);
      }

      if (controllerChangeHandler && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          controllerChangeHandler
        );
      }
    };
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
