"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import DataTable from "@/components/DataTable";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import Modal from "@/components/Modal";
import { apiRequest, formatDate } from "@/lib/client";

const initialAssignForm = {
  productId: "",
  quantity: 1,
  notes: ""
};

export default function AdminUserInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [products, setProducts] = useState([]);
  const [warehouseProducts, setWarehouseProducts] = useState([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState(initialAssignForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editQuantity, setEditQuantity] = useState("");

  async function loadInventoryPage() {
    setLoading(true);

    try {
      const [inventoryData, warehouseData] = await Promise.all([
        apiRequest(`/api/inventory/${params.id}`),
        apiRequest("/api/warehouse")
      ]);

      setEmployee(inventoryData.employee);
      setProducts(inventoryData.products);
      setWarehouseProducts(warehouseData.products);
    } catch (error) {
      toast.error(error.message || "Unable to load employee inventory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) {
      loadInventoryPage();
    }
  }, [params.id]);

  const availableWarehouseProducts = warehouseProducts.filter(
    (product) => product.total_quantity > 0
  );

  async function handleAssignProduct(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await apiRequest(`/api/inventory/${params.id}`, {
        method: "POST",
        body: JSON.stringify({
          productId: Number(assignForm.productId),
          quantity: Number(assignForm.quantity),
          notes: assignForm.notes
        })
      });
      toast.success("Product assigned successfully.");
      setAssignForm(initialAssignForm);
      setAssignModalOpen(false);
      await loadInventoryPage();
    } catch (error) {
      toast.error(error.message || "Unable to assign product.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveQuantity(productId) {
    try {
      await apiRequest(`/api/inventory/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          productId,
          quantity: Number(editQuantity)
        })
      });
      toast.success("Assigned quantity updated.");
      setEditingProductId(null);
      setEditQuantity("");
      await loadInventoryPage();
    } catch (error) {
      toast.error(error.message || "Unable to update quantity.");
    }
  }

  async function handleRemoveProduct() {
    if (!deleteTarget) {
      return;
    }

    try {
      await apiRequest(`/api/inventory/${params.id}`, {
        method: "DELETE",
        body: JSON.stringify({
          productId: deleteTarget.product_id
        })
      });
      toast.success("Assigned product removed.");
      setDeleteTarget(null);
      await loadInventoryPage();
    } catch (error) {
      toast.error(error.message || "Unable to remove product.");
    }
  }

  if (loading) {
    return <LoadingSkeleton cards={2} rows={6} />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button
            type="button"
            className="btn-secondary mb-4"
            onClick={() => router.push("/admin/users")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
            Employee Inventory
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {employee?.full_name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {employee?.email} · Created {formatDate(employee?.created_at)}
          </p>
        </div>

        <button className="btn-primary" onClick={() => setAssignModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add product
        </button>
      </section>

      <DataTable
        data={products}
        pageSize={8}
        emptyMessage="No products assigned to this employee yet."
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
            render: (row) =>
              editingProductId === row.product_id ? (
                <input
                  className="input max-w-28"
                  type="number"
                  min="1"
                  value={editQuantity}
                  onChange={(event) => setEditQuantity(event.target.value)}
                />
              ) : (
                `${row.assigned_quantity} ${row.unit}`
              )
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
            key: "actions",
            label: "Actions",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                {editingProductId === row.product_id ? (
                  <>
                    <button
                      type="button"
                      className="btn-primary px-3 py-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSaveQuantity(row.product_id);
                      }}
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn-secondary px-3 py-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingProductId(null);
                        setEditQuantity("");
                      }}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingProductId(row.product_id);
                      setEditQuantity(String(row.assigned_quantity));
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  className="btn-danger px-3 py-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteTarget(row);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            )
          }
        ]}
      />

      <Modal
        open={assignModalOpen}
        title="Assign product"
        description="Select a warehouse product and allocate stock to this employee."
        onClose={() => {
          setAssignModalOpen(false);
          setAssignForm(initialAssignForm);
        }}
      >
        <form className="space-y-4" onSubmit={handleAssignProduct}>
          <div>
            <label className="label">Warehouse product</label>
            <select
              className="input"
              value={assignForm.productId}
              onChange={(event) =>
                setAssignForm((current) => ({
                  ...current,
                  productId: event.target.value
                }))
              }
              required
            >
              <option value="">Select a product</option>
              {availableWarehouseProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.total_quantity} {product.unit} available)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quantity</label>
            <input
              className="input"
              type="number"
              min="1"
              value={assignForm.quantity}
              onChange={(event) =>
                setAssignForm((current) => ({
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
              value={assignForm.notes}
              onChange={(event) =>
                setAssignForm((current) => ({
                  ...current,
                  notes: event.target.value
                }))
              }
              placeholder="Optional assignment note"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setAssignModalOpen(false);
                setAssignForm(initialAssignForm);
              }}
            >
              Cancel
            </button>
            <button className="btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign product"
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Remove assigned product"
        description="Remaining quantity will be returned to the warehouse before the assignment is removed."
        onClose={() => setDeleteTarget(null)}
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Remove <span className="font-semibold">{deleteTarget?.name}</span> from{" "}
            <span className="font-semibold">{employee?.full_name}</span>?
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={handleRemoveProduct}>
              <Trash2 className="h-4 w-4" />
              Remove product
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
