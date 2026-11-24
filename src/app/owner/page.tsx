"use client";

import Link from "next/link";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { DashboardKpiGrid } from "./dashboard/DashboardKpiGrid";
import { DashboardCharts } from "./dashboard/DashboardCharts";
import { DashboardInsightsGrid } from "./dashboard/DashboardInsightsGrid";
import {
  formatFullCurrentDate,
  getLocalGreeting,
  useOwnerDashboard,
} from "./dashboard/useOwnerDashboard";
import {
  ChartNoAxesCombined,
  Package,
  RefreshCw,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react";

const QUICK_ACTIONS = [
  { label: "Buka Kasir POS", href: "/owner/penjualan", icon: ShoppingCart, accent: true },
  { label: "Kelola Produk", href: "/owner/produk", icon: Package, accent: false },
  { label: "Catat Kulakan", href: "/owner/pembelian", icon: Truck, accent: false },
  { label: "Laporan Analitik", href: "/owner/laporan", icon: ChartNoAxesCombined, accent: false },
];

export default function OwnerDashboardPage() {
  const dash = useOwnerDashboard();

  return (
    <OwnerLayout
      title="Ringkasan Operasional Toko"
      desc="Pantau grafik penjualan, metode pembayaran, produk terlaris, dan kesehatan stok secara real-time."
    >
      <div className="bg-card border-2 border-fg rounded-lg p-4 sm:p-5 shadow-pop-soft mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-lime-100 text-lime-900 border-2 border-fg">
                <Store className="w-3 h-3" />
                {dash.toko?.nama || dash.user?.toko?.nama || "Toko Kelontong"}
              </span>
              <span className="text-[11px] font-medium text-muted-fg">{formatFullCurrentDate()}</span>
            </div>
            <h2 className="font-heading text-lg sm:text-xl font-bold leading-snug">
              {getLocalGreeting()},{" "}
              <span className="text-accent">{dash.user?.nama_lengkap || dash.user?.nama || "Pemilik Toko"}</span>
            </h2>
            <p className="text-xs text-muted-fg">
              Pantau arus transaksi harian, tren laba kotor, dan ketersediaan barang toko Anda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {QUICK_ACTIONS.map((act) => (
              <Link
                key={act.href}
                href={act.href}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md border-2 border-fg text-xs font-bold transition-all hover:-translate-y-0.5 ${
                  act.accent
                    ? "bg-accent text-white shadow-[3px_3px_0px_#1E293B]"
                    : "bg-muted/70 hover:bg-muted text-fg shadow-[2px_2px_0px_#1E293B]"
                }`}
              >
                <act.icon className="w-3.5 h-3.5 shrink-0" />
                <span>{act.label}</span>
              </Link>
            ))}
            <Button
              size="sm"
              variant="outline"
              icon={RefreshCw}
              disabled={dash.loading}
              onClick={() => dash.fetchDashboard(true)}
            >
              {dash.loading ? "Memuat..." : "Segarkan"}
            </Button>
          </div>
        </div>
      </div>

      <DashboardKpiGrid
        omzetHariIni={dash.omzetHariIni}
        txHariIni={dash.txHariIni}
        rataKeranjang={dash.rataKeranjang}
        labaHariIni={dash.labaHariIni}
        pertumbuhanPersen={dash.pertumbuhanPersen}
        marginHariIni={dash.marginHariIni}
        totalProdukAktif={dash.totalProdukAktif}
        jmlStokMenipis={dash.jmlStokMenipis}
        totalPiutang={dash.totalPiutang}
        jmlPelangganBon={dash.jmlPelangganBon}
        activeShifts={dash.activeShifts}
      />

      <DashboardCharts
        loading={dash.loading}
        chartRange={dash.chartRange}
        chartMode={dash.chartMode}
        onChangeRange={dash.setChartRange}
        onChangeMode={dash.setChartMode}
        periodStats={dash.periodStats}
        paymentDistribution={dash.paymentDistribution}
        lineChartData={dash.lineChartData}
        lineChartOptions={dash.lineChartOptions}
        barChartData={dash.barChartData}
        barChartOptions={dash.barChartOptions}
        doughnutData={dash.doughnutData}
        doughnutOptions={dash.doughnutOptions}
      />

      <DashboardInsightsGrid
        loading={dash.loading}
        topProducts={dash.topProducts}
        lowStocks={dash.lowStocks}
        maxTopProductOmzet={dash.maxTopProductOmzet}
      />
    </OwnerLayout>
  );
}
