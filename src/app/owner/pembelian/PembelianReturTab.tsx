"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { formatRupiah, formatTanggal, formatWaktu } from "@/lib/format";
import { RefreshCw, Search } from "lucide-react";

/** Tab Riwayat Retur Barang ke Pemasok (Outbound Return) */
export function PembelianReturTab({
  returList,
  loadingRetur,
  returSearch,
  onChangeSearch,
  onRefresh,
}: {
  returList: any[];
  loadingRetur: boolean;
  returSearch: string;
  onChangeSearch: (q: string) => void;
  onRefresh: () => void;
}) {
  return (
    <SectionCard
      title="Riwayat Retur Barang ke Pemasok (Outbound Return)"
      desc="Daftar pengembalian barang rusak, mendekati kedaluwarsa, atau salah kirim kepada supplier beserta kompensasinya."
      customAction={
        <Button size="sm" variant="outline" icon={RefreshCw} onClick={onRefresh}>
          Segarkan
        </Button>
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg pointer-events-none" />
          <input
            value={returSearch}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="Cari no. faktur atau alasan retur..."
            className="w-full pl-9 pr-8 py-2 border-2 border-border rounded-full text-xs outline-none focus:border-accent bg-card font-medium"
          />
          {returSearch && (
            <button
              type="button"
              onClick={() => onChangeSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-fg hover:text-fg text-xs font-bold cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border-2 border-fg rounded-md">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
              <th className="p-2.5">Waktu Retur</th>
              <th className="p-2.5">No. Faktur Asal</th>
              <th className="p-2.5">Pemasok</th>
              <th className="p-2.5">Produk Diretur</th>
              <th className="p-2.5">Jumlah Retur</th>
              <th className="p-2.5">Nilai Retur</th>
              <th className="p-2.5">Kompensasi</th>
              <th className="p-2.5">Alasan</th>
            </tr>
          </thead>
          <tbody>
            {loadingRetur ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-fg">Memuat riwayat retur supplier...</td>
              </tr>
            ) : returList.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-fg">
                  Belum ada riwayat retur barang ke pemasok. Untuk meretur barang, klik tombol <strong>Retur</strong> pada baris faktur di tab Daftar Faktur Kulakan.
                </td>
              </tr>
            ) : (
              returList.map((r) => {
                const kompLabel =
                  r.kompensasi === "potong_nota"
                    ? "Potong Tagihan"
                    : r.kompensasi === "refund_tunai"
                    ? "Refund Tunai"
                    : r.kompensasi === "refund_transfer"
                    ? "Refund Transfer"
                    : "Tukar Barang";
                const kompVariant =
                  r.kompensasi === "tukar_barang" ? "blue" : r.kompensasi === "potong_nota" ? "yellow" : "green";

                return (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/40">
                    <td className="p-2.5 whitespace-nowrap">{formatTanggal(r.waktu)} · {formatWaktu(r.waktu)}</td>
                    <td className="p-2.5 font-mono font-bold">{r.no_faktur}</td>
                    <td className="p-2.5 font-semibold">{r.nama_pemasok}</td>
                    <td className="p-2.5 font-bold text-fg">{r.nama_produk}</td>
                    <td className="p-2.5 font-mono font-semibold text-rose-600">{r.qty_label}</td>
                    <td className="p-2.5 font-mono font-bold text-accent">{formatRupiah(Number(r.nilai_retur || 0))}</td>
                    <td className="p-2.5"><Badge variant={kompVariant as any}>{kompLabel}</Badge></td>
                    <td className="p-2.5 text-muted-fg max-w-[220px] truncate" title={r.alasan}>{r.alasan}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
