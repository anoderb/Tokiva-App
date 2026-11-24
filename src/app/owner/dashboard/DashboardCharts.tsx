"use client";

import type { ChartData, ChartOptions } from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { SectionCard } from "@/components/ui/section-card";
import { formatNumber, formatRupiahSingkat } from "@/lib/format";
import { formatShortChartDate } from "./useOwnerDashboard";

interface DashboardChartsProps {
  loading: boolean;
  chartRange: "7d" | "30d";
  chartMode: "omzet" | "transaksi";
  onChangeRange: (r: "7d" | "30d") => void;
  onChangeMode: (m: "omzet" | "transaksi") => void;
  periodStats: {
    totalOmzet: number;
    avgDaily: number;
    peakDay: { tanggal: string; omzet: number };
  };
  paymentDistribution: {
    grandTx: number;
    rows: Array<{ key: string; label: string; dotClass: string; nominal: number; txCount: number; persen: number }>;
  };
  lineChartData: ChartData<"line">;
  lineChartOptions: ChartOptions<"line">;
  barChartData: ChartData<"bar">;
  barChartOptions: ChartOptions<"bar">;
  doughnutData: ChartData<"doughnut">;
  doughnutOptions: ChartOptions<"doughnut">;
}

/** Bagian grafik tren penjualan/laba harian & distribusi metode pembayaran */
export function DashboardCharts({
  loading,
  chartRange,
  chartMode,
  onChangeRange,
  onChangeMode,
  periodStats,
  paymentDistribution,
  lineChartData,
  lineChartOptions,
  barChartData,
  barChartOptions,
  doughnutData,
  doughnutOptions,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
      <SectionCard
        className="lg:col-span-2 flex flex-col justify-between"
        title="Grafik Tren Penjualan & Laba"
        desc="Pergerakan omzet harian, estimasi laba kotor, dan volume nota transaksi."
        customAction={
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex rounded-full border-2 border-fg bg-muted p-0.5">
              {(["7d", "30d"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onChangeRange(r)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                    chartRange === r ? "bg-accent text-white shadow-[1px_1px_0px_#1E293B]" : "text-muted-fg hover:text-fg"
                  }`}
                >
                  {r === "7d" ? "7 Hari" : "30 Hari"}
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-full border-2 border-fg bg-muted p-0.5">
              {(["omzet", "transaksi"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChangeMode(m)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                    chartMode === m ? "bg-fg text-bg" : "text-muted-fg hover:text-fg"
                  }`}
                >
                  {m === "omzet" ? "Omzet & Laba" : "Transaksi"}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-3 gap-2 mb-4 p-2.5 rounded-md bg-muted/60 border-2 border-border">
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-fg">Total Omzet ({chartRange === "7d" ? "7H" : "30H"})</div>
            <div className="font-heading text-sm sm:text-base font-bold text-accent truncate">{formatRupiahSingkat(periodStats.totalOmzet)}</div>
          </div>
          <div className="border-x border-border px-2">
            <div className="text-[10px] uppercase font-bold text-muted-fg">Rata-rata / Hari</div>
            <div className="font-heading text-sm sm:text-base font-bold truncate">{formatRupiahSingkat(periodStats.avgDaily)}</div>
          </div>
          <div className="pl-1">
            <div className="text-[10px] uppercase font-bold text-muted-fg">Puncak Penjualan</div>
            <div className="font-heading text-xs sm:text-sm font-bold truncate">
              {periodStats.peakDay.omzet > 0
                ? `${formatShortChartDate(periodStats.peakDay.tanggal)} · ${formatRupiahSingkat(periodStats.peakDay.omzet)}`
                : "Belum ada"}
            </div>
          </div>
        </div>

        <div className="h-[250px] sm:h-[275px] relative">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-fg">Memuat grafik penjualan...</div>
          ) : chartMode === "omzet" ? (
            <Line data={lineChartData} options={lineChartOptions} />
          ) : (
            <Bar data={barChartData} options={barChartOptions} />
          )}
        </div>
      </SectionCard>

      <SectionCard
        className="flex flex-col justify-between"
        title="Metode Pembayaran"
        desc={`Komposisi pembayaran pelanggan (${chartRange === "7d" ? "7 hari terakhir" : "30 hari terakhir"}).`}
      >
        <div className="flex flex-col items-center my-2">
          <div className="w-[168px] h-[168px] relative">
            <Doughnut data={doughnutData} options={doughnutOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-heading text-xl font-extrabold leading-none">{formatNumber(paymentDistribution.grandTx)}</span>
              <span className="text-[10px] font-semibold text-muted-fg mt-1">Total Nota</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-3 text-xs">
          {paymentDistribution.rows.map((m) => (
            <div key={m.key} className="flex items-center justify-between p-2 rounded-md bg-muted/60 border border-border">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-3 h-3 rounded-sm border border-fg shrink-0 ${m.dotClass}`} />
                <span className="font-semibold truncate">{m.label}</span>
                <span className="text-[10px] text-muted-fg">({m.txCount})</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <strong className="font-bold">{formatRupiahSingkat(m.nominal)}</strong>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-card border border-border text-muted-fg min-w-[36px] text-center">
                  {m.persen}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
