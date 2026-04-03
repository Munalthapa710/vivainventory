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
          emptyMessage="No products have been assigned to you."
          columns={[
            {
              key: "name",
              label: "Product"
            },
            {
              key: "category",
              label: "Category"
            },
            {
              key: "assigned_quantity",
              label: "Assigned",
              render: (row) => `${row.assigned_quantity} ${row.unit}`
            },
            {
              key: "remaining_quantity",
              label: "Remaining",
              render: (row) => `${row.remaining_quantity} ${row.unit}`
            },
            {
              key: "status",
              label: "Status",
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
