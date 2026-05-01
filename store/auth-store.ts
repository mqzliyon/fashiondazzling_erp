"use client";

import { AxiosError } from "axios";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api } from "@/lib/api";

export type AuthUser = {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
  permissions?: string[];
  isActive?: boolean;
};

type LoginPayload = {
  email: string;
  password: string;
};

type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  message: string;
};

type LoginResponseData = {
  token: string;
  user: AuthUser;
};

type AuthState = {
  token: string | null;
  currentUser: AuthUser | null;
  hydrated: boolean;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: () => boolean;
  login: (payload: LoginPayload) => Promise<void>;
  syncCurrentUser: () => Promise<void>;
  setAuth: (token: string, user: AuthUser) => void;
  updateCurrentUser: (user: AuthUser) => void;
  logout: () => void;
  clearError: () => void;
  setHydrated: (hydrated: boolean) => void;
};

const TOKEN_COOKIE_KEY = "erp_token";

function setTokenCookie(token: string | null) {
  if (typeof document === "undefined") {
    return;
  }

  if (!token) {
    document.cookie = `${TOKEN_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }

  document.cookie = `${TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      currentUser: null,
      hydrated: false,
      isLoading: false,
      error: null,
      isAuthenticated: () => Boolean(get().token),
      login: async (payload) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.post<ApiSuccessEnvelope<LoginResponseData>>("/auth/login", payload);
          const token = response.data?.data?.token;
          const user = response.data?.data?.user;

          if (!token || !user) {
            throw new Error("Invalid login response from server");
          }

          get().setAuth(token, user);
        } catch (error: unknown) {
          const apiMessage =
            error instanceof AxiosError
              ? (error.response?.data as { message?: string } | undefined)?.message
              : undefined;
          const message = apiMessage ?? "Login failed. Please check your credentials.";

          set({
            token: null,
            currentUser: null,
            error: message,
          });
          setTokenCookie(null);
          throw new Error(message);
        } finally {
          set({ isLoading: false });
        }
      },
      syncCurrentUser: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const response = await api.get<ApiSuccessEnvelope<{ user: AuthUser }>>("/auth/me");
          if (response.data?.data?.user) {
            set({ currentUser: response.data.data.user });
          }
        } catch {
          setTokenCookie(null);
          set({ token: null, currentUser: null });
        }
      },
      setAuth: (token, user) => {
        setTokenCookie(token);
        set({ token, currentUser: user, error: null });
      },
      updateCurrentUser: (user) => {
        set((state) => ({
          currentUser: {
            ...(state.currentUser || {}),
            ...user,
          },
        }));
      },
      logout: () => {
        setTokenCookie(null);
        set({ token: null, currentUser: null, error: null });
      },
      clearError: () => set({ error: null }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "erp-auth-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        currentUser: state.currentUser,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        if (state?.token) {
          setTokenCookie(state.token);
        }
      },
    }
  )
);
