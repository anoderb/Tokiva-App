"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@/lib/services/auth.service";
import { getCachedSession, getStoredToken, setStoredToken } from "@/lib/api";
import type { Pengguna, Toko } from "@/types/api";

interface AuthContextValue {
  user: Pengguna | null;
  toko: Toko | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  setSessionData: (user: Pengguna | null, toko: Toko | null) => void;
  logout: (redirectPath?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getRedirectForMismatch(pathname: string, user: Pengguna | null): string | null {
  const isAdminRoute = pathname.startsWith("/admin");
  const isOwnerRoute = pathname.startsWith("/owner");
  const isKasirRoute = pathname.startsWith("/kasir");
  const isProtected = isAdminRoute || isOwnerRoute || isKasirRoute;

  if (!isProtected) return null;

  if (!user) {
    return isAdminRoute ? "/auth/admin" : "/auth/login";
  }

  if (user.peran === "superadmin" && (isOwnerRoute || isKasirRoute)) {
    return "/admin";
  }
  if (user.peran === "kasir" && (isOwnerRoute || isAdminRoute)) {
    return "/kasir";
  }
  if (user.peran === "owner" && isAdminRoute) {
    return "/owner";
  }

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [user, setUser] = useState<Pengguna | null>(null);
  const [toko, setToko] = useState<Toko | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setToko(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authService.getMe();
      setUser(res.user);
      setToko(res.toko);
    } catch {
      setStoredToken(null);
      setUser(null);
      setToko(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      const cached = getCachedSession<{ user: Pengguna; toko: Toko | null }>();
      if (cached?.user) {
        setUser(cached.user);
        setToko(cached.toko);
      }
    }
    refreshSession();
  }, [refreshSession]);

  const setSessionData = useCallback((newUser: Pengguna | null, newToko: Toko | null) => {
    setUser(newUser);
    setToko(newToko);
    setIsLoading(false);
  }, []);

  const logout = useCallback(
    async (redirectPath = "/auth/login") => {
      await authService.logout();
      setUser(null);
      setToko(null);
      router.push(redirectPath);
    },
    [router]
  );

  const isProtected =
    pathname.startsWith("/owner") ||
    pathname.startsWith("/kasir") ||
    pathname.startsWith("/admin");

  const redirectTarget = !isLoading ? getRedirectForMismatch(pathname, user) : null;

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [redirectTarget, router]);

  const value = useMemo(
    () => ({
      user,
      toko,
      isLoading,
      refreshSession,
      setSessionData,
      logout,
    }),
    [user, toko, isLoading, refreshSession, setSessionData, logout]
  );

  const shouldBlockRender = isProtected && ((isLoading && !user) || Boolean(redirectTarget));

  return (
    <AuthContext.Provider value={value}>
      {shouldBlockRender ? (
        <div className="min-h-screen bg-bg text-fg flex flex-col items-center justify-center p-6">
          <div className="w-10 h-10 rounded-full border-4 border-fg border-t-accent animate-spin mb-3" />
          <p className="font-heading text-sm font-bold text-muted-fg">
            Memverifikasi sesi Tokiva...
          </p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return ctx;
}

export function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
