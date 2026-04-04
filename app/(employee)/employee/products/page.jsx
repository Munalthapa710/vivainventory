"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ArrowRightLeft, Loader2, PackageCheck, ShieldAlert, Wrench } from "lucide-react";
import DataTable from "@/components/DataTable";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import Modal from "@/components/Modal";
import { apiRequest } from "@/lib/client";
import {
  EMPLOYEE_MOVEMENT_OPTIONS,
  getDefaultMovementReason,
  getMovementReasonOptions
} from "@/lib/inventory";

function createInitialMovementForm(productId = "") {
  return {
    productId,
    actionType: "used",
    reasonCode: getDefaultMovementReason("used"),
    quantity: 1,
    notes: ""
  };
}

function getMovementSubmitLabel(actionType) {
  switch (actionType) {
    case "returned":
      return "Record return";
    case "damaged":
      return "Record damage";
    default:
      return "Record usage";
  }
}

function getMovementNotesPlaceholder(actionType) {
  switch (actionType) {
    case "returned":
      return "Explain why the unused stock is being returned.";
    case "damaged":
      return "Describe the damage, loss, or unusable condition.";
    default:
      return "Describe where the stock was used.";
  }
}

export default function EmployeeProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [usageForm, setUsageForm] = useState(createInitialMovementForm());

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

  async function handleRecordMovement(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest("/api/records", {
        method: "POST",
        body: JSON.stringify({
          productId: Number(usageForm.productId),
          actionType: usageForm.actionType,
          reasonCode: usageForm.reasonCode,
          quantity: Number(usageForm.quantity),
          notes: usageForm.notes
        })
      });
      toast.success("Stock movement recorded.");
      setUsageForm(createInitialMovementForm());
      setModalOpen(false);
      await loadProducts();
    } catch (error) {
      toast.error(error.message || "Unable to record stock movement.");
    } finally {
      setSaving(false);
    }
  }

  const reasonOptions = getMovementReasonOptions(usageForm.actionType);

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
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Manage assigned stock
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Record usage, returns, and damaged stock so inventory balances stay accurate.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <ArrowRightLeft className="h-4 w-4" />
          Record movement
        </button>
      </section>

      <DataTable
        data={products}
        pageSize={8}
        searchable
        searchPlaceholder="Search by product, SKU, or location"
        initialSort={{ key: "name", direction: "asc" }}
        emptyMessage="No products assigned."
        columns={[
          {
            key: "name",
            label: "Product",
            searchValue: (row) =>
              [
                row.name,
                row.sku,
                row.barcode,
                row.category,
                row.storage_location
              ]
                .filter(Boolean)
                .join(" "),
            render: (row) => (
              <div>
                <p className="font-semibold text-slate-900">{row.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {row.sku} - {row.category}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {row.storage_location}
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
                  setUsageForm(createInitialMovementForm(String(row.product_id)));
                  setModalOpen(true);
                }}
              >
                <PackageCheck className="h-4 w-4" />
                Record movement
              </button>
            )
          }
        ]}
      />

      <Modal
        open={modalOpen}
        title="Record stock movement"
        description="Select an assigned product and record whether it was used, returned, or damaged."
        onClose={() => {
          setModalOpen(false);
          setUsageForm(createInitialMovementForm());
        }}
      >
        <form className="space-y-4" onSubmit={handleRecordMovement}>
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
                  {product.name} [{product.sku}] ({product.remaining_quantity}{" "}
                  {product.unit} remaining)
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Movement type</label>
              <select
                className="input"
                value={usageForm.actionType}
                onChange={(event) =>
                  setUsageForm((current) => ({
                    ...current,
                    actionType: event.target.value,
                    reasonCode: getDefaultMovementReason(event.target.value)
                  }))
                }
              >
                {EMPLOYEE_MOVEMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Reason</label>
              <select
                className="input"
                value={usageForm.reasonCode}
                onChange={(event) =>
                  setUsageForm((current) => ({
                    ...current,
                    reasonCode: event.target.value
                  }))
                }
              >
                {reasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Quantity</label>
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
              placeholder={getMovementNotesPlaceholder(usageForm.actionType)}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setModalOpen(false);
                setUsageForm(createInitialMovementForm());
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
                <>
                  {usageForm.actionType === "damaged" ? (
                    <ShieldAlert className="h-4 w-4" />
                  ) : usageForm.actionType === "returned" ? (
                    <ArrowRightLeft className="h-4 w-4" />
                  ) : (
                    <Wrench className="h-4 w-4" />
                  )}
                  {getMovementSubmitLabel(usageForm.actionType)}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
