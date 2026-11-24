"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, ShoppingCart, Shield, Zap, Loader2 } from "lucide-react";
import { authService } from "@/lib/services/auth.service";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";

interface DemoAccount {
  id: string;
  role: string;
  name: string;
  email: string;
  password: string;
  peran?: "owner" | "kasir" | "superadmin";
}

function parseDemoAccounts(): DemoAccount[] {
  const raw = process.env.NEXT_PUBLIC_DEMO_ACCOUNTS_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DemoAccount =>
        Boolean(item && typeof item.id === "string" && typeof item.email === "string" && typeof item.password === "string")
    );
  } catch {
    return [];
  }
}

const DEMO_ACCOUNTS = parseDemoAccounts();

export const IS_DEMO_LOGIN_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true" &&
  DEMO_ACCOUNTS.length > 0;

function getRoleStyle(id: string) {
  if (id === "admin") {
    return {
      icon: Shield,
      btnColor: "hover:border-admin",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-700",
    };
  }
  if (id.startsWith("kasir")) {
    return {
      icon: ShoppingCart,
      btnColor: "hover:border-amber-500",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700",
    };
  }
  return {
    icon: Store,
    btnColor: "hover:border-accent",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700",
  };
}

export function DemoQuickLogin({
  filterRoles,
  onFillCredentials,
}: {
  filterRoles?: string[];
  onFillCredentials?: (email: string, pass: string) => void;
}) {
  const router = useRouter();
  const { setSessionData } = useAuth();
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!IS_DEMO_LOGIN_ENABLED) return null;

  const users = filterRoles?.length
    ? DEMO_ACCOUNTS.filter((u) => filterRoles.includes(u.id))
    : DEMO_ACCOUNTS;

  if (users.length === 0) return null;

  const handleQuickLogin = async (account: DemoAccount) => {
    if (onFillCredentials) {
      onFillCredentials(account.email, account.password);
      return;
    }

    setLoadingId(account.id);
    try {
      const res = await authService.login(account.email, account.password);
      setSessionData(res.user, res.toko);
      toast.success(`Masuk sebagai ${res.user.nama_lengkap}`);
      if (res.user.peran === "superadmin") {
        router.push("/admin");
      } else if (res.user.peran === "kasir") {
        router.push("/kasir");
      } else {
        router.push("/owner");
      }
    } catch (error: any) {
      toast.error(error?.message || "Gagal melakukan login cepat demo.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="mt-5 pt-4 border-t-2 border-dashed border-border">
      <div className="flex items-center justify-between mb-2.5">
        <span className="inline-flex items-center gap-1.5 font-heading text-[11px] font-bold uppercase tracking-wider text-muted-fg">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
          Akses Cepat Akun Terdaftar
        </span>
        <span className="text-[10px] text-muted-fg">Autentikasi Langsung ke Server</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {users.map((u) => {
          const style = getRoleStyle(u.id);
          const Icon = style.icon;
          const isBusy = loadingId === u.id;
          return (
            <button
              key={u.id}
              type="button"
              disabled={loadingId !== null}
              onClick={() => handleQuickLogin(u)}
              className={`w-full text-left p-2.5 rounded-md border-2 border-fg bg-card shadow-[2px_2px_0px_var(--shadow-color)] transition-all flex items-center justify-between gap-2 cursor-pointer active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-60 ${style.btnColor}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-sm border-2 border-fg bg-muted flex items-center justify-center shrink-0">
                  {isBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-heading text-xs font-bold truncate">{u.name || u.role}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${style.badgeColor}`}>
                      {u.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-fg truncate font-mono">
                    {u.email}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-heading font-bold text-accent shrink-0">
                {isBusy ? "Memproses..." : "Masuk →"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
