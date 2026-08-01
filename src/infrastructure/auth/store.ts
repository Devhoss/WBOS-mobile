import { create } from "zustand";
import type { StoredUser } from "./token-storage";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: StoredUser | null;
  authMessage: string | null;
  setUser: (user: StoredUser) => void;
  setStatus: (status: AuthStatus) => void;
  setAuthMessage: (message: string | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,
  authMessage: null,
  setUser: (user) => set({ user, status: "authenticated" }),
  setStatus: (status) => set({ status }),
  setAuthMessage: (message) => set({ authMessage: message }),
  clear: () => set({ user: null, status: "unauthenticated" }),
}));
