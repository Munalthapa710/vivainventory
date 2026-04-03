"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function PwaInstallButton({
  compact = false,
  className = "",
  variant = "secondary"
}) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneMode());

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      toast.success("VivaInventory installed.");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt || installing) {
      return;
    }

    setInstalling(true);

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;

      if (choice?.outcome !== "accepted") {
        toast("Install dismissed.", {
          icon: "i"
        });
      }
    } catch {
      toast.error("Unable to open install prompt.");
    } finally {
      setInstalling(false);
      setInstallPrompt(null);
    }
  }

  if (installed || !installPrompt) {
    return null;
  }

  const buttonClass =
    variant === "primary" ? "btn-primary" : "btn-secondary";

  return (
    <button
      type="button"
      className={`${buttonClass} ${compact ? "px-3 py-2.5" : ""} ${className}`.trim()}
      onClick={handleInstall}
    >
      <Download className="h-4 w-4" />
      {compact ? null : <span>{installing ? "Preparing..." : "Install App"}</span>}
    </button>
  );
}
