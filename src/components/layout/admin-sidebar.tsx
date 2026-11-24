"use client";
import { cn } from "@/lib/cn";
import { adminMenu } from "@/lib/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useAuth, getInitials } from "@/components/auth/auth-provider";

interface AdminSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ collapsed, mobileOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const adminName = user?.nama_lengkap || user?.nama || "Super Admin";
  const initials = getInitials(adminName);

  return (
    <>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 bg-card border-r-2 border-border z-40 flex flex-col transition-all duration-300 overflow-hidden",
          "max-lg:translate-x-[-100%] max-lg:w-[260px]",
          mobileOpen && "max-lg:translate-x-0 max-lg:shadow-[4px_0_16px_rgba(0,0,0,0.2)]",
          collapsed ? "lg:w-[72px]" : "lg:w-[240px]"
        )}
      >
        {/* Brand */}
        <div className="p-4 flex items-center gap-3 border-b-2 border-border min-h-16 shrink-0">
          <div className="w-9 h-9 bg-admin rounded-sm border-2 border-fg flex items-center justify-center font-heading font-extrabold text-base shrink-0 shadow-[2px_2px_0px_#1E293B] text-white">
            T
          </div>
          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <div className="font-heading font-bold text-[15px] leading-tight">Tokiva Admin</div>
              <div className="text-[11px] text-muted-fg">Panel Administrasi</div>
            </div>
          )}
          <button
            onClick={onClose}
            className="lg:hidden ml-auto w-7 h-7 rounded-full border-2 border-fg flex items-center justify-center cursor-pointer hover:bg-muted shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
          {adminMenu.map((item) => {
            const active = item.href && (pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href)));
            return (
              <Link
                key={item.label}
                href={item.href || "#"}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all whitespace-nowrap border-2",
                  active
                    ? "bg-purple-100 dark:bg-purple-950/50 text-admin dark:text-purple-300 font-semibold border-admin shadow-[3px_3px_0px_#7C3AED]"
                    : "text-muted-fg border-transparent hover:bg-muted hover:text-fg"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer profile */}
        <div className={cn("p-3 border-t-2 border-border flex items-center gap-2", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-admin border-2 border-fg flex items-center justify-center font-heading font-bold text-xs shrink-0 text-white shadow-[1px_1px_0px_#1E293B]">
            {initials}
          </div>
          {!collapsed && (
            <div className="overflow-hidden text-[11px] leading-tight">
              <div className="font-semibold truncate">{adminName}</div>
              <div className="text-muted-fg text-[10px]">Super Administrator</div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
