"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PanelLeft, Menu, Bell, ChevronDown, User, Shield, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast } from "@/components/ui/toast";
import { useAuth, getInitials } from "@/components/auth/auth-provider";
import Link from "next/link";

interface TopbarProps {
  title: string;
  desc?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onMobileOpen: () => void;
  children?: React.ReactNode;
}

export function Topbar({ title, desc, onToggleCollapse, onMobileOpen, children }: TopbarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, toko, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.nama_lengkap || "Pengguna";
  const displayRole =
    user?.peran === "owner"
      ? `Owner · ${toko?.nama || "Toko"}`
      : user?.peran === "kasir"
      ? "Kasir Toko"
      : "Pengguna";
  const initials = getInitials(user?.nama_lengkap);

  return (
    <>
      <header className="sticky top-0 z-30 bg-bg border-b-2 border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onToggleCollapse}
            className="max-lg:hidden w-9 h-9 rounded-sm border-2 border-fg bg-card flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_var(--shadow-color)] hover:bg-muted shrink-0"
            title="Sembunyikan/Tampilkan Sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onMobileOpen}
            className="lg:hidden w-9 h-9 rounded-sm border-2 border-fg bg-card flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_var(--shadow-color)] hover:bg-muted shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-heading text-base sm:text-lg font-bold truncate">{title}</h1>
            {desc && <p className="text-[11px] sm:text-xs text-muted-fg truncate max-sm:hidden">{desc}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {children}
          <ThemeToggle compact />
          <button
            onClick={() => toast.info("Tidak ada notifikasi baru saat ini.")}
            className="relative w-9 h-9 rounded-full border-2 border-fg bg-card flex items-center justify-center cursor-pointer hover:bg-muted shrink-0"
            title="Notifikasi"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border-2 border-fg bg-card hover:bg-muted transition-colors cursor-pointer shadow-[2px_2px_0px_var(--shadow-color)]"
              title="Menu Akun"
            >
              <div className="w-7 h-7 rounded-full bg-tertiary border border-fg flex items-center justify-center font-heading font-bold text-[11px] shrink-0 text-slate-900">
                {initials}
              </div>
              <span className="hidden md:inline-block font-heading text-xs font-bold max-w-[110px] truncate">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-fg" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border-2 border-fg bg-card shadow-pop z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3.5 py-2.5 border-b border-border bg-muted/50">
                  <div className="font-heading text-xs font-bold truncate">{displayName}</div>
                  <div className="text-[11px] text-muted-fg truncate">{displayRole}</div>
                </div>
                <div className="p-1.5 space-y-0.5 text-xs font-medium">
                  <Link
                    href="/owner/pengaturan"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <User className="w-4 h-4 text-muted-fg" />
                    <span>Pengaturan Toko & Profil</span>
                  </Link>
                  <Link
                    href="/owner/pengguna"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <Shield className="w-4 h-4 text-muted-fg" />
                    <span>Kelola Pengguna</span>
                  </Link>
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar dari Akun</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

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
        confirmText="Ya, Keluar"
        cancelText="Batal"
      />
    </>
  );
}
