"use client";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { useToast } from "@/components/ui/toast";
import { useState, useEffect, useCallback } from "react";
import {
  User,
  ShieldCheck,
  Plug,
  Server,
  Save,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { authService } from "@/lib/services/auth.service";
import { adminService, type DashboardAdminData } from "@/lib/services/admin.service";
import { aiService } from "@/lib/services/ai.service";
import { formatNumber, getInitials } from "@/lib/format";

export default function AdminPengaturanPage() {
  const { toast } = useToast();
  const { user, refreshSession } = useAuth();

  const [activeTab, setActiveTab] = useState<"profil" | "keamanan" | "integrasi" | "sistem">(
    "profil"
  );
  const [dashboard, setDashboard] = useState<DashboardAdminData | null>(null);
  const [hfStats, setHfStats] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [savingProfil, setSavingProfil] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profilForm, setProfilForm] = useState({
    nama: "",
    telepon: "",
  });

  const [pwdForm, setPwdForm] = useState({
    password_lama: "",
    password_baru: "",
    konfirmasi_password: "",
  });

  const displayName = user?.nama_lengkap || user?.nama || "Administrator Tokiva";

  useEffect(() => {
    if (user) {
      setProfilForm({
        nama: user.nama_lengkap || user.nama || "",
        telepon: user.telepon || "",
      });
    }
  }, [user]);

  const loadSystemStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const [dashRes, hfRes] = await Promise.all([
        adminService.getDashboard().catch(() => null),
        aiService.getStatsHuggingFace("admin").catch(() => null),
      ]);
      setDashboard(dashRes);
      setHfStats(hfRes);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadSystemStatus();
  }, [loadSystemStatus]);

  const handleSaveProfil = async () => {
    if (!profilForm.nama.trim()) {
      toast.warning("Nama administrator wajib diisi.");
      return;
    }
    setSavingProfil(true);
    try {
      await authService.updateProfil({
        nama_lengkap: profilForm.nama.trim(),
        telepon: profilForm.telepon.trim() || undefined,
      });
      await refreshSession();
      toast.success("Profil Superadmin berhasil diperbarui.");
    } catch (err: any) {
      toast.error(err?.message || "Gagal memperbarui profil.");
    } finally {
      setSavingProfil(false);
    }
  };

  const handleSavePassword = async () => {
    if (!pwdForm.password_lama) {
      toast.warning("Kata sandi saat ini wajib diisi untuk verifikasi.");
      return;
    }
    if (!pwdForm.password_baru || pwdForm.password_baru.length < 6) {
      toast.warning("Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (pwdForm.password_baru !== pwdForm.konfirmasi_password) {
      toast.warning("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setSavingPassword(true);
    try {
      await authService.updatePassword({
        password_lama: pwdForm.password_lama,
        password_baru: pwdForm.password_baru,
      });
      setPwdForm({ password_lama: "", password_baru: "", konfirmasi_password: "" });
      toast.success("Kata sandi akun Superadmin berhasil diperbarui.");
    } catch (err: any) {
      toast.error(err?.message || "Gagal memperbarui kata sandi.");
    } finally {
      setSavingPassword(false);
    }
  };

  const health = dashboard?.kesehatan_layanan;
  const totalHfSynced = hfStats?.total_tersinkron_hf ?? dashboard?.ai?.tersinkron_hf ?? 0;

  return (
    <AdminLayout title="Pengaturan Sistem" breadcrumb="Panel Admin / Pengaturan Sistem">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-heading">
            Pengaturan Akun Superadmin &amp; Infrastruktur Platform
          </h2>
          <p className="text-xs sm:text-[13px] text-muted-fg">
            Kelola profil administrator, keamanan kata sandi, dan pantau integrasi Supabase &amp; Hugging Face.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          icon={RefreshCw}
          onClick={loadSystemStatus}
          disabled={loadingStatus}
        >
          Cek Status Integrasi
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b-2 border-fg mb-5">
        {[
          { id: "profil", label: "Profil Administrator", icon: User },
          { id: "keamanan", label: "Keamanan & Kata Sandi", icon: ShieldCheck },
          { id: "integrasi", label: "Integrasi Layanan Cloud", icon: Plug },
          { id: "sistem", label: "Parameter Sistem", icon: Server },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 font-heading text-xs font-bold border-b-[3px] -mb-[2px] transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${activeTab === t.id
                ? "border-admin text-admin"
                : "border-transparent text-muted-fg hover:text-fg"
              }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: PROFIL */}
      {activeTab === "profil" && (
        <SectionCard
          title="Identitas Akun Superadmin"
          desc="Perbarui informasi profil akun administrator utama Tokiva."
        >
          <div className="flex items-center gap-3.5 mt-2 mb-4 p-3.5 rounded-md border-2 border-border bg-muted">
            <div className="w-12 h-12 rounded-full border-2 border-fg bg-purple-100 text-admin flex items-center justify-center font-heading font-bold text-base">
              {getInitials(displayName)}
            </div>
            <div>
              <div className="font-bold text-sm">{displayName}</div>
              <div className="text-xs text-muted-fg">{user?.email || "-"}</div>
              <Badge variant="purple" className="mt-1">
                SUPERADMIN
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs max-w-xl">
            <div>
              <label className="block font-semibold mb-1">Nama Lengkap *</label>
              <input
                type="text"
                value={profilForm.nama}
                onChange={(e) => setProfilForm({ ...profilForm, nama: e.target.value })}
                className="w-full p-2 rounded-md border-2 border-fg bg-card"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Email Login (Read-Only)</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full p-2 rounded-md border-2 border-border bg-muted text-muted-fg"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Nomor Telepon</label>
              <input
                type="text"
                value={profilForm.telepon}
                onChange={(e) => setProfilForm({ ...profilForm, telepon: e.target.value })}
                placeholder="0812-xxxx-xxxx"
                className="w-full p-2 rounded-md border-2 border-fg bg-card"
              />
            </div>
          </div>

          <div className="mt-4">
            <Button
              icon={Save}
              disabled={savingProfil}
              onClick={handleSaveProfil}
              className="bg-admin hover:bg-purple-700 text-white"
            >
              {savingProfil ? "Menyimpan..." : "Simpan Perubahan Profil"}
            </Button>
          </div>
        </SectionCard>
      )}

      {/* TAB 2: KEAMANAN */}
      {activeTab === "keamanan" && (
        <SectionCard
          title="Perbarui Kata Sandi Superadmin"
          desc="Verifikasi kata sandi saat ini terlebih dahulu sebelum mengganti ke kata sandi baru."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs max-w-xl mt-2">
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Kata Sandi Saat Ini *</label>
              <input
                type="password"
                value={pwdForm.password_lama}
                onChange={(e) => setPwdForm({ ...pwdForm, password_lama: e.target.value })}
                placeholder="Masukkan kata sandi aktif saat ini"
                className="w-full p-2 rounded-md border-2 border-fg bg-card"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Kata Sandi Baru *</label>
              <input
                type="password"
                value={pwdForm.password_baru}
                onChange={(e) => setPwdForm({ ...pwdForm, password_baru: e.target.value })}
                placeholder="Minimal 6 karakter"
                className="w-full p-2 rounded-md border-2 border-fg bg-card"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Konfirmasi Kata Sandi Baru *</label>
              <input
                type="password"
                value={pwdForm.konfirmasi_password}
                onChange={(e) =>
                  setPwdForm({ ...pwdForm, konfirmasi_password: e.target.value })
                }
                placeholder="Ulangi kata sandi baru"
                className="w-full p-2 rounded-md border-2 border-fg bg-card"
              />
            </div>
          </div>

          <div className="mt-4">
            <Button
              icon={KeyRound}
              disabled={savingPassword}
              onClick={handleSavePassword}
              className="bg-admin hover:bg-purple-700 text-white"
            >
              {savingPassword ? "Memproses..." : "Perbarui Kata Sandi"}
            </Button>
          </div>
        </SectionCard>
      )}

      {/* TAB 3: INTEGRASI */}
      {activeTab === "integrasi" && (
        <SectionCard
          title="Status Konektivitas Ekosistem Cloud"
          desc="Integrasi aktif antara Backend Fastify 5, Supabase Cloud, dan Hugging Face Hub."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-2 text-xs">
            {[
              {
                name: "Supabase PostgreSQL & Auth",
                provider: "Supabase Cloud",
                detail: `${dashboard?.tenant?.total_toko ?? 0} Toko · ${dashboard?.pengguna?.total ?? 0
                  } Pengguna terdaftar`,
                connected: Boolean(health?.database ?? dashboard),
                status: health?.database ?? dashboard ? "Terhubung" : "Terputus",
              },
              {
                name: "Supabase Storage Buckets",
                provider: "produk-media, toko-aset, dataset-raw-temp, ai-models",
                detail: `Model aktif: ${dashboard?.ai?.model_aktif || "Belum Ada"}`,
                connected: Boolean(health?.storage ?? dashboard),
                status: health?.storage ?? dashboard ? "Terhubung" : "Perlu Cek",
              },
              {
                name: "Hugging Face Dataset Hub",
                provider: hfStats?.repo_hf || "Belum dikonfigurasi (.env)",
                detail: `${formatNumber(totalHfSynced)} foto tersinkron di repositori`,
                connected: Boolean(health?.huggingface ?? hfStats),
                status: health?.huggingface ?? hfStats ? "Terhubung" : "Belum Terhubung",
              },
              {
                name: "TensorFlow.js Edge Vision Engine",
                provider: `@tensorflow/tfjs (${dashboard?.ai?.arsitektur || "MobileNetV3-Large"})`,
                detail: `${dashboard?.ai?.total_kelas ?? 0} kelas AI terdaftar (${dashboard?.ai?.model_aktif ? "Siap Inferensi" : "Belum Ada Model Aktif"})`,
                connected: Boolean(dashboard?.ai?.model_aktif),
                status: dashboard?.ai?.model_aktif ? "Terhubung" : "Menunggu Aktivasi",
              },
            ].map((srv, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-md border-2 border-fg bg-card shadow-pop-soft flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm">{srv.name}</div>
                    <div className="text-[11px] font-mono text-muted-fg">{srv.provider}</div>
                  </div>
                  <Badge variant={srv.connected ? "green" : "yellow"}>{srv.status}</Badge>
                </div>
                <div className="text-[11px] text-muted-fg pt-2 border-t border-border">
                  {srv.detail}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* TAB 4: PARAMETER SISTEM */}
      {activeTab === "sistem" && (
        <SectionCard
          title="Konfigurasi Standar Platform Tokiva"
          desc="Parameter operasional arsitektur multi-tenant."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-xs">
            {[
              { label: "Arsitektur Backend", val: "Fastify 5 + Supabase JS v2 (Port 5000)" },
              { label: "Arsitektur Frontend", val: "Next.js 15 App Router + TypeScript" },
              { label: "Arsitektur Model AI", val: "MobileNetV3-Large Baseline vs +CBAM Attention (TFJS GraphModel)" },
              { label: "Resolusi Input Kamera AI", val: "224 x 224 RGB Float32 [0, 255] (Internal Preprocessing [-1, 1])" },
              { label: "Isolasi Data Tenant", val: "Multi-Tenant per toko_id + RBAC Guard per Namespace" },
              { label: "Metode Autentikasi Kasir", val: "Email & Password atau PIN 6-Digit" },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-md border border-border bg-muted">
                <div className="text-[10px] text-muted-fg uppercase">{item.label}</div>
                <div className="font-bold mt-0.5">{item.val}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </AdminLayout>
  );
}
