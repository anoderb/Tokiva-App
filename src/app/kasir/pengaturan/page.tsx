"use client";

import { useState, useEffect } from "react";
import { CashierHeader } from "@/components/layout/cashier-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/components/auth/auth-provider";
import { authService } from "@/lib/services/auth.service";
import { posService } from "@/lib/services/pos.service";
import type { Toko } from "@/types/api";
import {
  User,
  Store,
  ShieldCheck,
  Printer,
  Save,
  Lock,
} from "lucide-react";

export default function KasirPengaturanPage() {
  const { user, toko, refreshSession } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"profil" | "toko" | "keamanan">("profil");
  const [storeProfile, setStoreProfile] = useState<Toko | null>(toko);

  const [namaLengkap, setNamaLengkap] = useState(user?.nama_lengkap || "");
  const [telepon, setTelepon] = useState(user?.telepon || "");
  const [savingProfil, setSavingProfil] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setNamaLengkap(user.nama_lengkap || "");
      setTelepon(user.telepon || "");
    }
  }, [user]);

  useEffect(() => {
    posService
      .getProfilToko()
      .then((t) => setStoreProfile(t))
      .catch(() => {});
  }, []);

  const handleSaveProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaLengkap.trim()) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }
    setSavingProfil(true);
    try {
      await authService.updateProfil({
        nama_lengkap: namaLengkap.trim(),
        telepon: telepon.trim() || undefined,
      });
      await refreshSession();
      toast.success("Profil kasir berhasil diperbarui!");
    } catch (err: any) {
      toast.error(err?.message || "Gagal memperbarui profil");
    } finally {
      setSavingProfil(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      toast.error("Kata sandi saat ini wajib diisi");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Kata sandi baru minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi kata sandi tidak cocok");
      return;
    }
    setSavingPassword(true);
    try {
      await authService.updatePassword({
        password_lama: currentPassword,
        password_baru: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Kata sandi berhasil diperbarui!");
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengubah kata sandi");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col font-body">
      <CashierHeader cashierName={user?.nama_lengkap} storeName={storeProfile?.nama || toko?.nama} />

      <main className="flex-1 max-w-[1000px] w-full mx-auto p-3 sm:p-5 space-y-5">
        <div>
          <h1 className="font-heading text-lg sm:text-xl font-extrabold">Pengaturan Kasir</h1>
          <p className="text-xs text-muted-fg">
            Kelola profil akun kasir, informasi toko tempat bertugas, dan keamanan kata sandi.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b-2 border-border pb-2">
          {[
            { id: "profil", label: "Profil Kasir", icon: User },
            { id: "toko", label: "Informasi Toko & Struk", icon: Store },
            { id: "keamanan", label: "Keamanan & Sandi", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-full text-xs font-heading font-bold flex items-center gap-1.5 border-2 cursor-pointer transition-all ${
                  active
                    ? "bg-accent text-white border-fg shadow-[2px_2px_0px_#1E293B]"
                    : "bg-card border-border text-muted-fg hover:text-fg"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === "profil" && (
          <form
            onSubmit={handleSaveProfil}
            className="bg-card border-2 border-fg rounded-xl p-5 shadow-pop-soft space-y-4 max-w-xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="font-heading font-bold text-base">Data Diri Staf Kasir</h2>
                <p className="text-xs text-muted-fg">Tercetak otomatis pada setiap struk transaksi.</p>
              </div>
              <Badge variant="green">Aktif</Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Email Akun (Tetap)</label>
                <input
                  disabled
                  value={user?.email || ""}
                  className="w-full px-3 py-2 border-2 border-border rounded bg-muted text-muted-fg font-mono"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Nama Lengkap Kasir *</label>
                <input
                  required
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-border rounded bg-card"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-border rounded bg-card"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" icon={Save} disabled={savingProfil}>
                {savingProfil ? "Menyimpan..." : "Simpan Perubahan Profil"}
              </Button>
            </div>
          </form>
        )}

        {activeTab === "toko" && (
          <div className="bg-card border-2 border-fg rounded-xl p-5 shadow-pop-soft space-y-4 max-w-xl text-xs">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Printer className="w-4 h-4 text-accent" />
              <h2 className="font-heading font-bold text-base">Informasi Toko & Konfigurasi Struk</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded bg-muted border border-border">
                <span className="text-muted-fg block text-[10px]">Nama Toko</span>
                <strong className="text-sm">{storeProfile?.nama || toko?.nama || "-"}</strong>
              </div>
              <div className="p-3 rounded bg-muted border border-border">
                <span className="text-muted-fg block text-[10px]">Kode Tenant</span>
                <strong className="text-sm font-mono">{storeProfile?.kode || toko?.kode || "-"}</strong>
              </div>
              <div className="p-3 rounded bg-muted border border-border">
                <span className="text-muted-fg block text-[10px]">Telepon Toko</span>
                <strong>{storeProfile?.telepon || "-"}</strong>
              </div>
              <div className="p-3 rounded bg-muted border border-border">
                <span className="text-muted-fg block text-[10px]">Ukuran Kertas Struk</span>
                <strong>{storeProfile?.lebar_kertas || "58mm"}</strong>
              </div>
              <div className="p-3 rounded bg-muted border border-border sm:col-span-2">
                <span className="text-muted-fg block text-[10px]">Alamat Toko</span>
                <strong>{storeProfile?.alamat || "-"}</strong>
              </div>
              <div className="p-3 rounded bg-muted border border-border sm:col-span-2">
                <span className="text-muted-fg block text-[10px]">Catatan Kaki (Footer) Struk</span>
                <strong>{storeProfile?.struk_footer || "Terima kasih telah berbelanja!"}</strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === "keamanan" && (
          <form
            onSubmit={handleSavePassword}
            className="bg-card border-2 border-fg rounded-xl p-5 shadow-pop-soft space-y-4 max-w-xl text-xs"
          >
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Lock className="w-4 h-4 text-accent" />
              <h2 className="font-heading font-bold text-base">Ganti Kata Sandi Akun</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-bold block mb-1">Kata Sandi Saat Ini *</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi saat ini"
                  className="w-full px-3 py-2 border-2 border-border rounded bg-card"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Kata Sandi Baru *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3 py-2 border-2 border-border rounded bg-card"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Konfirmasi Kata Sandi Baru *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full px-3 py-2 border-2 border-border rounded bg-card"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" icon={Save} disabled={savingPassword}>
                {savingPassword ? "Menyimpan..." : "Perbarui Kata Sandi"}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
