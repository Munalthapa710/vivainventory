"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Activity, AlertTriangle, Boxes } from "lucide-react";
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
    recentActions: 0
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
        recentActions: recordsData.records.length
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
