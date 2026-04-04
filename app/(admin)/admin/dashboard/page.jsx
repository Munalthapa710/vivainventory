"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Loader2,
  Megaphone,
  Send,
  Users
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import DataTable from "@/components/DataTable";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import StatsCard from "@/components/StatsCard";
import { apiRequest, formatActionLabel, formatDate } from "@/lib/client";

const initialAnnouncement = {
  title: "",
  message: ""
};

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalUsers: 0,
    lowStockCount: 0,
    recentActivity: 0
  });
  const [chartData, setChartData] = useState([]);
  const [records, setRecords] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState(initialAnnouncement);

  async function loadDashboard() {
    setLoading(true);

    try {
      const [usersData, warehouseData, recordsData, announcementsData] =
        await Promise.all([
          apiRequest("/api/users?view=dashboard"),
          apiRequest("/api/warehouse?view=dashboard"),
          apiRequest("/api/records?limit=10"),
          apiRequest("/api/announcements?limit=5")
        ]);

      setStats({
        totalProducts: warehouseData.totalProducts,
        totalUsers: usersData.totalUsers,
        lowStockCount: warehouseData.lowStockCount,
        recentActivity: recordsData.records.length
      });
      setChartData(warehouseData.categoryChart);
      setRecords(recordsData.records);
      setAnnouncements(announcementsData.announcements);
    } catch (error) {
      toast.error(error.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleAnnouncementSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await apiRequest("/api/announcements", {
        method: "POST",
        body: JSON.stringify(announcementForm)
      });
      toast.success("Announcement posted.");
      setAnnouncementForm(initialAnnouncement);
      await loadDashboard();
    } catch (error) {
      toast.error(error.message || "Unable to post announcement.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton cards={4} rows={6} />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Total Products"
          value={stats.totalProducts}
          helper="Warehouse product lines currently tracked."
          icon={Boxes}
        />
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          helper="Combined admin and employee accounts."
          icon={Users}
          accent="slate"
        />
        <StatsCard
          title="Low Stock Items"
          value={stats.lowStockCount}
          helper="Products at or below their configured threshold."
          icon={AlertTriangle}
          accent="rose"
        />
        <StatsCard
          title="Recent Activity"
          value={stats.recentActivity}
          helper="Latest stock movements recorded across the system."
          icon={Activity}
          accent="emerald"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="card-panel">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
              Warehouse Overview
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Stock by category
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Quantity totals grouped by warehouse category.
            </p>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" stroke="#64748b" />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#f97316" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-panel">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
              Announcements
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Post an update
            </h2>
          </div>

          <form className="space-y-4" onSubmit={handleAnnouncementSubmit}>
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={announcementForm.title}
                onChange={(event) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    title: event.target.value
                  }))
                }
                placeholder="Morning dispatch"
                required
              />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea
                className="input min-h-28"
                value={announcementForm.message}
                onChange={(event) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    message: event.target.value
                  }))
                }
                placeholder="Share notices for employees."
                required
              />
            </div>
            <button className="btn-primary w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post announcement
                </>
              )}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {announcements.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No announcements yet.
              </div>
            ) : (
              announcements.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center gap-2 text-orange-500">
                    <Megaphone className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.message}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
            Recent Activity
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Latest stock records
          </h2>
        </div>

        <DataTable
          pageSize={10}
          searchable
          searchPlaceholder="Search recent activity"
          initialSort={{ key: "created_at", direction: "desc" }}
          columns={[
            {
              key: "user_name",
              label: "Employee"
            },
            {
              key: "product_name",
              label: "Product"
            },
            {
              key: "action_type",
              label: "Action",
              render: (row) => formatActionLabel(row.action_type)
            },
            {
              key: "quantity_changed",
              label: "Qty Changed"
            },
            {
              key: "quantity_after",
              label: "Qty After"
            },
            {
              key: "created_at",
              label: "Date",
              render: (row) => formatDate(row.created_at)
            }
          ]}
          data={records}
          emptyMessage="No recent records found."
        />
      </section>
    </div>
  );
}
