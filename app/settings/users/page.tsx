"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

type UserItem = {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  permissions?: string[];
};

const ROLE_OPTIONS = [
  "admin",
  "fabric_manager",
  "cutting_user",
  "embroidery_user",
  "shipment_user",
  "viewer",
];

const PERMISSION_OPTIONS = [
  "fabric_inventory",
  "cutting",
  "lots",
  "embroidery",
  "reject",
  "office_shipment",
  "factory_shipment",
  "foreign_shipment",
  "reports",
  "settings",
];

export default function UserManagementPage() {
  useAuthGuard({ requireAuth: true });
  const currentUser = useAuthStore((state) => state.currentUser);
  const updateCurrentUser = useAuthStore((state) => state.updateCurrentUser);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "viewer",
    isActive: true,
    permissions: [] as string[],
  });

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: UserItem[] }>("/users");
      setUsers(res.data.data || []);
    } catch {
      setError("Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm({
      name: "",
      email: "",
      password: "",
      role: "viewer",
      isActive: true,
      permissions: [],
    });
    setOpenForm(true);
  };

  const openEdit = (user: UserItem) => {
    setEditingUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "viewer",
      isActive: user.isActive !== false,
      permissions: user.permissions || [],
    });
    setOpenForm(true);
  };

  const saveUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        password: form.password || undefined,
      };
      if (editingUser?._id) {
        const res = await api.put<{ data?: UserItem }>(`/users/${editingUser._id}`, payload);
        if (editingUser._id === currentUser?._id && res.data?.data) {
          updateCurrentUser(res.data.data);
        }
      } else {
        await api.post("/users", payload);
      }
      setOpenForm(false);
      await loadUsers();
    } catch {
      setError("Failed to save user.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUser = async (id: string) => {
    setError(null);
    try {
      await api.delete(`/users/${id}`);
      await loadUsers();
    } catch {
      setError("Failed to delete user.");
    }
  };

  const toggleStatus = async (id: string) => {
    setError(null);
    try {
      await api.patch(`/users/${id}/toggle-status`);
      await loadUsers();
    } catch {
      setError("Failed to update user status.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Create, edit, delete and manage user permissions.
            </p>
          </div>
          <Button onClick={openCreate}>Create User</Button>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Users</CardTitle>
            <Button size="sm" variant="outline" onClick={loadUsers} disabled={isLoading}>
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Permissions</th>
                    <th className="py-2 pr-0">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item._id} className="border-b">
                      <td className="py-2 pr-4">{item.name}</td>
                      <td className="py-2 pr-4">{item.email}</td>
                      <td className="py-2 pr-4">{item.role}</td>
                      <td className="py-2 pr-4">{item.isActive === false ? "Disabled" : "Enabled"}</td>
                      <td className="py-2 pr-4">{(item.permissions || []).join(", ") || "-"}</td>
                      <td className="py-2 pr-0">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toggleStatus(item._id)}>
                            {item.isActive === false ? "Enable" : "Disable"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            onClick={() => deleteUser(item._id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveUser}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Password {editingUser ? "(optional for update)" : ""}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required={!editingUser}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Permissions</p>
              <div className="grid gap-2 md:grid-cols-2">
                {PERMISSION_OPTIONS.map((permission) => (
                  <label key={permission} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(permission)}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          permissions: e.target.checked
                            ? [...prev.permissions, permission]
                            : prev.permissions.filter((item) => item !== permission),
                        }))
                      }
                    />
                    {permission}
                  </label>
                ))}
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
              User Enabled
            </label>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingUser ? "Update User" : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
