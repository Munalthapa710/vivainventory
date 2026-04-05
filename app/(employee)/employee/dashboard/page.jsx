"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardList,
  MessageSquare
} from "lucide-react";
import DataTable from "@/components/DataTable";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import StatsCard from "@/components/StatsCard";
import { apiRequest, formatDate } from "@/lib/client";

export default function EmployeeDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    recentActions: 0,
    totalRemaining: 0
  });

  async function loadDashboard() {
    setLoading(true);

    try {
      const [inventoryData, recordsData] = await Promise.all([
        apiRequest("/api/inventory"),
        apiRequest("/api/records?limit=5")
      ]);

      setInventory(inventoryData.products);
      setRecords(recordsData.records);
      setStats({
        totalProducts: inventoryData.totalProducts,
        lowStockCount: inventoryData.lowStockCount,
        recentActions: recordsData.records.length,
        totalRemaining: inventoryData.totalRemaining
      });
    } catch (error) {
      toast.error(error.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingSkeleton cards={3} rows={5} />;
  }

  const lowStockProducts = inventory
    .filter((product) => product.low_stock)
    .sort((left, right) => left.remaining_quantity - right.remaining_quantity)
    .slice(0, 4);
  const quickActions = [
    {
      href: "/employee/products",
      title: "Record stock movement",
      description: "Update used, returned, or damaged stock from your assigned items.",
      icon: Boxes
    },
    {
      href: "/employee/records",
      title: "Review my records",
      description: "Check your latest inventory history and quantity changes.",
      icon: ClipboardList
    },
    {
      href: "/employee/communication",
      title: "Open team chat",
      description: "Message the team or start a direct conversation with a coworker.",
      icon: MessageSquare
    }
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="My Products"
          value={stats.totalProducts}
          helper="Assigned product lines available to you."
          icon={Boxes}
        />
        <StatsCard
          title="Low Stock"
          value={stats.lowStockCount}
          helper="Products close to depletion based on warehouse thresholds."
          icon={AlertTriangle}
          accent="rose"
        />
        <StatsCard
          title="Recent Actions"
          value={stats.recentActions}
          helper="Latest usage or assignment records on your account."
          icon={Activity}
          accent="emerald"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card-panel">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
              Quick Actions
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Move faster
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Jump straight into the tasks employees use most.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-orange-200 hover:bg-orange-50"
              >
                <div className="inline-flex rounded-2xl bg-orange-100 p-3 text-orange-600">
                  <action.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {action.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {action.description}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">
                  Open
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card-panel">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
              Attention Needed
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Stock watch
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {stats.totalRemaining} total units are still assigned to you.
            </p>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              No assigned products are currently under the low-stock threshold.
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <article
                  key={product.product_id}
                  className="rounded-3xl border border-amber-200 bg-amber-50 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{product.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                        {product.sku} - {product.storage_location}
                      </p>
                    </div>
                    <span className="badge-warning">Low stock</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                    <p>
                      <span className="font-semibold text-slate-900">Allocated:</span>{" "}
                      {product.assigned_quantity} {product.unit}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Used:</span>{" "}
                      {product.used_quantity} {product.unit}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Left:</span>{" "}
                      {product.remaining_quantity} {product.unit}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
            Inventory Summary
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Assigned products
          </h1>
        </div>

        <DataTable
          data={inventory}
          pageSize={8}
          searchable
          searchPlaceholder="Search by product, SKU, or location"
          initialSort={{ key: "name", direction: "asc" }}
          emptyMessage="No products have been assigned to you."
          columns={[
            {
              key: "name",
              label: "Product",
              searchValue: (row) =>
                [row.name, row.sku, row.storage_location, row.category]
                  .filter(Boolean)
                  .join(" "),
              render: (row) => (
                <div>
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {row.sku} - {row.category}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.storage_location}
                  </p>
                </div>
              )
            },
            {
              key: "category",
              label: "Category"
            },
            {
              key: "quantity_breakdown",
              label: "Quantity",
              sortable: false,
              searchValue: (row) =>
                `allocated ${row.assigned_quantity} used ${row.used_quantity} left ${row.remaining_quantity} ${row.unit}`,
              render: (row) => (
                <div className="space-y-1 text-sm">
                  <p className="text-slate-700">
                    <span className="font-semibold text-slate-900">Allocated:</span>{" "}
                    {row.assigned_quantity} {row.unit}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-900">Used:</span>{" "}
                    {row.used_quantity} {row.unit}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-900">Left:</span>{" "}
                    {row.remaining_quantity} {row.unit}
                  </p>
                </div>
              )
            },
            {
              key: "status",
              label: "Status",
              sortable: false,
              render: (row) => (
                <span className={row.low_stock ? "badge-warning" : "badge-success"}>
                  {row.low_stock ? "Low stock" : "Healthy"}
                </span>
              )
            },
            {
              key: "assigned_at",
              label: "Assigned At",
              render: (row) => formatDate(row.assigned_at)
            }
          ]}
        />
      </section>
    </div>
  );
}
