"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { KeyRound, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import DataTable from "@/components/DataTable";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import Modal from "@/components/Modal";
import { apiRequest, formatDate } from "@/lib/client";

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  role: "employee"
};

function createTemporaryPassword() {
  return `Viva${Math.random().toString(36).slice(2, 6)}${Math.random()
    .toString(36)
    .slice(2, 6)}9A`;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState(createTemporaryPassword());
  const [form, setForm] = useState(initialForm);

  async function loadUsers() {
    setLoading(true);

    try {
      const data = await apiRequest("/api/users");
      setUsers(data.users);
    } catch (error) {
      toast.error(error.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const employeeCount = users.filter((user) => user.role === "employee").length;

  async function handleCreateUser(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify(form)
      });
      toast.success("User created successfully.");
      setForm(initialForm);
      setModalOpen(false);
      await loadUsers();
    } catch (error) {
      toast.error(error.message || "Unable to create user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(user, event) {
    event.stopPropagation();

    try {
      await apiRequest(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          is_active: !user.is_active
        })
      });
      toast.success(
        user.is_active ? "User marked inactive." : "User marked active."
      );
      await loadUsers();
    } catch (error) {
      toast.error(error.message || "Unable to update user.");
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) {
      return;
    }

    try {
      await apiRequest(`/api/users/${deleteTarget.id}`, {
        method: "DELETE"
      });
      toast.success("User deleted successfully.");
      setDeleteTarget(null);
      await loadUsers();
    } catch (error) {
      toast.error(error.message || "Unable to delete user.");
    }
  }

  async function handleResetPassword() {
    if (!resetTarget) {
      return;
    }

    setResetting(true);

    try {
      await apiRequest(`/api/users/${resetTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          reset_password: resetPassword
        })
      });
      toast.success("Temporary password issued successfully.");
      setResetTarget(null);
      setResetPassword(createTemporaryPassword());
      await loadUsers();
    } catch (error) {
      toast.error(error.message || "Unable to reset password.");
    } finally {
      setResetting(false);
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
            User Management
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Team accounts</h1>
          <p className="mt-2 text-sm text-slate-500">
            {employeeCount} employee account{employeeCount === 1 ? "" : "s"} currently
            managed by admin.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Create user
        </button>
      </section>

      <DataTable
        data={users}
        pageSize={8}
        searchable
        searchPlaceholder="Search by user name, email, or role"
        initialSort={{ key: "created_at", direction: "desc" }}
        onRowClick={(user) => router.push(`/admin/users/${user.id}`)}
        columns={[
          {
            key: "full_name",
            label: "Name",
            render: (row) => (
              <div>
                <p className="font-semibold text-slate-900">{row.full_name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {row.role}
                </p>
              </div>
            )
          },
          {
            key: "email",
            label: "Email"
          },
          {
            key: "created_at",
            label: "Created",
            render: (row) => formatDate(row.created_at)
          },
          {
            key: "status",
            label: "Status",
            sortable: false,
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <span className={row.is_active ? "badge-success" : "badge-danger"}>
                  {row.is_active ? "Active" : "Inactive"}
                </span>
                {row.must_change_password ? (
                  <span className="badge-warning">Password reset required</span>
                ) : null}
              </div>
            )
          },
          {
            key: "actions",
            label: "Actions",
            sortable: false,
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary px-3 py-2"
                  onClick={(event) => handleToggleActive(row, event)}
                >
                  {row.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  className="btn-secondary px-3 py-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    setResetTarget(row);
                    setResetPassword(createTemporaryPassword());
                  }}
                >
                  <KeyRound className="h-4 w-4" />
                  Reset password
                </button>
                <button
                  type="button"
                  className="btn-danger px-3 py-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteTarget(row);
                  }}
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
        open={Boolean(resetTarget)}
        title="Reset password"
        description="Issue a temporary password and force the user to change it on next sign-in."
        onClose={() => {
          setResetTarget(null);
          setResetPassword(createTemporaryPassword());
        }}
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Set a temporary password for{" "}
            <span className="font-semibold">{resetTarget?.full_name}</span>.
          </p>
          <div>
            <label className="label">Temporary password</label>
            <input
              className="input"
              value={resetPassword}
              minLength={8}
              onChange={(event) => setResetPassword(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setResetTarget(null);
                setResetPassword(createTemporaryPassword());
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleResetPassword}
              disabled={resetting}
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Reset password
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        title="Create user"
        description="Add an admin or employee account."
        onClose={() => {
          setModalOpen(false);
          setForm(initialForm);
        }}
      >
        <form className="space-y-4" onSubmit={handleCreateUser}>
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              value={form.fullName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  fullName: event.target.value
                }))
              }
              required
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value
                }))
              }
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value
                }))
              }
              required
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  role: event.target.value
                }))
              }
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setModalOpen(false);
                setForm(initialForm);
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
                  <UserPlus className="h-4 w-4" />
                  Create user
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete user"
        description="This will permanently remove the account and return remaining assigned stock to the warehouse."
        onClose={() => setDeleteTarget(null)}
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Delete <span className="font-semibold">{deleteTarget?.full_name}</span>?
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={handleDeleteUser}>
              <Trash2 className="h-4 w-4" />
              Delete user
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
