import { TrendingUp } from "lucide-react";

export default function StatsCard({
  title,
  value,
  helper,
  icon: Icon = TrendingUp,
  accent = "orange"
}) {
  const accentStyles = {
    orange: "bg-orange-100 text-orange-600",
    emerald: "bg-emerald-100 text-emerald-600",
    slate: "bg-slate-100 text-slate-700",
    rose: "bg-rose-100 text-rose-600"
  };

  return (
    <article className="card-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>
          <p className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">{value}</p>
          {helper ? (
            <p className="mt-3 text-sm leading-6 text-slate-500">{helper}</p>
          ) : null}
        </div>
        <div
          className={`rounded-2xl p-3 ${accentStyles[accent] || accentStyles.orange}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </article>
  );
}
