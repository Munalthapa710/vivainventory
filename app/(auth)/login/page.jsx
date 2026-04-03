"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Building2, Eye, EyeOff, HardHat, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
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
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950">
        <div className="skeleton h-12 w-40 rounded-full" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pt-[var(--safe-area-top)] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.55),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(251,146,60,0.25),_transparent_30%),linear-gradient(135deg,#020617,#0f172a_60%,#1e293b)]" />
          <div className="relative flex h-full flex-col justify-between p-12">
            <div className="flex items-center gap-3 text-orange-300">
              <BrandLogo
                size={56}
                showText
                title="VivaInventory"
                subtitle="Construction Inventory"
                className="text-orange-300"
                textClassName="text-white"
                titleClassName="mt-1 text-3xl text-white"
                subtitleClassName="text-orange-200/70"
              />
            </div>

            <div className="max-w-xl">
              <h2 className="text-5xl font-black leading-tight text-white">
                Warehouse control built for field teams that move fast.
              </h2>
              <p className="mt-5 max-w-lg text-lg text-slate-300">
                Track stock, issue materials to employees, and review usage
                history from a single operational dashboard.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: HardHat,
                  title: "Employee allocation",
                  description: "Issue safety gear and materials with traceable logs."
                },
                {
                  icon: ShieldCheck,
                  title: "Role-based access",
                  description: "Separate admin control from employee operations."
                },
                {
                  icon: Building2,
                  title: "Warehouse visibility",
                  description: "Spot low stock early before worksite delays."
                }
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur"
                >
                  <item.icon className="h-5 w-5 text-orange-300" />
                  <h3 className="mt-4 text-sm font-semibold text-white">
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

        <section className="flex items-center justify-center px-6 py-12 sm:px-8 lg:px-12">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-8 text-slate-900 shadow-2xl shadow-black/20">
            <div className="mb-8 lg:hidden">
              <div className="flex items-start justify-between gap-4">
                <BrandLogo
                  size={52}
                  showText
                  title="VivaInventory"
                  subtitle="Construction Inventory"
                  titleClassName="text-2xl"
                  subtitleClassName="text-orange-500"
                />
                <PwaInstallButton compact />
              </div>
              <h1 className="mt-5 text-3xl font-bold">Login</h1>
            </div>

            <div className="mb-8 hidden lg:block">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">
                Welcome Back
              </p>
              <h1 className="mt-2 text-3xl font-bold">Sign in to continue</h1>
              <p className="mt-3 text-sm text-slate-500">
                Use the credentials assigned to your account by your
                administrator.
              </p>
              <div className="mt-5">
                <PwaInstallButton variant="secondary" />
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="name@company.com"
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

              <button className="btn-primary w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
