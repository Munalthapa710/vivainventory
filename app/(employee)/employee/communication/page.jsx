"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Megaphone, Users } from "lucide-react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { apiRequest, formatDate } from "@/lib/client";

export default function EmployeeCommunicationPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  async function loadCommunication() {
    setLoading(true);

    try {
      const [usersData, announcementsData] = await Promise.all([
        apiRequest("/api/users?view=communication"),
        apiRequest("/api/announcements")
      ]);

      setEmployees(usersData.employees);
      setAnnouncements(announcementsData.announcements);
    } catch (error) {
      toast.error(error.message || "Unable to load communication board.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCommunication();
  }, []);

  if (loading) {
    return <LoadingSkeleton cards={2} rows={5} />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="card-panel">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
              Announcements
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Admin board
            </h1>
          </div>

          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No announcements available.
              </div>
            ) : (
              announcements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-center gap-2 text-orange-500">
                    <Megaphone className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                      {formatDate(announcement.created_at)}
                    </p>
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-slate-900">
                    {announcement.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {announcement.message}
                  </p>
                  {announcement.created_by_name ? (
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                      Posted by {announcement.created_by_name}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>

        <div className="card-panel">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
              Team Visibility
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Employee product grid
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Read-only view of product quantities assigned across the workforce.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {employees.map((employee) => (
              <article
                key={employee.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-orange-100 p-3 text-orange-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-bold text-slate-900">
                      {employee.full_name}
                    </h3>
                    <p className="break-all text-sm text-slate-500">
                      {employee.email}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {employee.products.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No assigned products.
                    </div>
                  ) : (
                    employee.products.map((product) => (
                      <div
                        key={`${employee.id}-${product.product_id}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words font-semibold text-slate-900">
                              {product.name}
                            </p>
                            <p className="mt-1 break-words text-xs uppercase tracking-[0.18em] text-slate-400">
                              {product.category}
                            </p>
                          </div>
                          <div className="shrink-0 sm:text-right">
                            <p className="text-sm font-semibold text-slate-900">
                              {product.remaining_quantity} {product.unit}
                            </p>
                            <p className="text-xs text-slate-500">
                              of {product.assigned_quantity} assigned
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
