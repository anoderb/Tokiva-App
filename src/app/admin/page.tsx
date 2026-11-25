"use client";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { useToast } from "@/components/ui/toast";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Store,
  CheckCircle,
  Users,
  ReceiptText,
  Package,
  Brain,
  PlusCircle,
  CheckCheck,
  UsersRound,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { adminService, type DashboardAdminData } from "@/lib/services/admin.service";
import { aiService } from "@/lib/services/ai.service";
import { formatDate, formatNumber, formatRupiah } from "@/lib/format";
import { useAuth } from "@/components/auth/auth-provider";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function formatAkurasiPct(val?: number | null): string {
  if (val == null || Number.isNaN(Number(val))) return "-";
  const num = Number(val);
  const pct = num <= 1 ? num * 100 : num;
  return `${pct.toFixed(1)}%`;
}

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardAdminData | null>(null);
  const [akurasiRingkasan, setAkurasiRingkasan] = useState<{
    versi_model: string;
    total_deteksi: number;
    diterima_kasir: number;
    butuh_koreksi: number;
    akurasi_lapangan_persen: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [growthView, setGrowthView] = useState<"toko" | "user" | "transaksi">("toko");

  const loadData = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const [dashRes, akurasiRes] = await Promise.all([
        adminService.getDashboard(),
        aiService.getRingkasanAkurasi(undefined, "admin").catch(() => null),
      ]);
      setDashboard(dashRes);
      setLoadFailed(false);
      if (akurasiRes) setAkurasiRingkasan(akurasiRes);
      return true;
    } catch (err: any) {
      setLoadFailed(true);
      toast.error(err?.message || "Gagal memuat data dashboard admin.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleManualRefresh = async () => {
    const ok = await loadData();
    if (ok) {
      toast.success("Data metrik platform berhasil diperbarui.");
    }
  };

  const totalToko = dashboard?.tenant?.total_toko ?? 0;
  const tokoAktif = dashboard?.tenant?.toko_aktif ?? 0;
  const tokoNonaktif = dashboard?.tenant?.toko_nonaktif ?? 0;
  const persenAktif = totalToko > 0 ? Math.round((tokoAktif / totalToko) * 100) : 0;

  const statsData = [
    {
      icon: Store,
      val: formatNumber(totalToko),
      label: "Total Toko",
      sub: `${formatNumber(tokoAktif)} aktif · ${formatNumber(tokoNonaktif)} nonaktif`,
      bg: "bg-purple-100",
      color: "text-admin",
    },
    {
      icon: CheckCircle,
      val: `${formatNumber(tokoAktif)} (${persenAktif}%)`,
      label: "Toko Aktif",
      sub: `${formatNumber(tokoNonaktif)} nonaktif/ditangguhkan`,
      bg: "bg-emerald-100",
      color: "text-emerald-600",
    },
    {
      icon: Users,
      val: formatNumber(dashboard?.pengguna?.total ?? 0),
      label: "Total Pengguna",
      sub: `${formatNumber(dashboard?.pengguna?.owner ?? 0)} Owner · ${formatNumber(dashboard?.pengguna?.kasir ?? 0)} Kasir`,
      bg: "bg-sky-100",
      color: "text-sky-700",
    },
    {
      icon: ReceiptText,
      val: formatNumber(dashboard?.transaksi?.total_transaksi ?? 0),
      label: "Total Transaksi",
      sub: `GMV ${formatRupiah(dashboard?.transaksi?.total_gmv ?? 0)}`,
      bg: "bg-amber-100",
      color: "text-amber-600",
    },
    {
      icon: Package,
      val: formatNumber(dashboard?.produk_master?.total ?? 0),
      label: "Produk Global",
      sub: `${formatNumber(dashboard?.produk_master?.merek_unik ?? 0)} merek unik`,
      bg: "bg-purple-100",
      color: "text-purple-600",
    },
    {
      icon: Brain,
      val: formatNumber(dashboard?.ai?.total_sampel ?? 0),
      label: "Total Gambar Dataset",
      sub: `${formatNumber(dashboard?.ai?.total_kelas ?? 0)} kelas · ${formatNumber(dashboard?.ai?.tersinkron_hf ?? 0)} di HF`,
      bg: "bg-pink-100",
      color: "text-pink-600",
    },
  ];

  const recentStores = dashboard?.toko_terbaru ?? [];

  const growthLabels = dashboard?.pertumbuhan?.labels ?? ["Bulan -3", "Bulan -2", "Bulan -1", "Saat Ini"];
  const growthSeries =
    growthView === "toko"
      ? dashboard?.pertumbuhan?.toko ?? [0, 0, 0, totalToko]
      : growthView === "user"
        ? dashboard?.pertumbuhan?.pengguna ?? [0, 0, 0, dashboard?.pengguna?.total ?? 0]
        : dashboard?.pertumbuhan?.transaksi ?? [0, 0, 0, dashboard?.transaksi?.total_transaksi ?? 0];

  const growthData = {
    labels: growthLabels,
    datasets: [
      {
        label:
          growthView === "toko"
            ? "Akumulasi Toko"
            : growthView === "user"
              ? "Akumulasi Pengguna"
              : "Akumulasi Transaksi Selesai",
        data: growthSeries,
        borderColor: "#7C3AED",
        backgroundColor: "rgba(124, 58, 237, 0.08)",
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: "#7C3AED",
        pointBorderColor: "#1E293B",
        pointBorderWidth: 2,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
          boxWidth: 12,
        },
      },
    },
    scales: {
      x: { grid: { color: "#F1F5F9" }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: "#F1F5F9" }, ticks: { precision: 0, font: { size: 10 } } },
    },
  };

  const doughnutData = {
    labels: ["Aktif", "Nonaktif"],
    datasets: [
      {
        data: totalToko > 0 ? [tokoAktif, tokoNonaktif] : [0, 1],
        backgroundColor: totalToko > 0 ? ["#7C3AED", "#94A3B8"] : ["#E2E8F0", "#E2E8F0"],
        borderColor: "#1E293B",
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    cutout: "65%",
  };

  const health = dashboard?.kesehatan_layanan;
  const infraItems = [
    {
      name: "Fastify 5 Core API Backend",
      ok: !loadFailed && Boolean(health?.backend ?? dashboard),
      status: !loadFailed && (health?.backend ?? dashboard) ? "Normal" : "Terputus",
    },
    {
      name: "Supabase PostgreSQL Database",
      ok: !loadFailed && Boolean(health?.database ?? dashboard),
      status: !loadFailed && (health?.database ?? dashboard) ? "Normal" : "Terputus",
    },
    {
      name: "Supabase Auth & Storage Buckets",
      ok: !loadFailed && Boolean(health?.storage ?? dashboard),
      status: !loadFailed && (health?.storage ?? dashboard) ? "Normal" : "Perlu Cek",
    },
    {
      name: "Model TFJS Edge Inference",
      ok: Boolean(dashboard?.ai?.model_aktif),
      status: dashboard?.ai?.model_aktif ? "Aktif" : "Belum Aktif",
    },
    {
      name: "Hugging Face Dataset Hub Sync",
      ok: Boolean(health?.huggingface),
      status: health?.huggingface ? "Tersambung" : "Token Belum Ada",
    },
  ];

  const getStoreStatusBadge = (status?: string) => {
    if (status === "aktif") return <Badge variant="green">Aktif</Badge>;
    if (status === "ditangguhkan") return <Badge variant="red">Ditangguhkan</Badge>;
    return <Badge variant="gray">Nonaktif</Badge>;
  };

  return (
    <AdminLayout title="Dashboard" breadcrumb="Panel Admin / Dashboard">
      {/* Welcome Banner */}
      <div className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-card border-2 border-fg rounded-md shadow-pop-soft">
          <div>
            <h2 className="text-base sm:text-lg font-bold">
              Selamat Datang, <strong>{user?.nama_lengkap || user?.nama || "Administrator"}</strong>
            </h2>
            <p className="text-xs sm:text-[13px] text-muted-fg">
              Berikut ringkasan aktivitas dan performa real-time platform Tokiva.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-muted-fg">{formatDate(new Date().toISOString())}</span>
            <Button
              size="sm"
              variant="outline"
              icon={RefreshCw}
              disabled={loading}
              onClick={handleManualRefresh}
            >
              {loading ? "Memuat..." : "Perbarui Data"}
            </Button>
          </div>
        </div>
      </div>

      {/* 6 Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 mb-5">
        {statsData.map((s, i) => (
          <div
            key={i}
            className="bg-card border-2 border-fg rounded-md p-3 shadow-pop-soft flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`w-9 h-9 rounded-sm border-2 border-fg flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B] ${s.bg}`}
              >
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </div>
            <div>
              <div className="font-heading text-lg sm:text-xl font-bold">{s.val}</div>
              <div className="text-[11px] font-semibold text-fg leading-tight">{s.label}</div>
              <div className="text-[10px] text-muted-fg mt-1 truncate">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Growth Chart + Store Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-5">
        <SectionCard title="Pertumbuhan Platform (4 Bulan Terakhir)" desc="Akumulasi riil jumlah toko, pengguna, dan transaksi selesai.">
          <div className="flex gap-1.5 mb-2 mt-1">
            <button
              onClick={() => setGrowthView("toko")}
              className={`px-3 py-1 rounded-full border-2 text-[11px] font-semibold transition-all cursor-pointer ${growthView === "toko"
                  ? "bg-admin text-white border-fg shadow-[2px_2px_0px_#1E293B]"
                  : "border-border bg-card hover:bg-muted"
                }`}
            >
              Toko
            </button>
            <button
              onClick={() => setGrowthView("user")}
              className={`px-3 py-1 rounded-full border-2 text-[11px] font-semibold transition-all cursor-pointer ${growthView === "user"
                  ? "bg-admin text-white border-fg shadow-[2px_2px_0px_#1E293B]"
                  : "border-border bg-card hover:bg-muted"
                }`}
            >
              Pengguna
            </button>
            <button
              onClick={() => setGrowthView("transaksi")}
              className={`px-3 py-1 rounded-full border-2 text-[11px] font-semibold transition-all cursor-pointer ${growthView === "transaksi"
                  ? "bg-admin text-white border-fg shadow-[2px_2px_0px_#1E293B]"
                  : "border-border bg-card hover:bg-muted"
                }`}
            >
              Transaksi
            </button>
          </div>
          <div className="h-[220px] sm:h-[250px] relative">
            <Line data={growthData} options={lineOptions} />
          </div>
        </SectionCard>

        <SectionCard title="Status Toko" desc="Distribusi status seluruh tenant terdaftar.">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mt-3">
            <div className="w-[150px] h-[150px] relative shrink-0 flex items-center justify-center">
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-heading text-lg font-bold">{formatNumber(totalToko)}</span>
                <span className="text-[10px] text-muted-fg">Tenant</span>
              </div>
            </div>
            <div className="flex-1 w-full space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-muted border border-border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-admin border border-fg" />
                  <span>Aktif</span>
                </div>
                <div className="flex items-center gap-2">
                  <strong className="font-bold text-sm">{formatNumber(tokoAktif)}</strong>
                  <span className="text-[11px] text-muted-fg">{persenAktif}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted border border-border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-slate-400 border border-fg" />
                  <span>Nonaktif / Ditangguhkan</span>
                </div>
                <div className="flex items-center gap-2">
                  <strong className="font-bold text-sm">{formatNumber(tokoNonaktif)}</strong>
                  <span className="text-[11px] text-muted-fg">
                    {totalToko > 0 ? 100 - persenAktif : 0}%
                  </span>
                </div>
              </div>
              <Link href="/admin/toko" className="inline-block mt-2">
                <Button size="sm" variant="outline" icon={ArrowRight}>
                  Lihat Manajemen Toko
                </Button>
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* AI Overview + Recent Stores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-5">
        <SectionCard title="Status Kecerdasan Buatan" desc="Performa model inferensi TFJS dan dataset visual.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
            <div className="p-3 rounded-md border-2 border-border bg-muted">
              <div className="text-[10px] text-muted-fg uppercase tracking-wider">Model Aktif</div>
              <div className="font-bold text-sm mt-0.5">
                {dashboard?.ai?.model_aktif || "Belum Ada Model Aktif"}
              </div>
              <div className="text-[11px] text-muted-fg mb-2">
                Arsitektur: {dashboard?.ai?.arsitektur || "MobileNetV3-Large"}
              </div>
              <Badge variant={dashboard?.ai?.model_aktif ? "green" : "yellow"}>
                {dashboard?.ai?.model_aktif ? "Aktif di Edge/Kasir" : "Menunggu Aktivasi"}
              </Badge>
            </div>

            <div className="p-3 rounded-md border-2 border-border bg-muted">
              <div className="text-[10px] text-muted-fg uppercase tracking-wider mb-1">Performa Model</div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div>
                  Top-1 Val:{" "}
                  <strong>{formatAkurasiPct(dashboard?.ai?.akurasi_top1)}</strong>
                </div>
                <div>
                  Latensi:{" "}
                  <strong>
                    {dashboard?.ai?.latensi_ms != null ? `${Number(dashboard.ai.latensi_ms).toFixed(1)} ms` : "-"}
                  </strong>
                </div>
                <div>
                  Kelas AI: <strong>{formatNumber(dashboard?.ai?.total_kelas ?? 0)}</strong>
                </div>
                <div>
                  Akurasi POS:{" "}
                  <strong>
                    {akurasiRingkasan?.akurasi_lapangan_persen != null
                      ? `${akurasiRingkasan.akurasi_lapangan_persen}%`
                      : "-"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-md border-2 border-border bg-muted">
              <div className="text-[10px] text-muted-fg uppercase tracking-wider mb-1">Dataset Gambar</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Total Sampel:</span>
                  <strong>{formatNumber(dashboard?.ai?.total_sampel ?? 0)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tersinkron HF:</span>
                  <span className="text-emerald-700 font-bold">
                    {formatNumber(dashboard?.ai?.tersinkron_hf ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-md border-2 border-border bg-muted">
              <div className="text-[10px] text-muted-fg uppercase tracking-wider mb-1">Aktivitas Inferensi</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Total Deteksi:</span>
                  <strong>{formatNumber(akurasiRingkasan?.total_deteksi ?? 0)} kali</strong>
                </div>
                <div className="flex justify-between">
                  <span>Diterima Kasir:</span>
                  <span className="text-emerald-600 font-bold">
                    {formatNumber(akurasiRingkasan?.diterima_kasir ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Butuh Koreksi:</span>
                  <span className="text-amber-600 font-bold">
                    {formatNumber(akurasiRingkasan?.butuh_koreksi ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <Link href="/admin/ai">
              <Button size="sm" variant="outline" icon={ArrowRight}>
                Buka Manajemen AI
              </Button>
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Toko Terbaru" desc="Tenant kelontong yang terdaftar pada sistem.">
          <div className="overflow-x-auto border-2 border-fg rounded-md mt-2">
            <table className="w-full min-w-[540px] text-[13px]">
              <thead>
                <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                  <th className="p-2.5">Nama Toko</th>
                  <th className="p-2.5">Pemilik</th>
                  <th className="p-2.5">Tgl Daftar</th>
                  <th className="p-2.5">Pengguna</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentStores.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-xs text-muted-fg">
                      {loading ? "Memuat daftar toko..." : "Belum ada toko terdaftar."}
                    </td>
                  </tr>
                ) : (
                  recentStores.map((s) => (
                    <tr key={s.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-2.5 font-semibold text-admin">
                        <Link href={`/admin/toko/detail?id=${s.id}`}>{s.nama}</Link>
                      </td>
                      <td className="p-2.5">{s.pemilik || s.nama_pemilik || "-"}</td>
                      <td className="p-2.5 text-xs text-muted-fg">{formatDate(s.dibuat_pada)}</td>
                      <td className="p-2.5 font-bold">{s.jml_pengguna ?? 0}</td>
                      <td className="p-2.5">{getStoreStatusBadge(s.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3">
            <Link href="/admin/toko">
              <Button size="sm" variant="outline" icon={ArrowRight}>
                Lihat Semua Toko
              </Button>
            </Link>
          </div>
        </SectionCard>
      </div>

      {/* System Health + Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <SectionCard title="Status Infrastruktur" desc="Pemantauan kesehatan layanan platform.">
          <div className="space-y-2 mt-2 text-xs">
            {infraItems.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 bg-muted rounded-md border border-border"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full border border-fg ${h.ok ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                  />
                  <span className="font-medium">{h.name}</span>
                </div>
                <Badge variant={h.ok ? "green" : "yellow"}>{h.status}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Akses Cepat" desc="Pintasan ke modul administrasi utama.">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
            {[
              { icon: PlusCircle, label: "Tambah Produk Global", href: "/admin/produk" },
              { icon: Store, label: "Manajemen Toko", href: "/admin/toko" },
              { icon: CheckCheck, label: "Validasi Dataset AI", href: "/admin/ai?tab=validasi" },
              { icon: Brain, label: "Manajemen Model AI", href: "/admin/ai?tab=deploy" },
              { icon: UsersRound, label: "Manajemen Pengguna", href: "/admin/pengguna" },
            ].map((q, i) => (
              <Link
                key={i}
                href={q.href}
                className="p-3.5 bg-card border-2 border-border rounded-md text-center cursor-pointer hover:border-admin hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:shadow-[3px_3px_0px_#7C3AED] transition-all flex flex-col items-center justify-center gap-1.5"
              >
                <q.icon className="w-5 h-5 text-admin" />
                <span className="text-[11px] font-semibold text-fg leading-tight">{q.label}</span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </AdminLayout>
  );
}
