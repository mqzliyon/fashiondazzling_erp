"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/store/auth-store";

type UseAuthGuardOptions = {
  requireAuth?: boolean;
  redirectAuthedTo?: string;
  redirectGuestTo?: string;
};

export function useAuthGuard({
  requireAuth = true,
  redirectAuthedTo = "/dashboard",
  redirectGuestTo = "/login",
}: UseAuthGuardOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthStore((state) => state.hydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const syncCurrentUser = useAuthStore((state) => state.syncCurrentUser);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const authed = isAuthenticated();

    if (requireAuth && !authed && pathname !== redirectGuestTo) {
      router.replace(redirectGuestTo);
      return;
    }

    if (!requireAuth && authed && pathname !== redirectAuthedTo) {
      router.replace(redirectAuthedTo);
    }
  }, [
    hydrated,
    isAuthenticated,
    pathname,
    redirectAuthedTo,
    redirectGuestTo,
    requireAuth,
    router,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    if (!requireAuth) return;
    if (!isAuthenticated()) return;

    void syncCurrentUser();
  }, [hydrated, requireAuth, isAuthenticated, syncCurrentUser]);
}
