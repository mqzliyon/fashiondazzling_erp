"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

type SystemSetting = {
  businessName?: string;
  businessNumber?: string;
  businessAddress?: string;
  businessLogoUrl?: string;
  registrationEnabled?: boolean;
};

type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  message: string;
};

function parseRegistrationEnabled(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return fallback;
}

export default function BusinessSettingsPage() {
  useAuthGuard({ requireAuth: true });
  const updateCurrentUser = useAuthStore((state) => state.updateCurrentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [registrationSavedState, setRegistrationSavedState] = useState<boolean>(true);
  const [profileSaving, setProfileSaving] = useState(false);

  const [form, setForm] = useState({
    businessName: "",
    businessNumber: "",
    businessAddress: "",
    businessLogoUrl: "",
    registrationEnabled: true,
  });
  const [profileForm, setProfileForm] = useState({
    name: "",
    password: "",
  });

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: SystemSetting }>("/system-settings");
      const data = res.data.data || {};
      setForm({
        businessName: data.businessName || "",
        businessNumber: data.businessNumber || "",
        businessAddress: data.businessAddress || "",
        businessLogoUrl: data.businessLogoUrl || "",
        registrationEnabled: parseRegistrationEnabled(data.registrationEnabled, true),
      });
      setRegistrationSavedState(parseRegistrationEnabled(data.registrationEnabled, true));

      const profileRes = await api.get<ApiSuccessEnvelope<{ user?: { name?: string } }>>("/auth/me");
      setProfileForm((prev) => ({
        ...prev,
        name: profileRes.data?.data?.user?.name || "",
      }));
    } catch {
      setError("Failed to load business settings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const handleLogoUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, businessLogoUrl: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.put("/system-settings", form);
      window.dispatchEvent(new Event("business-name-updated"));
      setMessage("Business settings updated successfully.");
      setRegistrationSavedState(form.registrationEnabled);
    } catch {
      setError("Failed to update business settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const submitProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileSaving(true);
    setError(null);
    setMessage(null);
    try {
      const profileUpdateRes = await api.patch<
        ApiSuccessEnvelope<{ user?: { name?: string; email?: string; role?: string } }>
      >(
        "/auth/profile",
        {
        name: profileForm.name,
        password: profileForm.password || undefined,
        }
      );
      if (profileUpdateRes.data?.data?.user) {
        updateCurrentUser(profileUpdateRes.data.data.user);
      }
      setProfileForm((prev) => ({ ...prev, password: "" }));
      setMessage("Admin profile updated successfully.");
    } catch {
      setError("Failed to update admin profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto max-w-4xl space-y-5">
        <header>
          <h1 className="text-2xl font-semibold">Business Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage business profile and registration control.
          </p>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input
                    value={form.businessName}
                    onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Address</Label>
                  <Input
                    value={form.businessAddress}
                    onChange={(e) => setForm((prev) => ({ ...prev, businessAddress: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Number</Label>
                  <Input
                    value={form.businessNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, businessNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Logo Upload</Label>
                  <Input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)} />
                  <Input
                    placeholder="Or paste logo URL"
                    value={form.businessLogoUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, businessLogoUrl: e.target.value }))}
                  />
                  {form.businessLogoUrl && (
                    <img
                      src={form.businessLogoUrl}
                      alt="Business Logo"
                      className="h-16 w-16 rounded border object-cover"
                    />
                  )}
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Registration Mode</p>
                    <span
                      className={
                        registrationSavedState
                          ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
                          : "rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                      }
                    >
                      Saved: {registrationSavedState ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.registrationEnabled}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          registrationEnabled: e.target.checked,
                        }))
                      }
                    />
                    {form.registrationEnabled ? "Enable Registration" : "Disable Registration"}
                  </label>
                  <p className="mt-2 text-xs text-muted-foreground">
                    If disabled, public signup is blocked and only admin-created users can login.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Current selection: {form.registrationEnabled ? "Enable Registration" : "Disable Registration"}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={loadSettings}>
                    Load Current
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save / Update Settings"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitProfile}>
              <div className="space-y-2">
                <Label>Admin Name</Label>
                <Input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={profileForm.password}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Leave empty if no change"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={profileSaving}>
                  {profileSaving ? "Updating..." : "Update Admin Name / Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
