"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardOwnerData } from "@/lib/services/laporan.service";
import { formatNumber, formatRupiah, formatRupiahSingkat, formatWaktu } from "@/lib/format";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Clock,
  ReceiptText,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

/** Grid 5 kartu KPI utama & banner shift kasir aktif di dashboard owner */
export function DashboardKpiGrid({
  omzetHariIni,
  txHariIni,
  rataKeranjang,
  labaHariIni,
  pertumbuhanPersen,
  marginHariIni,
  totalProdukAktif,
  jmlStokMenipis,
  totalPiutang,
  jmlPelangganBon,
  activeShifts,
}: {
  omzetHariIni: number;
  txHariIni: number;
  rataKeranjang: number;
  labaHariIni: number;
  pertumbuhanPersen: number;
  marginHariIni: number;
  totalProdukAktif: number;
  jmlStokMenipis: number;
  totalPiutang: number;
  jmlPelangganBon: number;
  activeShifts: DashboardOwnerData["shift_aktif"];
}) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3.5 mb-5">
        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="w-9 h-9 rounded-sm border-2 border-fg bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
              <ShoppingBag className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
            </div>
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border border-fg ${
                pertumbuhanPersen >= 0 ? "bg-lime-100 text-lime-800" : "bg-red-100 text-red-800"
              }`}
              title="Perbandingan terhadap omzet kemarin"
            >
              {pertumbuhanPersen >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {pertumbuhanPersen > 0 ? `+${pertumbuhanPersen}%` : `${pertumbuhanPersen}%`}
            </span>
          </div>
          <div>
            <div className="font-heading text-lg sm:text-xl font-bold truncate">{formatRupiahSingkat(omzetHariIni)}</div>
            <div className="text-[11px] font-semibold text-fg">Omzet Hari Ini</div>
            <div className="text-[10px] text-muted-fg mt-0.5 truncate">{formatRupiah(omzetHariIni)}</div>
          </div>
        </div>

        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="w-9 h-9 rounded-sm border-2 border-fg bg-amber-100 dark:bg-amber-950/70 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
              <TrendingUp className="w-4 h-4 text-amber-700 dark:text-amber-300" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-fg bg-amber-50 text-amber-800">
              Margin {marginHariIni}%
            </span>
          </div>
          <div>
            <div className="font-heading text-lg sm:text-xl font-bold truncate">{formatRupiahSingkat(labaHariIni)}</div>
            <div className="text-[11px] font-semibold text-fg">Estimasi Laba Kotor</div>
            <div className="text-[10px] text-muted-fg mt-0.5 truncate">{formatRupiah(labaHariIni)} hari ini</div>
          </div>
        </div>

        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="w-9 h-9 rounded-sm border-2 border-fg bg-sky-100 dark:bg-sky-950/70 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
              <ReceiptText className="w-4 h-4 text-sky-700 dark:text-sky-300" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-fg bg-sky-50 text-sky-800">Hari Ini</span>
          </div>
          <div>
            <div className="font-heading text-lg sm:text-xl font-bold">{formatNumber(txHariIni)} Nota</div>
            <div className="text-[11px] font-semibold text-fg">Transaksi Selesai</div>
            <div className="text-[10px] text-muted-fg mt-0.5 truncate">Rata-rata {formatRupiahSingkat(rataKeranjang)} / nota</div>
          </div>
        </div>

        <Link
          href="/owner/persediaan"
          className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="w-9 h-9 rounded-sm border-2 border-fg bg-violet-100 dark:bg-violet-950/70 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
              <Boxes className="w-4 h-4 text-violet-700 dark:text-violet-300" />
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border border-fg ${
                jmlStokMenipis > 0 ? "bg-amber-100 text-amber-900" : "bg-lime-100 text-lime-800"
              }`}
            >
              {jmlStokMenipis > 0 ? `${jmlStokMenipis} Menipis` : "Stok Aman"}
            </span>
          </div>
          <div>
            <div className="font-heading text-lg sm:text-xl font-bold">{formatNumber(totalProdukAktif)} Item</div>
            <div className="text-[11px] font-semibold text-fg">Produk Aktif</div>
            <div className="text-[10px] text-muted-fg mt-0.5 truncate">
              {jmlStokMenipis > 0 ? `${jmlStokMenipis} produk perlu restock` : "Seluruh stok di atas minimum"}
            </div>
          </div>
        </Link>

        <Link
          href="/owner/pelanggan"
          className="col-span-2 md:col-span-1 bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="w-9 h-9 rounded-sm border-2 border-fg bg-rose-100 dark:bg-rose-950/70 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
              <BookOpen className="w-4 h-4 text-rose-700 dark:text-rose-300" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-fg bg-rose-50 text-rose-800">{jmlPelangganBon} Warga</span>
          </div>
          <div>
            <div className="font-heading text-lg sm:text-xl font-bold truncate">{formatRupiahSingkat(totalPiutang)}</div>
            <div className="text-[11px] font-semibold text-fg">Piutang (Kas Bon)</div>
            <div className="text-[10px] text-muted-fg mt-0.5 truncate">
              {jmlPelangganBon > 0 ? `${formatRupiah(totalPiutang)} belum lunas` : "Tidak ada kas bon tertunggak"}
            </div>
          </div>
        </Link>
      </div>

      {activeShifts.length > 0 && (
        <div className="bg-lime-50 dark:bg-emerald-950/30 border-2 border-fg rounded-xl p-4 shadow-pop-soft mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent text-white border-2 border-fg flex items-center justify-center shadow-[2px_2px_0px_#1E293B]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="green">Shift Kasir Aktif</Badge>
                <span className="text-xs font-bold">{activeShifts[0].kasir?.nama_lengkap || "Kasir Bertugas"}</span>
                {activeShifts.length > 1 && <span className="text-[11px] text-muted-fg">(+{activeShifts.length - 1} shift lain)</span>}
              </div>
              <div className="text-xs text-muted-fg mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>Dibuka {formatWaktu(activeShifts[0].waktu_buka)}</span>
                <span>·</span>
                <span>Modal Awal {formatRupiah(activeShifts[0].modal_awal)}</span>
                <span>·</span>
                <span>Tunai Masuk <strong className="text-accent">{formatRupiah(activeShifts[0].total_penjualan_tunai)}</strong></span>
                <span>·</span>
                <span>Non-Tunai <strong className="text-sky-600 dark:text-sky-400">{formatRupiah(activeShifts[0].total_penjualan_non_tunai)}</strong></span>
              </div>
            </div>
          </div>
          <Link href="/owner/shift-kasir">
            <Button size="sm" variant="outline">
              Detail Shift <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      )}
    </>
  );
}
