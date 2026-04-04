"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { Download, Printer } from "lucide-react";
import DataTable from "@/components/DataTable";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import {
  apiRequest,
  formatActionLabel,
  formatDate,
  formatReasonLabel
} from "@/lib/client";

export default function EmployeeRecordsPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    productId: ""
  });

  async function loadRecords() {
    setLoading(true);

    try {
      const query = new URLSearchParams();

      if (filters.startDate) {
        query.set("startDate", filters.startDate);
      }

      if (filters.endDate) {
        query.set("endDate", filters.endDate);
      }

      if (filters.productId) {
        query.set("productId", filters.productId);
      }

      const recordsData = await apiRequest(`/api/records?${query.toString()}`);
      setRecords(recordsData.records);
      setProducts(recordsData.availableProducts || []);
    } catch (error) {
      toast.error(error.message || "Unable to load records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, [filters.endDate, filters.productId, filters.startDate]);

  const exportRows = records.map((record) => ({
    Product: record.product_name,
    SKU: record.sku || "",
    Action: formatActionLabel(record.action_type),
    Reason: formatReasonLabel(record.reason_code),
    "Qty Changed": record.quantity_changed,
    "Qty Before": record.quantity_before,
    "Qty After": record.quantity_after,
    Location: record.storage_location || "",
    Notes: record.notes || "",
    Date: formatDate(record.created_at)
  }));

  function exportToExcel() {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Records");
    XLSX.writeFile(workbook, "vivainventory-records.xlsx");
  }

  if (loading) {
    return <LoadingSkeleton cards={2} rows={7} />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
            Activity Records
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Inventory history
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Filter your stock movement history and export it when needed.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            className="btn-primary"
            onClick={exportToExcel}
            disabled={records.length === 0}
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </button>
        </div>
      </section>

      <section className="card-panel">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Start date</label>
            <input
              className="input"
              type="date"
              value={filters.startDate}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  startDate: event.target.value
                }))
              }
            />
          </div>
          <div>
            <label className="label">End date</label>
            <input
              className="input"
              type="date"
              value={filters.endDate}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  endDate: event.target.value
                }))
              }
            />
          </div>
          <div>
            <label className="label">Product</label>
            <select
              className="input"
              value={filters.productId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  productId: event.target.value
                }))
              }
            >
              <option value="">All products</option>
              {products.map((product) => (
                <option key={product.product_id} value={product.product_id}>
                  {product.name} [{product.sku}]
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <DataTable
          data={records}
          pageSize={10}
          searchable
          searchPlaceholder="Search by product, SKU, reason, or notes"
          initialSort={{ key: "created_at", direction: "desc" }}
          emptyMessage="No records found for the selected filters."
          columns={[
            {
              key: "product_name",
              label: "Product",
              searchValue: (row) =>
                [
                  row.product_name,
                  row.sku,
                  row.storage_location,
                  row.notes,
                  row.reason_code
                ]
                  .filter(Boolean)
                  .join(" "),
              render: (row) => (
                <div>
                  <p className="font-semibold text-slate-900">{row.product_name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {row.sku || "-"}
                  </p>
                </div>
              )
            },
            {
              key: "action_type",
              label: "Action",
              render: (row) => formatActionLabel(row.action_type)
            },
            {
              key: "reason_code",
              label: "Reason",
              render: (row) => formatReasonLabel(row.reason_code)
            },
            {
              key: "quantity_changed",
              label: "Qty Changed"
            },
            {
              key: "quantity_before",
              label: "Qty Before"
            },
            {
              key: "quantity_after",
              label: "Qty After"
            },
            {
              key: "created_at",
              label: "Date",
              render: (row) => formatDate(row.created_at)
            },
            {
              key: "notes",
              label: "Notes",
              render: (row) => row.notes || "-"
            },
            {
              key: "storage_location",
              label: "Location",
              render: (row) => row.storage_location || "-"
            }
          ]}
        />
      </section>
    </div>
  );
}
