"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { sidebarMenu } from "@/lib/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LogOut } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useAuth, getInitials } from "@/components/auth/auth-provider";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, toko, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const storeName = toko?.nama || "Toko Anda";
  const userName = user?.nama_lengkap || "Owner Toko";
  const userRole = user?.peran === "owner" ? "Owner Toko" : user?.peran || "Pengguna";
  const initials = getInitials(user?.nama_lengkap);

  return (
    <>
      {mobileOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />}

      <aside className={cn(
        "fixed top-0 left-0 bottom-0 bg-card border-r-2 border-border z-40 flex flex-col transition-all duration-300 overflow-hidden",
        "max-lg:translate-x-[-100%] max-lg:w-[260px]",
        mobileOpen && "max-lg:translate-x-0 max-lg:shadow-[4px_0_16px_rgba(0,0,0,0.2)]",
        collapsed ? "lg:w-[72px]" : "lg:w-[260px]"
      )}>
        {/* Brand */}
        <div className="p-4 flex items-center gap-3 border-b-2 border-border min-h-16 shrink-0">
          <div className="w-9 h-9 bg-accent rounded-sm border-2 border-fg flex items-center justify-center font-heading font-extrabold text-base shrink-0 shadow-[3px_3px_0px_#1E293B] text-white">T</div>
          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <div className="font-heading font-bold text-[15px] leading-tight">Tokiva</div>
              <div className="text-[11px] text-muted-fg truncate max-w-[160px]">{storeName}</div>
            </div>
          )}
          <button onClick={onClose} className="lg:hidden ml-auto w-7 h-7 rounded-full border-2 border-fg flex items-center justify-center cursor-pointer hover:bg-muted shrink-0"><X className="w-3.5 h-3.5" /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
          {sidebarMenu.map(item => {
            const active = item.href && pathname === item.href;
            return (
              <Link key={item.label} href={item.href || "#"} onClick={onClose}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all whitespace-nowrap border-2",
                  active ? "bg-lime-100 dark:bg-lime-950/50 text-accent dark:text-emerald-400 font-semibold border-accent shadow-[3px_3px_0px_#0CAF60]" : "text-muted-fg border-transparent hover:bg-muted hover:text-fg")}>
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer profile & logout */}
        <div className={cn("p-3 border-t-2 border-border flex items-center justify-between gap-2", collapsed && "justify-center")}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-tertiary border-2 border-fg flex items-center justify-center font-heading font-bold text-xs shrink-0 text-slate-900">
              {initials}
            </div>
            {!collapsed && (
              <div className="overflow-hidden text-[11px] leading-tight">
                <div className="font-semibold truncate">{userName}</div>
                <div className="text-muted-fg text-[10px] capitalize">{userRole}</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setShowLogoutModal(true)}
              title="Keluar dari Akun"
              className="w-7 h-7 rounded border border-border hover:border-red-500 text-muted-fg hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </aside>

      <ConfirmModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={async () => {
          setShowLogoutModal(false);
          await logout("/auth/login");
        }}
        title="Keluar dari Akun?"
        message="Apakah Anda yakin ingin keluar dari sesi aplikasi Tokiva?"
        variant="danger"
        confirmText="Ya, Logout"
        cancelText="Batal"
      />
    </>
  );
}
