"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
  UserCircle2
} from "lucide-react";
import LoadingSkeleton from "./LoadingSkeleton";
import { apiRequest } from "@/lib/client";

const initialSecurity = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

export default function SettingsPanel({ role }) {
  const { update } = useSession();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    role: role
  });
  const [security, setSecurity] = useState(initialSecurity);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await apiRequest("/api/profile");
        setProfile({
          full_name: data.user.full_name,
          email: data.user.email,
          role: data.user.role
        });
      } catch (error) {
        toast.error(error.message || "Unable to load settings.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleProfileSave(event) {
    event.preventDefault();
    setSavingProfile(true);

    try {
      const data = await apiRequest("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: profile.full_name
        })
      });

      await update({
        name: data.user.full_name
      });

      toast.success("Profile updated.");
    } catch (error) {
      toast.error(error.message || "Unable to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSave(event) {
    event.preventDefault();

    if (security.newPassword !== security.confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      await apiRequest("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: security.currentPassword,
          newPassword: security.newPassword
        })
      });

      setSecurity(initialSecurity);
      toast.success("Password updated.");
    } catch (error) {
      toast.error(error.message || "Unable to update password.");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton cards={2} rows={4} />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Profile and security
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Update your personal details and keep your login secure.
          </p>
        </div>
        <Link href={`/${role}/dashboard`} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form className="card-panel space-y-6" onSubmit={handleProfileSave}>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
              <UserCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Profile details</h2>
              <p className="text-sm text-slate-500">
                This name appears in the top bar and session.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">Full name</label>
              <input
                className="input"
                value={profile.full_name}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    full_name: event.target.value
                  }))
                }
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={profile.email} disabled readOnly />
            </div>
            <div>
              <label className="label">Role</label>
              <input
                className="input capitalize"
                value={profile.role}
                disabled
                readOnly
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button className="btn-primary" disabled={savingProfile}>
              {savingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save profile
                </>
              )}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <form className="card-panel space-y-6" onSubmit={handlePasswordSave}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Password</h2>
                <p className="text-sm text-slate-500">
                  Set a new password using your current one.
                </p>
              </div>
            </div>

            <div>
              <label className="label">Current password</label>
              <input
                className="input"
                type="password"
                value={security.currentPassword}
                onChange={(event) =>
                  setSecurity((current) => ({
                    ...current,
                    currentPassword: event.target.value
                  }))
                }
                required
              />
            </div>
            <div>
              <label className="label">New password</label>
              <input
                className="input"
                type="password"
                value={security.newPassword}
                onChange={(event) =>
                  setSecurity((current) => ({
                    ...current,
                    newPassword: event.target.value
                  }))
                }
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="label">Confirm password</label>
              <input
                className="input"
                type="password"
                value={security.confirmPassword}
                onChange={(event) =>
                  setSecurity((current) => ({
                    ...current,
                    confirmPassword: event.target.value
                  }))
                }
                minLength={6}
                required
              />
            </div>

            <div className="flex justify-end">
              <button className="btn-primary" disabled={savingPassword}>
                {savingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Update password
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="card-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Session notes
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>Your email stays unchanged here and remains your login ID.</li>
              <li>Name updates are reflected in the shared navigation shell.</li>
              <li>Password changes take effect immediately after save.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
