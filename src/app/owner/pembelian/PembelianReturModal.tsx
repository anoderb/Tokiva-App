"use client";

import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatRupiah, formatTanggal } from "@/lib/format";
import type { Kulakan } from "@/types/api";
import type { ReturRowItem } from "./pembelian-types";
import { RotateCcw } from "lucide-react";

const RETUR_PRESETS = [
  "Kemasan rusak / bocor",
  "Mendekati / lewat kedaluwarsa",
  "Barang salah kirim / tidak sesuai",
  "Cacat produksi pabrik",
];

/** Modal proses retur barang rusak atau mendekati kedaluwarsa ke pemasok */
export function PembelianReturModal({
  returTarget,
  returItems,
  returKompensasi,
  returAlasan,
  returTgl,
  submittingRetur,
  onClose,
  onChangeReturItems,
  onChangeKompensasi,
  onChangeAlasan,
  onChangeTgl,
  onSubmit,
}: {
  returTarget: Kulakan | null;
  returItems: ReturRowItem[];
  returKompensasi: "potong_nota" | "refund_tunai" | "refund_transfer" | "tukar_barang";
  returAlasan: string;
  returTgl: string;
  submittingRetur: boolean;
  onClose: () => void;
  onChangeReturItems: React.Dispatch<React.SetStateAction<ReturRowItem[]>>;
  onChangeKompensasi: (v: "potong_nota" | "refund_tunai" | "refund_transfer" | "tukar_barang") => void;
  onChangeAlasan: (v: string) => void;
  onChangeTgl: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Modal open={Boolean(returTarget)} onClose={onClose} title={`Retur Barang ke Supplier: ${returTarget?.no_faktur || ""}`} className="max-w-2xl max-h-[90vh] overflow-y-auto">
      {returTarget && (
        <form onSubmit={onSubmit} className="space-y-4 text-xs font-body">
          <div className="p-3 bg-muted/50 rounded-lg border border-border grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <span className="text-muted-fg block">Pemasok / Supplier:</span>
              <strong className="text-fg">{returTarget.pemasok?.nama || "Grosir Umum"}</strong>
            </div>
            <div>
              <span className="text-muted-fg block">Tanggal Faktur:</span>
              <strong className="text-fg">{formatTanggal(returTarget.tgl_beli)}</strong>
            </div>
            <div>
              <span className="text-muted-fg block">Status Faktur:</span>
              <Badge variant={returTarget.lunas ? "green" : "yellow"}>{returTarget.lunas ? "Sudah Lunas" : "Tempo / Belum Lunas"}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-bold text-fg block">Pilih Barang &amp; Jumlah yang Diretur:</label>
            <div className="border-2 border-fg rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted border-b-2 border-fg text-[10px] uppercase font-heading text-muted-fg">
                  <tr>
                    <th className="p-2 text-left">Produk</th>
                    <th className="p-2 text-center">Dibeli</th>
                    <th className="p-2 text-right">Harga Beli</th>
                    <th className="p-2 text-center w-32">Qty Retur</th>
                    <th className="p-2 text-right">Subtotal Retur</th>
                  </tr>
                </thead>
                <tbody>
                  {returItems.map((it, idx) => (
                    <tr key={it.detail_id || idx} className="border-b border-border">
                      <td className="p-2 font-semibold">
                        {it.nama_produk}
                        <span className="block text-[10px] text-muted-fg font-mono font-normal">1 {it.nama_satuan} = {it.isi_konversi} pcs</span>
                      </td>
                      <td className="p-2 text-center font-mono">{it.jumlah_beli} {it.nama_satuan}</td>
                      <td className="p-2 text-right font-mono">{formatRupiah(it.harga_satuan)}</td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={it.jumlah_beli}
                          step="any"
                          value={it.jumlah_retur === 0 ? "" : it.jumlah_retur}
                          placeholder="0"
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(it.jumlah_beli, Number(e.target.value) || 0));
                            onChangeReturItems((prev) => prev.map((row, rIdx) => (rIdx === idx ? { ...row, jumlah_retur: val } : row)));
                          }}
                          className="w-20 px-2 py-1 border-2 border-border rounded text-center font-mono font-bold bg-card focus:border-accent outline-none"
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-rose-600">{formatRupiah(Math.round(it.jumlah_retur * it.harga_satuan))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-fg block mb-1">Metode Kompensasi Supplier *</label>
              <select
                value={returKompensasi}
                onChange={(e) => onChangeKompensasi(e.target.value as "potong_nota" | "refund_tunai" | "refund_transfer" | "tukar_barang")}
                className="w-full px-3 py-2 border-2 border-border rounded bg-card font-semibold"
              >
                <option value="potong_nota">Potong Tagihan / Kurangi Utang Nota</option>
                <option value="refund_tunai">Refund Uang Tunai (Masuk Kas Toko)</option>
                <option value="refund_transfer">Refund Transfer Bank (Masuk Kas Toko)</option>
                <option value="tukar_barang">Tukar Guling Barang Baru Sejenis (Stok Tetap)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-fg block mb-1">Tanggal Retur</label>
              <input type="date" value={returTgl} onChange={(e) => onChangeTgl(e.target.value)} className="w-full px-3 py-2 border-2 border-border rounded bg-card font-semibold" />
            </div>
          </div>

          <div>
            <label className="font-bold text-fg block mb-1">Alasan Retur Barang *</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {RETUR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChangeAlasan(preset)}
                  className={`px-2 py-1 rounded border text-[11px] font-semibold cursor-pointer transition-colors ${
                    returAlasan === preset ? "bg-accent text-white border-fg" : "bg-muted border-border text-muted-fg hover:text-fg"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              value={returAlasan}
              onChange={(e) => onChangeAlasan(e.target.value)}
              placeholder="Tulis alasan retur barang ke pemasok..."
              className="w-full px-3 py-2 border-2 border-border rounded bg-card outline-none focus:border-accent"
            />
          </div>

          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-400 flex items-center justify-between">
            <div>
              <span className="font-bold text-rose-900 dark:text-rose-200 block">Total Nilai Retur Supplier:</span>
              <span className="text-[11px] text-muted-fg">
                {returKompensasi === "tukar_barang"
                  ? "Stok fisik tetap (barang rusak langsung ditukar barang baru sejenis)."
                  : returKompensasi === "potong_nota"
                  ? "Stok produk dikurangi & nilai tagihan faktur otomatis dipotong."
                  : "Stok produk dikurangi & dana refund dicatat masuk ke Arus Kas."}
              </span>
            </div>
            <strong className="font-heading text-base font-extrabold text-rose-600 font-mono">
              {formatRupiah(returItems.reduce((sum, it) => sum + Math.round(it.jumlah_retur * it.harga_satuan), 0))}
            </strong>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Batal</Button>
            <Button type="submit" size="sm" disabled={submittingRetur} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              {submittingRetur ? "Memproses Retur..." : "Konfirmasi Retur ke Supplier"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
