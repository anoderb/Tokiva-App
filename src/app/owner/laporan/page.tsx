"use client";

import { useState, useEffect, useCallback } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { PeriodFilter } from "@/components/ui/period-filter";
import { useAuth } from "@/components/auth/auth-provider";
import { laporanService, type LaporanPenjualanData, type LaporanLabaRugiData } from "@/lib/services/laporan.service";
import { formatRupiah, formatRupiahSingkat } from "@/lib/format";
import {
  ShoppingBag,
  ReceiptText,
  Calculator,
  Package,
  Printer,
  RefreshCw,
} from "lucide-react";

export default function LaporanPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [period, setPeriod] = useState("Bulan Ini");
  const [salesReport, setSalesReport] = useState<LaporanPenjualanData | null>(null);
  const [profitReport, setProfitReport] = useState<LaporanLabaRugiData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "7 Hari") {
      start = new Date(now.getTime() - 7 * 86400000);
    } else if (period === "30 Hari") {
      start = new Date(now.getTime() - 30 * 86400000);
    } else if (period === "Tahun Ini") {
      start = new Date(now.getFullYear(), 0, 1);
    }

    const params = {
      tanggal_mulai: start.toISOString().slice(0, 10),
      tanggal_akhir: now.toISOString().slice(0, 10),
    };

    try {
      const [sRes, pRes] = await Promise.all([
        laporanService.getLaporanPenjualan(params),
        laporanService.getLaporanLabaRugi(params),
      ]);
      setSalesReport(sRes);
      setProfitReport(pRes);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (!authLoading && user) {
      loadReports();
    }
  }, [authLoading, user, loadReports]);

  const ringkasan = salesReport?.ringkasan;
  const topProducts = salesReport?.produk_terlaris || [];
  const paymentBreakdown = Object.entries(salesReport?.per_metode_bayar || {});
  const totalOmzet = ringkasan?.total_omzet || 0;

  return (
    <OwnerLayout
      title="Laporan Analitik Penjualan"
      desc="Analisis performa penjualan, metode pembayaran, dan laba rugi berdasarkan periode."
    >
      <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:items-center justify-between">
        <PeriodFilter
          periods={["7 Hari", "30 Hari", "Bulan Ini", "Tahun Ini"]}
          active={period}
          onChange={setPeriod}
          className="flex-1"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={loadReports}>
            Segarkan
          </Button>
          <Button size="sm" variant="outline" icon={Printer} onClick={() => window.print()}>
            Cetak
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <StatCard
          icon={ShoppingBag}
          value={formatRupiahSingkat(totalOmzet)}
          label="Total Penjualan"
        />
        <StatCard
          icon={ReceiptText}
          value={String(ringkasan?.jumlah_transaksi || 0)}
          label="Jumlah Transaksi"
        />
        <StatCard
          icon={Calculator}
          value={formatRupiah(ringkasan?.rata_rata_transaksi || 0)}
          label="Rata-rata Transaksi"
        />
        <StatCard
          icon={Package}
          value={String(ringkasan?.total_item_terjual || 0)}
          label="Unit Produk Terjual"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Produk Terlaris Tanpa Emoji */}
        <SectionCard title="Produk Terlaris" desc="Berdasarkan kuantitas barang terjual.">
          <div className="overflow-x-auto border-2 border-fg rounded-md">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">Nama Produk</th>
                  <th className="p-2.5">Terjual</th>
                  <th className="p-2.5">Nilai Penjualan</th>
                  <th className="p-2.5">Kontribusi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-fg">
                      Memuat laporan...
                    </td>
                  </tr>
                ) : topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-fg">
                      Belum ada transaksi pada periode ini.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, idx) => {
                    const pct =
                      totalOmzet > 0
                        ? `${Math.round((Number(p.total_omzet) / totalOmzet) * 100)}%`
                        : "0%";
                    return (
                      <tr key={p.produk_id || idx} className="border-b border-border hover:bg-muted/50">
                        <td className="p-2.5 font-heading font-bold">{idx + 1}</td>
                        <td className="p-2.5 font-semibold">{p.nama_produk}</td>
                        <td className="p-2.5">{p.total_qty} unit</td>
                        <td className="p-2.5 font-bold text-accent">
                          {formatRupiah(p.total_omzet)}
                        </td>
                        <td className="p-2.5">
                          <Badge variant="purple">{pct}</Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Rincian Metode Pembayaran & Laba Rugi */}
        <SectionCard
          title="Metode Pembayaran & Ringkasan Laba"
          desc="Distribusi pembayaran transaksi dan margin keuntungan."
        >
          <div className="space-y-3 text-xs">
            <div className="overflow-x-auto border-2 border-fg rounded-md">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                    <th className="p-2.5">Metode Bayar</th>
                    <th className="p-2.5">Jumlah Nota</th>
                    <th className="p-2.5 text-right">Total Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentBreakdown.map(([method, val]) => (
                    <tr key={method} className="border-b border-border">
                      <td className="p-2.5 uppercase font-bold">{method}</td>
                      <td className="p-2.5">{val.jumlah_transaksi} transaksi</td>
                      <td className="p-2.5 text-right font-bold">
                        {formatRupiah(val.total_nominal)}
                      </td>
                    </tr>
                  ))}
                  {paymentBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-muted-fg">
                        Belum ada data metode pembayaran.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {profitReport && (
              <div className="p-3.5 rounded-lg bg-muted/50 border-2 border-border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-fg">Penjualan Bersih:</span>
                  <strong>{formatRupiah(profitReport.penjualan_bersih)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-fg">Total HPP (Modal Barang):</span>
                  <strong className="text-red-600">-{formatRupiah(profitReport.hpp_total)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-fg">Laba Kotor:</span>
                  <strong className="text-emerald-600">
                    {formatRupiah(profitReport.laba_kotor)} ({profitReport.margin_kotor_persen}%)
                  </strong>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-border text-sm">
                  <span className="font-bold">Laba Bersih Operasional:</span>
                  <strong className="text-accent font-extrabold">
                    {formatRupiah(profitReport.laba_bersih)}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </OwnerLayout>
  );
}
