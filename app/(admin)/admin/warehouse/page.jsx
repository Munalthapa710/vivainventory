"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import DataTable from "@/components/DataTable";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import Modal from "@/components/Modal";
import { apiRequest } from "@/lib/client";

const initialProductForm = {
  name: "",
  category: "",
  total_quantity: 0,
  unit: "",
  description: "",
  low_stock_threshold: 0
};

export default function WarehousePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(initialProductForm);
  const [createForm, setCreateForm] = useState(initialProductForm);

  async function loadProducts() {
    setLoading(true);

    try {
      const data = await apiRequest("/api/warehouse");
      setProducts(data.products);
    } catch (error) {
      toast.error(error.message || "Unable to load warehouse products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleCreateProduct(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest("/api/warehouse", {
        method: "POST",
        body: JSON.stringify({
          ...createForm,
          total_quantity: Number(createForm.total_quantity),
          low_stock_threshold: Number(createForm.low_stock_threshold)
        })
      });
      toast.success("Product created successfully.");
      setCreateForm(initialProductForm);
      setModalOpen(false);
      await loadProducts();
    } catch (error) {
      toast.error(error.message || "Unable to create product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    try {
      await apiRequest("/api/warehouse", {
        method: "PATCH",
        body: JSON.stringify({
          id: editingId,
          ...editForm,
          total_quantity: Number(editForm.total_quantity),
          low_stock_threshold: Number(editForm.low_stock_threshold)
        })
      });
      toast.success("Product updated successfully.");
      setEditingId(null);
      setEditForm(initialProductForm);
      await loadProducts();
    } catch (error) {
      toast.error(error.message || "Unable to update product.");
    }
  }

  async function handleDeleteProduct() {
    if (!deleteTarget) {
      return;
    }

    try {
      await apiRequest("/api/warehouse", {
        method: "DELETE",
        body: JSON.stringify({ id: deleteTarget.id })
      });
      toast.success("Product deleted successfully.");
      setDeleteTarget(null);
      await loadProducts();
    } catch (error) {
      toast.error(error.message || "Unable to delete product.");
    }
  }

  if (loading) {
    return <LoadingSkeleton cards={2} rows={7} />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
            Warehouse
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Product master list
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Keep warehouse quantities current so employee assignments stay accurate.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add product
        </button>
      </section>

      <DataTable
        data={products}
        pageSize={8}
        columns={[
          {
            key: "name",
            label: "Product",
            render: (row) =>
              editingId === row.id ? (
                <input
                  className="input"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                />
              ) : (
                <div>
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{row.description}</p>
                </div>
              )
          },
          {
            key: "category",
            label: "Category",
            render: (row) =>
              editingId === row.id ? (
                <input
                  className="input"
                  value={editForm.category}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      category: event.target.value
                    }))
                  }
                />
              ) : (
                row.category
              )
          },
          {
            key: "quantity",
            label: "Quantity",
            render: (row) =>
              editingId === row.id ? (
                <input
                  className="input max-w-28"
                  type="number"
                  min="0"
                  value={editForm.total_quantity}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      total_quantity: event.target.value
                    }))
                  }
                />
              ) : (
                `${row.total_quantity} ${row.unit}`
              )
          },
          {
            key: "unit",
            label: "Unit",
            render: (row) =>
              editingId === row.id ? (
                <input
                  className="input max-w-24"
                  value={editForm.unit}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      unit: event.target.value
                    }))
                  }
                />
              ) : (
                row.unit
              )
          },
          {
            key: "threshold",
            label: "Threshold",
            render: (row) =>
              editingId === row.id ? (
                <input
                  className="input max-w-28"
                  type="number"
                  min="0"
                  value={editForm.low_stock_threshold}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      low_stock_threshold: event.target.value
                    }))
                  }
                />
              ) : (
                row.low_stock_threshold
              )
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
                {editingId === row.id ? (
                  <>
                    <button
                      type="button"
                      className="btn-primary px-3 py-2"
                      onClick={handleSaveEdit}
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn-secondary px-3 py-2"
                      onClick={() => {
                        setEditingId(null);
                        setEditForm(initialProductForm);
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
                    onClick={() => {
                      setEditingId(row.id);
                      setEditForm({
                        name: row.name,
                        category: row.category,
                        total_quantity: row.total_quantity,
                        unit: row.unit,
                        description: row.description || "",
                        low_stock_threshold: row.low_stock_threshold
                      });
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  className="btn-danger px-3 py-2"
                  onClick={() => setDeleteTarget(row)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )
          }
        ]}
      />

      <Modal
        open={modalOpen}
        title="Add warehouse product"
        description="Create a product that can later be assigned to employees."
        onClose={() => {
          setModalOpen(false);
          setCreateForm(initialProductForm);
        }}
      >
        <form className="space-y-4" onSubmit={handleCreateProduct}>
          <div>
            <label className="label">Product name</label>
            <input
              className="input"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Category</label>
              <input
                className="input"
                value={createForm.category}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    category: event.target.value
                  }))
                }
                required
              />
            </div>
            <div>
              <label className="label">Unit</label>
              <input
                className="input"
                value={createForm.unit}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    unit: event.target.value
                  }))
                }
                required
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Quantity</label>
              <input
                className="input"
                type="number"
                min="0"
                value={createForm.total_quantity}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    total_quantity: event.target.value
                  }))
                }
                required
              />
            </div>
            <div>
              <label className="label">Low stock threshold</label>
              <input
                className="input"
                type="number"
                min="0"
                value={createForm.low_stock_threshold}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    low_stock_threshold: event.target.value
                  }))
                }
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-24"
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setModalOpen(false);
                setCreateForm(initialProductForm);
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
                "Create product"
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete product"
        description="This permanently removes the product from the warehouse master list."
        onClose={() => setDeleteTarget(null)}
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Delete <span className="font-semibold">{deleteTarget?.name}</span>?
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={handleDeleteProduct}>
              <Trash2 className="h-4 w-4" />
              Delete product
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
