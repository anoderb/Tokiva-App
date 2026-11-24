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
  UsersRound,
  ReceiptText,
  Coins,
  Sparkles,
  Download,
  Search,
  Eye,
  RefreshCw,
} from "lucide-react";
import {
  adminService,
  type DashboardAdminData,
  type TokoPlatformItem,
} from "@/lib/services/admin.service";
import { aiService } from "@/lib/services/ai.service";
import { formatDate, formatNumber, formatRupiah } from "@/lib/format";
import { downloadCsvFile } from "@/lib/utils/csv";

function formatAkurasiPct(val?: number | null): string {
  if (val == null || Number.isNaN(Number(val))) return "—";
  const num = Number(val);
  const pct = num <= 1 ? num * 100 : num;
  return `${pct.toFixed(1)}%`;
}

export default function AdminAnalitikPage() {
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<DashboardAdminData | null>(null);
  const [stores, setStores] = useState<TokoPlatformItem[]>([]);
  const [akurasiAI, setAkurasiAI] = useState<{
    versi_model: string;
    total_deteksi: number;
    diterima_kasir: number;
    butuh_koreksi: number;
    akurasi_lapangan_persen: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"gmv" | "trx" | "produk">("gmv");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, tokoRes, aiRes] = await Promise.all([
        adminService.getDashboard(),
        adminService.getTokoList({ limit: 200 }),
        aiService.getRingkasanAkurasi(undefined, "admin").catch(() => null),
      ]);
      setDashboard(dashRes);
      setStores(tokoRes.items || []);
      if (aiRes) setAkurasiAI(aiRes);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat analitik platform.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const rankedStores = [...stores]
    .filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        s.nama.toLowerCase().includes(q) ||
        (s.kota || "").toLowerCase().includes(q) ||
        (s.pemilik || s.nama_pemilik || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "gmv") return (b.total_gmv || 0) - (a.total_gmv || 0);
      if (sortBy === "trx") return (b.jml_transaksi || 0) - (a.jml_transaksi || 0);
      return (b.jml_produk || 0) - (a.jml_produk || 0);
    });

  const handleExportCSV = () => {
    const headers = [
      "Peringkat",
      "Nama Toko",
      "Pemilik",
      "Kota",
      "Pengguna",
      "Produk",
      "Total Transaksi",
      "Total GMV (Rp)",
      "Status",
    ];
    const rows = rankedStores.map((s, idx) => [
      idx + 1,
      s.nama,
      s.pemilik || s.nama_pemilik || "-",
      s.kota || "-",
      s.jml_pengguna,
      s.jml_produk,
      s.jml_transaksi,
      s.total_gmv,
      s.status,
    ]);
    downloadCsvFile(
      `analitik-tenant-tokiva-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  const displayedAiAccuracy =
    akurasiAI?.akurasi_lapangan_persen != null
      ? `${Number(akurasiAI.akurasi_lapangan_persen).toFixed(1)}%`
      : formatAkurasiPct(dashboard?.ai?.akurasi_top1);

  return (
    <AdminLayout title="Analitik Platform" breadcrumb="Panel Admin / Analitik Platform">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-heading">
            Analitik &amp; Leaderboard Tenant Tokiva
          </h2>
          <p className="text-xs sm:text-[13px] text-muted-fg">
            Pantau agregat volume transaksi (GMV), adopsi AI Vision, dan peringkat performa toko kelontong.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            icon={RefreshCw}
            onClick={loadAnalytics}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button size="sm" variant="outline" icon={Download} onClick={handleExportCSV}>
            Ekspor CSV
          </Button>
        </div>
      </div>

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 mb-5">
        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft">
          <div className="w-9 h-9 rounded-md border-2 border-fg bg-purple-100 flex items-center justify-center mb-2">
            <Store className="w-4 h-4 text-admin" />
          </div>
          <div className="font-heading text-lg font-bold">
            {formatNumber(dashboard?.tenant?.toko_aktif ?? 0)} /{" "}
            {formatNumber(dashboard?.tenant?.total_toko ?? 0)}
          </div>
          <div className="text-[11px] font-semibold text-muted-fg">Tenant Aktif</div>
        </div>

        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft">
          <div className="w-9 h-9 rounded-md border-2 border-fg bg-sky-100 flex items-center justify-center mb-2">
            <UsersRound className="w-4 h-4 text-sky-700" />
          </div>
          <div className="font-heading text-lg font-bold">
            {formatNumber(dashboard?.pengguna?.total ?? 0)}
          </div>
          <div className="text-[11px] font-semibold text-muted-fg">Total Pengguna</div>
        </div>

        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft">
          <div className="w-9 h-9 rounded-md border-2 border-fg bg-amber-100 flex items-center justify-center mb-2">
            <ReceiptText className="w-4 h-4 text-amber-700" />
          </div>
          <div className="font-heading text-lg font-bold">
            {formatNumber(dashboard?.transaksi?.total_transaksi ?? 0)}
          </div>
          <div className="text-[11px] font-semibold text-muted-fg">Total Transaksi POS</div>
        </div>

        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft">
          <div className="w-9 h-9 rounded-md border-2 border-fg bg-emerald-100 flex items-center justify-center mb-2">
            <Coins className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="font-heading text-sm sm:text-base font-bold truncate">
            {formatRupiah(dashboard?.transaksi?.total_gmv ?? 0)}
          </div>
          <div className="text-[11px] font-semibold text-muted-fg">Total GMV Agregat</div>
        </div>

        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft">
          <div className="w-9 h-9 rounded-md border-2 border-fg bg-pink-100 flex items-center justify-center mb-2">
            <Sparkles className="w-4 h-4 text-pink-700" />
          </div>
          <div className="font-heading text-lg font-bold">{displayedAiAccuracy}</div>
          <div className="text-[11px] font-semibold text-muted-fg">
            Akurasi AI ({formatNumber(akurasiAI?.total_deteksi ?? 0)} Scan)
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <SectionCard
        title="Peringkat Performa Tenant (Leaderboard)"
        desc="Urutan toko kelontong berdasarkan nilai transaksi (GMV), frekuensi transaksi, atau jumlah katalog produk."
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2 mb-4">
          <div className="flex items-center gap-1.5">
            {[
              { id: "gmv", label: "Urutkan: Total GMV" },
              { id: "trx", label: "Urutkan: Jml Transaksi" },
              { id: "produk", label: "Urutkan: Katalog Produk" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id as any)}
                className={`px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all cursor-pointer ${sortBy === opt.id
                    ? "bg-admin text-white border-fg shadow-[2px_2px_0px_#1E293B]"
                    : "bg-card border-border text-muted-fg hover:text-fg"
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="relative sm:w-64">
            <Search className="w-4 h-4 text-muted-fg absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama toko, owner, atau kota..."
              className="w-full pl-9 pr-3 py-1.5 rounded-md border-2 border-fg bg-card text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto border-2 border-fg rounded-md">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                <th className="p-3 text-center w-14">Rank</th>
                <th className="p-3">Nama Toko Tenant</th>
                <th className="p-3">Kota</th>
                <th className="p-3 text-center">Pengguna</th>
                <th className="p-3 text-center">Produk</th>
                <th className="p-3 text-right">Volume Transaksi</th>
                <th className="p-3 text-right">Total GMV</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rankedStores.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-muted-fg">
                    {loading ? "Memuat peringkat toko..." : "Tidak ada data toko."}
                  </td>
                </tr>
              ) : (
                rankedStores.map((s, idx) => (
                  <tr key={s.id} className="border-b border-border hover:bg-muted/40">
                    <td className="p-3 text-center font-heading font-bold">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full border border-fg text-xs ${idx === 0
                            ? "bg-amber-300 text-fg"
                            : idx === 1
                              ? "bg-slate-200 text-fg"
                              : idx === 2
                                ? "bg-amber-100 text-fg"
                                : "bg-muted text-muted-fg"
                          }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-fg">{s.nama}</div>
                      <div className="text-[11px] text-muted-fg">
                        Owner: {s.pemilik || s.nama_pemilik || "-"} · Daftar: {formatDate(s.dibuat_pada)}
                      </div>
                    </td>
                    <td className="p-3 text-xs">{s.kota || "-"}</td>
                    <td className="p-3 text-center font-bold text-xs">{s.jml_pengguna}</td>
                    <td className="p-3 text-center font-bold text-xs">
                      {formatNumber(s.jml_produk)}
                    </td>
                    <td className="p-3 text-right font-bold text-xs">
                      {formatNumber(s.jml_transaksi)} trx
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-700 text-xs">
                      {formatRupiah(s.total_gmv)}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          s.status === "aktif"
                            ? "green"
                            : s.status === "ditangguhkan"
                              ? "red"
                              : "gray"
                        }
                      >
                        {s.status === "aktif"
                          ? "Aktif"
                          : s.status === "ditangguhkan"
                            ? "Ditangguhkan"
                            : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/admin/toko/detail?id=${s.id}`}>
                        <Button size="sm" variant="outline" icon={Eye}>
                          Buka
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AdminLayout>
  );
}
