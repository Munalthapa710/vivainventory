"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  HardHat,
  ShieldCheck
} from "lucide-react";
import toast from "react-hot-toast";
import AppSplashScreen from "@/components/AppSplashScreen";
import BrandLogo from "@/components/BrandLogo";
import PwaInstallButton from "@/components/PwaInstallButton";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const featureCards = [
    {
      icon: Building2,
      title: "Warehouse oversight",
      description: "Track stock movement, allocations, and supply readiness in one place."
    },
    {
      icon: ShieldCheck,
      title: "Controlled access",
      description: "Separate admin controls from employee workflows with role-based sign-in."
    },
    {
      icon: ClipboardList,
      title: "Reliable records",
      description: "Keep issue, usage, and adjustment history ready for operational review."
    }
  ];
  const supportPoints = [
    "Built for warehouse managers, supervisors, and field staff.",
    "Designed to keep issue logs and remaining stock in sync.",
    "Keeps operations moving without losing inventory traceability."
  ];

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      const nextPath =
        session.user.role === "admin"
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
        freshSession?.user?.role === "admin"
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
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.28),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_34%),linear-gradient(140deg,#0f172a_0%,#111827_45%,#1e293b_100%)]" />
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
          <div className="relative flex h-full flex-col justify-between px-12 py-12 xl:px-16 xl:py-14">
            <div className="flex items-start justify-between gap-6">
              <BrandLogo
                size={56}
                showText
                title="VivaInventory"
                subtitle="Construction Inventory"
                className="text-orange-200"
                textClassName="text-white"
                titleClassName="mt-1 text-3xl text-white"
                subtitleClassName="text-orange-200/70"
              />
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300 backdrop-blur">
                Operations Access
              </div>
            </div>

            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-300">
                Construction Inventory Control
              </p>
              <h2 className="mt-5 text-5xl font-black leading-[1.05] text-white xl:text-6xl">
                A cleaner login experience for teams managing real stock on real sites.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                Keep warehouse assignments, employee usage, and operational
                records connected from one secure workspace built for day-to-day
                construction activity.
              </p>

              <div className="mt-8 grid gap-3">
                {supportPoints.map((point) => (
                  <div
                    key={point}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-orange-300" />
                    <p className="text-sm text-slate-200">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {featureCards.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur"
                >
                  <item.icon className="h-5 w-5 text-orange-300" />
                  <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_26%),linear-gradient(180deg,#fffaf4_0%,#f8fafc_52%,#eef2ff_100%)]" />
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle,_rgba(249,115,22,0.18),transparent_68%)] blur-3xl" />

          <div className="relative w-full max-w-lg rounded-[2rem] border border-white/70 bg-white/90 p-7 text-slate-900 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur sm:p-8 xl:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">
                  Secure Sign In
                </p>
                <h1 className="mt-3 text-3xl font-bold text-slate-950">
                  Welcome back
                </h1>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
                  Sign in with the credentials assigned to your account to
                  access warehouse operations, employee allocations, and stock
                  history.
                </p>
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
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-slate-600">
                <HardHat className="h-5 w-5 shrink-0 text-orange-500" />
                <p>Use your work account credentials to continue.</p>
              </div>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
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

            <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Need access?
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Employee accounts are created by an administrator. Contact your
                office or system manager if you need a new login or password
                reset.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
