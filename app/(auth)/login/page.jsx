"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import AppSplashScreen from "@/components/AppSplashScreen";
import BrandLogo from "@/components/BrandLogo";
import PwaInstallButton from "@/components/PwaInstallButton";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const sessionExpired = searchParams.get("reason") === "session-expired";

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      const nextPath =
        session.user.mustChangePassword
          ? session.user.role === "admin"
            ? "/admin/settings?forcePasswordChange=1"
            : "/employee/settings?forcePasswordChange=1"
          : session.user.role === "admin"
            ? "/admin/dashboard"
            : "/employee/dashboard";

      window.location.replace(nextPath);
    }
  }, [session, status]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success("Login successful.");

      const sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store"
      });
      const freshSession = await sessionResponse.json();

      const nextPath =
        freshSession?.user?.mustChangePassword
          ? freshSession?.user?.role === "admin"
            ? "/admin/settings?forcePasswordChange=1"
            : "/employee/settings?forcePasswordChange=1"
          : freshSession?.user?.role === "admin"
            ? "/admin/dashboard"
            : "/employee/dashboard";

      window.location.assign(nextPath);
    } catch (error) {
      toast.error(error.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return <AppSplashScreen subtitle="Checking your account" />;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf3_0%,#f8fafc_42%,#e8eef7_100%)] pt-[var(--safe-area-top)] text-slate-900">
      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.08),_transparent_26%),linear-gradient(180deg,#fffaf4_0%,#f8fafc_54%,#eef2ff_100%)]" />
        <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle,_rgba(249,115,22,0.18),transparent_68%)] blur-3xl" />

        <div className="relative w-full max-w-lg rounded-[2rem] border border-white/80 bg-white/92 p-7 text-slate-900 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur sm:p-8 xl:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Welcome back</h1>
            </div>
            <div className="hidden sm:block">
              <PwaInstallButton variant="secondary" />
            </div>
          </div>

          <div className="mt-7 rounded-[1.75rem] border border-slate-200 bg-slate-50/90 p-4">
            <div className="flex items-start justify-between gap-4">
              <BrandLogo
                size={52}
                showText
                title="VivaInventory"
                subtitle="Construction Inventory"
                titleClassName="text-2xl"
                subtitleClassName="text-orange-500"
              />
              <div className="sm:hidden">
                <PwaInstallButton compact />
              </div>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {sessionExpired ? (
              <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Your session expired. Sign in again to continue.
              </div>
            ) : null}

            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value
                  }))
                }
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-12"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value
                    }))
                  }
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 text-slate-400 hover:text-slate-700"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              className="btn w-full rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)] hover:bg-slate-900 focus:ring-slate-200"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
