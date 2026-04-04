"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, PackageCheck, Wrench } from "lucide-react";
import DataTable from "@/components/DataTable";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import Modal from "@/components/Modal";
import { apiRequest } from "@/lib/client";

const initialUsageForm = {
  productId: "",
  quantity: 1,
  notes: ""
};

export default function EmployeeProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [usageForm, setUsageForm] = useState(initialUsageForm);

  async function loadProducts() {
    setLoading(true);

    try {
      const data = await apiRequest("/api/inventory");
      setProducts(data.products);
    } catch (error) {
      toast.error(error.message || "Unable to load assigned products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const usableProducts = products.filter(
    (product) => product.remaining_quantity > 0
  );

  async function handleUseProduct(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest("/api/records", {
        method: "POST",
        body: JSON.stringify({
          productId: Number(usageForm.productId),
          quantity: Number(usageForm.quantity),
          notes: usageForm.notes
        })
      });
      toast.success("Product usage recorded.");
      setUsageForm(initialUsageForm);
      setModalOpen(false);
      await loadProducts();
    } catch (error) {
      toast.error(error.message || "Unable to record usage.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton cards={2} rows={6} />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
            Employee Products
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Use assigned stock</h1>
          <p className="mt-2 text-sm text-slate-500">
            Record product consumption so inventory history stays accurate.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Wrench className="h-4 w-4" />
          Use product
        </button>
      </section>

      <DataTable
        data={products}
        pageSize={8}
        searchable
        searchPlaceholder="Search assigned products"
        initialSort={{ key: "name", direction: "asc" }}
        emptyMessage="No products assigned."
        columns={[
          {
            key: "name",
            label: "Product",
            render: (row) => (
              <div>
                <p className="font-semibold text-slate-900">{row.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {row.category}
                </p>
              </div>
            )
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
            sortable: false,
            render: (row) => (
              <span className={row.low_stock ? "badge-warning" : "badge-success"}>
                {row.low_stock ? "Low stock" : "Healthy"}
              </span>
            )
          },
          {
            key: "action",
            label: "Action",
            sortable: false,
            render: (row) => (
              <button
                type="button"
                className="btn-secondary"
                disabled={row.remaining_quantity <= 0}
                onClick={() => {
                  setUsageForm({
                    productId: String(row.product_id),
                    quantity: 1,
                    notes: ""
                  });
                  setModalOpen(true);
                }}
              >
                <PackageCheck className="h-4 w-4" />
                Use product
              </button>
            )
          }
        ]}
      />

      <Modal
        open={modalOpen}
        title="Use product"
        description="Select an assigned product and record the quantity used."
        onClose={() => {
          setModalOpen(false);
          setUsageForm(initialUsageForm);
        }}
      >
        <form className="space-y-4" onSubmit={handleUseProduct}>
          <div>
            <label className="label">Assigned product</label>
            <select
              className="input"
              value={usageForm.productId}
              onChange={(event) =>
                setUsageForm((current) => ({
                  ...current,
                  productId: event.target.value
                }))
              }
              required
            >
              <option value="">Select a product</option>
              {usableProducts.map((product) => (
                <option key={product.product_id} value={product.product_id}>
                  {product.name} ({product.remaining_quantity} {product.unit} remaining)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quantity used</label>
            <input
              className="input"
              type="number"
              min="1"
              value={usageForm.quantity}
              onChange={(event) =>
                setUsageForm((current) => ({
                  ...current,
                  quantity: event.target.value
                }))
              }
              required
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input min-h-24"
              value={usageForm.notes}
              onChange={(event) =>
                setUsageForm((current) => ({
                  ...current,
                  notes: event.target.value
                }))
              }
              placeholder="Describe where the stock was used."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setModalOpen(false);
                setUsageForm(initialUsageForm);
              }}
            >
              Cancel
            </button>
            <button className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Record usage"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
