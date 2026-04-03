"use client";

export default function AppSplashScreen({
  title = "VivaInventory",
  subtitle = "Preparing your workspace"
}) {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 pt-[var(--safe-area-top)] text-white">
      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <div className="absolute inset-x-0 top-1/2 h-56 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.24),_transparent_62%)] blur-3xl" />

        <div className="relative grid place-items-center">
          <div className="absolute h-36 w-36 rounded-full border border-orange-400/20 border-t-orange-400 border-r-orange-300/70 animate-spin" />
          <div
            className="absolute h-24 w-24 rounded-full border border-white/10 border-b-orange-200/80 animate-spin"
            style={{
              animationDirection: "reverse",
              animationDuration: "2.6s"
            }}
          />
          <div className="grid h-28 w-28 place-items-center rounded-full border border-white/10 bg-white/5 shadow-[0_18px_60px_rgba(15,23,42,0.45)] backdrop-blur">
            <img
              src="/logo.svg"
              alt="VivaInventory logo"
              width="74"
              height="74"
              className="select-none animate-spin"
              style={{ animationDuration: "3.4s" }}
              draggable="false"
            />
          </div>
        </div>

        <div className="relative mt-8 space-y-3">
          <p className="text-2xl font-bold tracking-tight text-white">{title}</p>
          <p className="text-sm font-medium text-slate-300">{subtitle}</p>
        </div>
      </div>
    </main>
  );
}
