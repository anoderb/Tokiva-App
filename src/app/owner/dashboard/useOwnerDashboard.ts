import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/components/auth/auth-provider";
import {
  laporanService,
  type DashboardOwnerData,
  type LaporanPenjualanData,
} from "@/lib/services/laporan.service";
import { invalidateApiCache } from "@/lib/api";
import { formatRupiah, formatRupiahSingkat } from "@/lib/format";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function getLocalGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

export function getWibDateOffset(offsetDays: number): string {
  const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  nowWib.setUTCDate(nowWib.getUTCDate() + offsetDays);
  return nowWib.toISOString().slice(0, 10);
}

export function formatShortChartDate(yyyyMmDd: string): string {
  if (!yyyyMmDd) return "-";
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export function formatFullCurrentDate(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const PAYMENT_METHOD_META: Array<{ key: string; label: string; color: string; dotClass: string }> = [
  { key: "tunai", label: "Tunai", color: "#0CAF60", dotClass: "bg-[#0CAF60]" },
  { key: "qris", label: "QRIS", color: "#0EA5E9", dotClass: "bg-sky-500" },
  { key: "split", label: "Split Bayar", color: "#8B5CF6", dotClass: "bg-violet-500" },
  { key: "bon", label: "Kas Bon", color: "#F59E0B", dotClass: "bg-amber-500" },
];

/** Hook state, fetch, dan transformasi Chart.js untuk Dashboard Operasional Owner */
export function useOwnerDashboard() {
  const { user, toko, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [dashboard, setDashboard] = useState<DashboardOwnerData | null>(null);
  const [sales30d, setSales30d] = useState<LaporanPenjualanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  const [chartRange, setChartRange] = useState<"7d" | "30d">("7d");
  const [chartMode, setChartMode] = useState<"omzet" | "transaksi">("omzet");

  useEffect(() => {
    const syncTheme = () => setIsDark(document.documentElement.classList.contains("dark"));
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const fetchDashboard = useCallback(
    async (showNotification = false) => {
      if (showNotification) invalidateApiCache();
      setLoading(true);
      const start30d = getWibDateOffset(-29);
      const today = getWibDateOffset(0);
      try {
        const [dashRes, salesRes] = await Promise.all([
          laporanService.getDashboardOwner(),
          laporanService.getLaporanPenjualan({ tanggal_awal: start30d, tanggal_akhir: today }).catch(() => null),
        ]);
        setDashboard(dashRes);
        setSales30d(salesRes);
        if (showNotification) toast.success("Data ringkasan operasional berhasil diperbarui.");
      } catch {
        if (showNotification) toast.error("Gagal memuat pembaruan data dashboard.");
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboard(false);
    }
  }, [authLoading, user, fetchDashboard]);

  const omzetHariIni = dashboard?.hari_ini?.omzet || 0;
  const txHariIni = dashboard?.hari_ini?.jumlah_transaksi || 0;
  const rataKeranjang = dashboard?.hari_ini?.rata_rata_keranjang || 0;
  const labaHariIni = dashboard?.hari_ini?.laba_kotor_estimasi || 0;
  const pertumbuhanPersen = dashboard?.hari_ini?.pertumbuhan_persen ?? 0;
  const marginHariIni = omzetHariIni > 0 ? Math.round((labaHariIni / omzetHariIni) * 100) : 0;

  const totalProdukAktif = dashboard?.inventaris?.total_produk_aktif || 0;
  const jmlStokMenipis = dashboard?.inventaris?.jumlah_stok_menipis || 0;
  const totalPiutang = dashboard?.keuangan?.total_piutang_aktif || 0;
  const jmlPelangganBon = dashboard?.keuangan?.jumlah_pelanggan_bon || 0;

  const topProducts = dashboard?.produk_terlaris || [];
  const lowStocks = dashboard?.inventaris?.produk_stok_menipis || [];
  const activeShifts = dashboard?.shift_aktif || [];

  const activeTrendSeries = useMemo(() => {
    if (chartRange === "7d") {
      if (dashboard?.grafik_7_hari && dashboard.grafik_7_hari.length > 0) return dashboard.grafik_7_hari;
      return Array.from({ length: 7 }, (_, idx) => ({
        tanggal: getWibDateOffset(idx - 6),
        omzet: 0,
        laba_kotor: 0,
        jumlah_transaksi: 0,
      }));
    }
    const map30 = new Map((sales30d?.tren_harian || []).map((item) => [item.tanggal, item]));
    return Array.from({ length: 30 }, (_, idx) => {
      const dStr = getWibDateOffset(idx - 29);
      const found = map30.get(dStr);
      return {
        tanggal: dStr,
        omzet: Number(found?.omzet || 0),
        laba_kotor: Number(found?.laba_kotor || 0),
        jumlah_transaksi: Number(found?.jumlah_transaksi || 0),
      };
    });
  }, [chartRange, dashboard?.grafik_7_hari, sales30d?.tren_harian]);

  const periodStats = useMemo(() => {
    let totalOmzet = 0;
    let totalLaba = 0;
    let totalTx = 0;
    let peakDay = { tanggal: "", omzet: 0 };
    for (const d of activeTrendSeries) {
      totalOmzet += d.omzet;
      totalLaba += d.laba_kotor;
      totalTx += d.jumlah_transaksi;
      if (d.omzet > peakDay.omzet) peakDay = { tanggal: d.tanggal, omzet: d.omzet };
    }
    const avgDaily = activeTrendSeries.length > 0 ? Math.round(totalOmzet / activeTrendSeries.length) : 0;
    return { totalOmzet, totalLaba, totalTx, avgDaily, peakDay };
  }, [activeTrendSeries]);

  const paymentDistribution = useMemo(() => {
    const source = chartRange === "7d" ? dashboard?.per_metode_bayar || {} : sales30d?.per_metode_bayar || {};
    let grandNominal = 0;
    let grandTx = 0;
    const rows = PAYMENT_METHOD_META.map((meta) => {
      const item = source[meta.key];
      const nominal = Number(item?.total_nominal || 0);
      const txCount = Number(item?.jumlah_transaksi || 0);
      grandNominal += nominal;
      grandTx += txCount;
      return { ...meta, nominal, txCount };
    });
    return {
      grandNominal,
      grandTx,
      rows: rows.map((r) => ({ ...r, persen: grandNominal > 0 ? Math.round((r.nominal / grandNominal) * 100) : 0 })),
    };
  }, [chartRange, dashboard?.per_metode_bayar, sales30d?.per_metode_bayar]);

  const gridColor = isDark ? "rgba(148, 163, 184, 0.14)" : "#F1F5F9";
  const tickColor = isDark ? "#94A3B8" : "#64748B";
  const chartBorderStroke = isDark ? "#0F172A" : "#1E293B";
  const chartLabels = useMemo(() => activeTrendSeries.map((d) => formatShortChartDate(d.tanggal)), [activeTrendSeries]);

  const lineChartData = useMemo(
    () => ({
      labels: chartLabels,
      datasets: [
        {
          label: "Omzet Penjualan",
          data: activeTrendSeries.map((d) => d.omzet),
          borderColor: "#0CAF60",
          backgroundColor: "rgba(12, 175, 96, 0.14)",
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: chartRange === "7d" ? 4.5 : 2.5,
          pointHoverRadius: 6,
          pointBackgroundColor: "#0CAF60",
          pointBorderColor: chartBorderStroke,
          pointBorderWidth: 2,
        },
        {
          label: "Estimasi Laba Kotor",
          data: activeTrendSeries.map((d) => d.laba_kotor),
          borderColor: "#F59E0B",
          backgroundColor: "rgba(245, 158, 11, 0.10)",
          borderWidth: 2.5,
          borderDash: [5, 4],
          fill: true,
          tension: 0.35,
          pointRadius: chartRange === "7d" ? 3.5 : 2,
          pointHoverRadius: 5,
          pointBackgroundColor: "#FBBF24",
          pointBorderColor: chartBorderStroke,
          pointBorderWidth: 1.5,
        },
      ],
    }),
    [activeTrendSeries, chartLabels, chartRange, chartBorderStroke]
  );

  const lineChartOptions: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom", labels: { color: tickColor, font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: 600 }, boxWidth: 12, usePointStyle: true } },
        tooltip: { backgroundColor: "#0F172A", titleColor: "#F8FAFC", bodyColor: "#E2E8F0", borderColor: "#334155", borderWidth: 1, padding: 10, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatRupiah(Number(ctx.parsed.y || 0))}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: tickColor, maxTicksLimit: chartRange === "7d" ? 7 : 10, font: { family: "'Plus Jakarta Sans', sans-serif", size: 10, weight: 600 } } },
        y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor, font: { family: "'Plus Jakarta Sans', sans-serif", size: 10 }, callback: (val) => formatRupiahSingkat(Number(val)) } },
      },
    }),
    [chartRange, gridColor, tickColor]
  );

  const barChartData = useMemo(
    () => ({
      labels: chartLabels,
      datasets: [
        {
          label: "Jumlah Transaksi",
          data: activeTrendSeries.map((d) => d.jumlah_transaksi),
          backgroundColor: "rgba(14, 165, 233, 0.85)",
          hoverBackgroundColor: "#0CAF60",
          borderColor: chartBorderStroke,
          borderWidth: 2,
          borderRadius: 6,
          maxBarThickness: 34,
        },
      ],
    }),
    [activeTrendSeries, chartLabels, chartBorderStroke]
  );

  const barChartOptions: ChartOptions<"bar"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { color: tickColor, font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: 600 }, boxWidth: 12 } },
        tooltip: { backgroundColor: "#0F172A", padding: 10, callbacks: { label: (ctx) => ` ${ctx.parsed.y || 0} nota transaksi` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: tickColor, maxTicksLimit: chartRange === "7d" ? 7 : 10, font: { family: "'Plus Jakarta Sans', sans-serif", size: 10, weight: 600 } } },
        y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor, precision: 0, font: { family: "'Plus Jakarta Sans', sans-serif", size: 10 } } },
      },
    }),
    [chartRange, gridColor, tickColor]
  );

  const hasPaymentData = paymentDistribution.grandNominal > 0;
  const doughnutData = useMemo(
    () =>
      !hasPaymentData
        ? {
            labels: ["Belum Ada Transaksi"],
            datasets: [{ data: [1], backgroundColor: [isDark ? "#334155" : "#E2E8F0"], borderColor: chartBorderStroke, borderWidth: 2 }],
          }
        : {
            labels: paymentDistribution.rows.map((r) => r.label),
            datasets: [{ data: paymentDistribution.rows.map((r) => r.nominal), backgroundColor: paymentDistribution.rows.map((r) => r.color), borderColor: chartBorderStroke, borderWidth: 2, hoverOffset: 4 }],
          },
    [hasPaymentData, isDark, paymentDistribution.rows, chartBorderStroke]
  );

  const doughnutOptions: ChartOptions<"doughnut"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "66%",
      plugins: {
        legend: { display: false },
        tooltip: { enabled: hasPaymentData, backgroundColor: "#0F172A", padding: 10, callbacks: { label: (ctx) => ` ${ctx.label}: ${formatRupiah(Number(ctx.parsed || 0))}` } },
      },
    }),
    [hasPaymentData]
  );

  const maxTopProductOmzet = useMemo(() => (topProducts.length === 0 ? 1 : Math.max(...topProducts.map((p) => Number(p.total_omzet || 0)), 1)), [topProducts]);

  return {
    user, toko, loading, chartRange, setChartRange, chartMode, setChartMode, fetchDashboard,
    omzetHariIni, txHariIni, rataKeranjang, labaHariIni, pertumbuhanPersen, marginHariIni,
    totalProdukAktif, jmlStokMenipis, totalPiutang, jmlPelangganBon, topProducts, lowStocks, activeShifts,
    periodStats, paymentDistribution, lineChartData, lineChartOptions, barChartData, barChartOptions,
    doughnutData, doughnutOptions, maxTopProductOmzet,
  };
}
