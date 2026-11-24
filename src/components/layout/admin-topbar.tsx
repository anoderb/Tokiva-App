"use client";
import { useState } from "react";
import { PanelLeft, Menu, Bell, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast } from "@/components/ui/toast";
import { useAuth, getInitials } from "@/components/auth/auth-provider";
import { aiService } from "@/lib/services/ai.service";

interface AdminTopbarProps {
  title: string;
  desc?: string;
  breadcrumb?: string;
  children?: React.ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onMobileOpen?: () => void;
}

export function AdminTopbar({
  title,
  desc,
  breadcrumb,
  children,
  onToggleCollapse,
  onMobileOpen,
}: AdminTopbarProps) {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [checkingNotif, setCheckingNotif] = useState(false);

  const adminName = user?.nama_lengkap || user?.nama || "Super Admin";
  const initials = getInitials(adminName);

  const handleCheckNotifications = async () => {
    if (checkingNotif) return;
    setCheckingNotif(true);
    try {
      const stats = await aiService.getStatsHuggingFace("admin");
      const pending = Number(stats?.total_menunggu_validasi || 0);
      const readySync = Number(stats?.total_siap_sync_hf || 0);
      if (pending > 0 || readySync > 0) {
        toast.info(
          `Dataset AI: ${pending} foto menunggu validasi & kurasi, ${readySync} foto terverifikasi siap sync ke Hugging Face.`
        );
      } else {
        toast.success("Semua sampel dataset AI sudah tervalidasi & tersinkron ke Hugging Face.");
      }
    } catch {
      toast.info("Tidak ada notifikasi baru saat ini.");
    } finally {
      setCheckingNotif(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-bg border-b-2 border-border px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onToggleCollapse}
            className="max-lg:hidden w-8 h-8 rounded-sm border-2 border-fg bg-card flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_#1E293B] hover:bg-muted shrink-0"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onMobileOpen}
            className="lg:hidden w-8 h-8 rounded-sm border-2 border-fg bg-card flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_#1E293B] hover:bg-muted shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            {breadcrumb && <div className="text-[10px] sm:text-[11px] text-muted-fg truncate">{breadcrumb}</div>}
            <h1 className="font-heading text-base sm:text-lg font-bold truncate">{title}</h1>
            {desc && !breadcrumb && <p className="text-[10px] sm:text-[11px] text-muted-fg truncate">{desc}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle compact />
          {children}
          <button
            className="relative w-8 h-8 rounded-full border-2 border-fg bg-card flex items-center justify-center cursor-pointer hover:bg-muted shrink-0 disabled:opacity-60"
            title="Cek Notifikasi Validasi & Sync AI"
            disabled={checkingNotif}
            onClick={handleCheckNotifications}
          >
            <Bell className="w-4 h-4" />
          </button>
          <span className="hidden sm:inline-block text-xs font-semibold">{adminName}</span>
          <div className="w-8 h-8 rounded-full bg-admin border-2 border-fg flex items-center justify-center text-white font-heading font-bold text-xs shrink-0 shadow-[1px_1px_0px_#1E293B]">
            {initials}
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            title="Keluar dari Portal Admin"
            className="w-8 h-8 rounded-sm border-2 border-fg bg-card flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_var(--shadow-color)] hover:bg-muted text-red-600 shrink-0 transition-transform active:translate-x-0.5 active:translate-y-0.5"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <ConfirmModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={async () => {
          setShowLogoutModal(false);
          await logout("/auth/admin");
        }}
        title="Keluar dari Portal Super Admin?"
        message="Apakah Anda yakin ingin keluar dari sesi Super Administrator? Sesi pengawasan multi-tenant Anda akan diakhiri."
        variant="danger"
        confirmText="Ya, Logout"
        cancelText="Batal"
      />
    </>
  );
}
