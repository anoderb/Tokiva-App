"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useAuth } from "@/components/auth/auth-provider";
import { shiftService } from "@/lib/services/shift.service";
import {
  ShoppingCart,
  Clock,
  Layers,
  Settings,
  LogOut,
  User,
} from "lucide-react";

interface CashierHeaderProps {
  cashierName?: string;
  storeName?: string;
  shiftActive?: boolean;
  rightSlot?: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/kasir", label: "Kasir", icon: ShoppingCart },
  { href: "/kasir/shift", label: "Shift", icon: Clock },
  { href: "/kasir/riwayat", label: "Riwayat", icon: Layers },
  { href: "/kasir/pengaturan", label: "Pengaturan", icon: Settings },
];

export function CashierHeader({
  cashierName,
  storeName,
  shiftActive,
  rightSlot,
}: CashierHeaderProps) {
  const pathname = usePathname();
  const { user, toko, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [hasActiveShift, setHasActiveShift] = useState<boolean>(shiftActive ?? false);

  const resolvedCashierName = cashierName || user?.nama_lengkap || "Kasir";
  const resolvedStoreName = storeName || toko?.nama || "Tokiva POS";

  useEffect(() => {
    if (shiftActive !== undefined) {
      setHasActiveShift(shiftActive);
      return;
    }
    shiftService
      .getShiftAktif()
      .then((s) => setHasActiveShift(Boolean(s && s.status === "terbuka")))
      .catch(() => {});
  }, [shiftActive]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-card border-b-2 border-border px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 shrink-0">
        {/* Left: Brand & Store Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/kasir" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-accent rounded-sm border-2 border-fg flex items-center justify-center font-heading font-extrabold text-white text-sm shadow-[2px_2px_0px_var(--shadow-color)] shrink-0">
              T
            </div>
            <div className="min-w-0">
              <div className="font-heading font-bold text-xs sm:text-sm leading-tight truncate">
                Tokiva POS
              </div>
              <div className="text-[10px] sm:text-[11px] text-muted-fg truncate">
                {resolvedStoreName}
              </div>
            </div>
          </Link>

          <Badge
            variant={hasActiveShift ? "green" : "gray"}
            className="hidden sm:inline-flex shrink-0 ml-1"
          >
            {hasActiveShift ? "Shift Aktif" : "Shift Tutup"}
          </Badge>
        </div>

        {/* Center / Right Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          <nav className="flex items-center bg-muted p-0.5 rounded-full border-2 border-fg shadow-[2px_2px_0px_var(--shadow-color)]">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive
                      ? "px-2.5 sm:px-3 py-1 rounded-full bg-accent text-white font-heading text-[11px] font-bold flex items-center gap-1 transition-colors"
                      : "px-2.5 sm:px-3 py-1 rounded-full text-muted-fg hover:text-fg font-heading text-[11px] font-bold flex items-center gap-1 transition-colors"
                  }
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden xs:inline sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {rightSlot}

          <div className="hidden xl:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-muted border border-border">
            <User className="w-3.5 h-3.5 text-accent" />
            <span>{resolvedCashierName}</span>
          </div>

          <span className="text-[11px] text-muted-fg hidden 2xl:inline font-mono">
            {currentTime}
          </span>

          <ThemeToggle compact />

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            title="Keluar dari Kasir"
            className="w-8 h-8 rounded-sm border-2 border-fg bg-card flex items-center justify-center hover:bg-muted text-red-600 shadow-[2px_2px_0px_var(--shadow-color)] transition-transform active:translate-x-0.5 active:translate-y-0.5 shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <ConfirmModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={async () => {
          setShowLogoutModal(false);
          await logout("/auth/login");
        }}
        title="Keluar dari Sesi Kasir?"
        message="Apakah Anda yakin ingin keluar dari layar POS Kasir? Pastikan transaksi yang sedang berjalan telah diselesaikan."
        variant="danger"
        confirmText="Ya, Logout"
        cancelText="Batal"
      />
    </>
  );
}
