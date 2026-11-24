"use client";

import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatRupiah, formatTanggal } from "@/lib/format";
import type { Kategori, Kulakan } from "@/types/api";
import type { NewSupplierFormState, QuickProductFormState } from "./pembelian-types";
import { HandCoins, RotateCcw, Save, Scan } from "lucide-react";

/** Kumpulan modal pendukung pembelian: Quick Add Produk, Pemasok Baru, Detail Faktur & Bayar Utang */
export function PembelianSupportModals({
  quickAddModal,
  onCloseQuickAdd,
  quickAddForm,
  onChangeQuickAddForm,
  categories,
  submittingQuickProduct,
  onOpenQuickAddScanner,
  onSubmitQuickProduct,
  supplierModal,
  onCloseSupplierModal,
  newSupplier,
  onChangeNewSupplier,
  submitting,
  onSubmitSupplier,
  selectedKulakan,
  onCloseDetail,
  onOpenPayDebt,
  onOpenReturFromDetail,
  payDebtTarget,
  onClosePayDebt,
  payDebtNominal,
  onChangePayDebtNominal,
  payDebtMetode,
  onChangePayDebtMetode,
  payDebtTgl,
  onChangePayDebtTgl,
  payDebtCatatan,
  onChangePayDebtCatatan,
  submittingPayDebt,
  onSubmitPayDebt,
}: {
  quickAddModal: boolean;
  onCloseQuickAdd: () => void;
  quickAddForm: QuickProductFormState;
  onChangeQuickAddForm: React.Dispatch<React.SetStateAction<QuickProductFormState>>;
  categories: Kategori[];
  submittingQuickProduct: boolean;
  onOpenQuickAddScanner: () => void;
  onSubmitQuickProduct: (e: React.FormEvent) => void;
  supplierModal: boolean;
  onCloseSupplierModal: () => void;
  newSupplier: NewSupplierFormState;
  onChangeNewSupplier: React.Dispatch<React.SetStateAction<NewSupplierFormState>>;
  submitting: boolean;
  onSubmitSupplier: (e: React.FormEvent) => void;
  selectedKulakan: Kulakan | null;
  onCloseDetail: () => void;
  onOpenPayDebt: (k: Kulakan) => void;
  onOpenReturFromDetail: (k: Kulakan) => void;
  payDebtTarget: Kulakan | null;
  onClosePayDebt: () => void;
  payDebtNominal: number;
  onChangePayDebtNominal: (v: number) => void;
  payDebtMetode: "transfer" | "tunai";
  onChangePayDebtMetode: (v: "transfer" | "tunai") => void;
  payDebtTgl: string;
  onChangePayDebtTgl: (v: string) => void;
  payDebtCatatan: string;
  onChangePayDebtCatatan: (v: string) => void;
  submittingPayDebt: boolean;
  onSubmitPayDebt: (e: React.FormEvent) => void;
}) {
  const maxDebtTarget = payDebtTarget
    ? payDebtTarget.sisa_utang !== undefined
      ? payDebtTarget.sisa_utang
      : Number(payDebtTarget.total_beli || (payDebtTarget as any).total_biaya || 0)
    : 0;

  return (
    <>
      <Modal open={quickAddModal} onClose={onCloseQuickAdd} title="Tambah Produk Baru ke Toko & Faktur" className="max-w-md">
        <form onSubmit={onSubmitQuickProduct} className="space-y-3 text-xs">
          <p className="text-muted-fg text-[11px]">Barang ini belum terdaftar di toko. Lengkapi data dasarnya agar langsung tercatat di katalog dan baris kulakan.</p>
          <div>
            <label className="font-bold block mb-1">Nama Produk *</label>
            <input required value={quickAddForm.nama} onChange={(e) => onChangeQuickAddForm((p) => ({ ...p, nama: e.target.value }))} placeholder="Contoh: Aqua Botol 600ml" className="w-full px-3 py-2 border-2 border-border rounded bg-card font-semibold" />
          </div>
          <div>
            <label className="font-bold block mb-1">Barcode EAN-13 Eceran</label>
            <div className="flex gap-1.5">
              <input value={quickAddForm.barcode} onChange={(e) => onChangeQuickAddForm((p) => ({ ...p, barcode: e.target.value }))} placeholder="899..." className="flex-1 px-3 py-2 border-2 border-border rounded font-mono bg-card" />
              <Button type="button" size="sm" variant="outline" icon={Scan} onClick={onOpenQuickAddScanner} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold block mb-1">Kategori</label>
              <select value={quickAddForm.kategori_id} onChange={(e) => onChangeQuickAddForm((p) => ({ ...p, kategori_id: e.target.value }))} className="w-full px-2.5 py-1.5 border-2 border-border rounded bg-card font-medium">
                <option value="">-- Umum --</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="font-bold block mb-1">Satuan Dasar *</label>
              <input required value={quickAddForm.satuan_dasar} onChange={(e) => onChangeQuickAddForm((p) => ({ ...p, satuan_dasar: e.target.value }))} placeholder="pcs / bungkus / botol" className="w-full px-2.5 py-1.5 border-2 border-border rounded bg-card font-semibold" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold block mb-1">Rencana Harga Jual (Rp) *</label>
              <input type="number" required min={1} value={quickAddForm.harga_jual || ""} onChange={(e) => onChangeQuickAddForm((p) => ({ ...p, harga_jual: Number(e.target.value) }))} placeholder="Harga Kasir" className="w-full px-2.5 py-1.5 border-2 border-border rounded bg-card font-bold text-accent font-mono" />
            </div>
            <div>
              <label className="font-bold block mb-1">Batas Minimum Stok</label>
              <input type="number" min={1} value={quickAddForm.stok_min || ""} onChange={(e) => onChangeQuickAddForm((p) => ({ ...p, stok_min: Number(e.target.value) }))} className="w-full px-2.5 py-1.5 border-2 border-border rounded bg-card font-mono" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onCloseQuickAdd}>Batal</Button>
            <Button type="submit" size="sm" disabled={submittingQuickProduct}>{submittingQuickProduct ? "Menyimpan..." : "Simpan & Masukkan ke Kulakan"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={supplierModal} onClose={onCloseSupplierModal} title="Tambah Pemasok / Distributor Baru" className="max-w-md">
        <form onSubmit={onSubmitSupplier} className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Nama Pemasok / Perusahaan *</label>
            <input required value={newSupplier.nama} onChange={(e) => onChangeNewSupplier((p) => ({ ...p, nama: e.target.value }))} placeholder="Contoh: PT Indomarco / Agen Sembako Barokah" className="w-full px-3 py-2 border-2 border-border rounded bg-card font-semibold" />
          </div>
          <div>
            <label className="font-bold block mb-1">Nama Kontak / Salesman</label>
            <input value={newSupplier.kontak_person} onChange={(e) => onChangeNewSupplier((p) => ({ ...p, kontak_person: e.target.value }))} placeholder="Contoh: Pak Budi" className="w-full px-3 py-2 border-2 border-border rounded bg-card" />
          </div>
          <div>
            <label className="font-bold block mb-1">Telepon / No WhatsApp</label>
            <input value={newSupplier.telepon} onChange={(e) => onChangeNewSupplier((p) => ({ ...p, telepon: e.target.value }))} placeholder="08123456789" className="w-full px-3 py-2 border-2 border-border rounded bg-card font-mono" />
          </div>
          <div>
            <label className="font-bold block mb-1">Alamat Gudang / Depo</label>
            <textarea rows={2} value={newSupplier.alamat} onChange={(e) => onChangeNewSupplier((p) => ({ ...p, alamat: e.target.value }))} placeholder="Jl. Raya Pasar Induk No. 12" className="w-full px-3 py-2 border-2 border-border rounded bg-card" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onCloseSupplierModal}>Batal</Button>
            <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan Pemasok"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(selectedKulakan)} onClose={onCloseDetail} title={`Rincian Faktur: ${selectedKulakan?.no_faktur || (selectedKulakan as any)?.nomor_faktur || ""}`} className="max-w-2xl">
        {selectedKulakan && (
          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg border border-border grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div><span className="text-muted-fg block">Tanggal Belanja:</span><strong className="text-fg">{formatTanggal(selectedKulakan.tgl_beli || (selectedKulakan as any).tanggal_kulakan)}</strong></div>
              <div><span className="text-muted-fg block">Pemasok / Distributor:</span><strong className="text-fg">{selectedKulakan.pemasok?.nama || "Grosir Umum"}</strong></div>
              <div><span className="text-muted-fg block">Metode Pembayaran:</span><strong className="text-fg uppercase">{selectedKulakan.jenis_bayar || (selectedKulakan as any).metode_bayar || "Tunai"}</strong></div>
              <div>
                <span className="text-muted-fg block">Status Tagihan:</span>
                <Badge variant={selectedKulakan.lunas || (selectedKulakan as any).status_bayar === "lunas" ? "green" : "yellow"}>
                  {selectedKulakan.lunas || (selectedKulakan as any).status_bayar === "lunas" ? "Lunas" : "Tempo / Belum Lunas"}
                </Badge>
              </div>
            </div>

            <div>
              <span className="font-bold block mb-1">Rincian Barang & Perhitungan Masuk:</span>
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted text-[10px] uppercase font-heading text-muted-fg border-b border-border">
                    <tr><th className="p-2 text-left">Produk</th><th className="p-2 text-center">Satuan Beli</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Harga Satuan</th><th className="p-2 text-right">Subtotal</th></tr>
                  </thead>
                  <tbody>
                    {((selectedKulakan as any).items || []).map((it: any, i: number) => (
                      <tr key={i} className="border-b border-border/60">
                        <td className="p-2 font-semibold">{it.produk?.nama || "Barang"}<span className="block text-[10px] text-muted-fg font-mono font-normal">+{Number(it.jumlah) * Number(it.isi_konversi || 1)} {it.produk?.satuan_dasar || "pcs"} fisik masuk rak</span></td>
                        <td className="p-2 text-center">{it.nama_satuan} (isi {it.isi_konversi})</td>
                        <td className="p-2 text-center font-bold">{it.jumlah}</td>
                        <td className="p-2 text-right font-mono">{formatRupiah(it.harga_satuan)}</td>
                        <td className="p-2 text-right font-bold text-accent font-mono">{formatRupiah(it.subtotal || it.jumlah * it.harga_satuan)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-muted border border-border">
              <span className="font-bold">Total Pembelian Bersih:</span>
              <strong className="text-accent text-base font-extrabold font-heading">{formatRupiah(Number(selectedKulakan.total_beli || (selectedKulakan as any).total_biaya || 0))}</strong>
            </div>

            {Array.isArray((selectedKulakan as any).riwayat_retur) && (selectedKulakan as any).riwayat_retur.length > 0 && (
              <div className="p-3 rounded-lg border-2 border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold text-xs"><RotateCcw className="w-3.5 h-3.5" /><span>Riwayat Retur Barang pada Faktur Ini:</span></div>
                <div className="space-y-1.5">
                  {(selectedKulakan as any).riwayat_retur.map((ret: any) => (
                    <div key={ret.id} className="p-2 rounded bg-card border border-border flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div>
                        <span className="font-bold text-fg">{ret.nama_produk}</span> <span className="text-rose-600 font-mono font-bold">({ret.qty_label})</span>
                        <div className="text-[10px] text-muted-fg">Alasan: {ret.alasan} · {formatTanggal(ret.waktu)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-accent">{formatRupiah(Number(ret.nilai_retur || 0))}</div>
                        <span className="text-[10px] uppercase font-semibold text-muted-fg">{String(ret.kompensasi || "").replace("_", " ")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!selectedKulakan.lunas && (selectedKulakan as any).status_bayar !== "lunas" && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-amber-800 dark:text-amber-200 block font-medium">Sisa Utang Faktur:</span>
                  <strong className="text-base text-red-600 font-bold font-mono">{formatRupiah(selectedKulakan.sisa_utang !== undefined ? selectedKulakan.sisa_utang : Number(selectedKulakan.total_beli || (selectedKulakan as any).total_biaya || 0))}</strong>
                  {selectedKulakan.jatuh_tempo && <div className="text-[10px] text-muted-fg font-mono mt-0.5">Jatuh Tempo: {formatTanggal(selectedKulakan.jatuh_tempo)}</div>}
                </div>
                <Button size="sm" onClick={() => onOpenPayDebt(selectedKulakan)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  <HandCoins className="w-4 h-4 mr-1.5" />
                  Bayar Utang Faktur Ini
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button size="sm" variant="outline" icon={RotateCcw} onClick={() => onOpenReturFromDetail(selectedKulakan)} className="border-rose-400 text-rose-600 hover:bg-rose-50">
                Retur Barang dari Faktur Ini
              </Button>
              <Button size="sm" variant="outline" onClick={onCloseDetail}>Tutup</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(payDebtTarget)} onClose={onClosePayDebt} title={`Pembayaran Utang Faktur: ${payDebtTarget?.no_faktur || ""}`} className="max-w-md">
        {payDebtTarget && (
          <form onSubmit={onSubmitPayDebt} className="space-y-3.5 text-xs">
            <div className="p-3 bg-muted/60 rounded-lg border border-border space-y-1">
              <div className="flex justify-between"><span className="text-muted-fg">Pemasok / Supplier:</span><strong className="text-fg">{payDebtTarget.pemasok?.nama || "Grosir Umum"}</strong></div>
              <div className="flex justify-between"><span className="text-muted-fg">Total Belanja Faktur:</span><span className="font-mono">{formatRupiah(Number(payDebtTarget.total_beli || (payDebtTarget as any).total_biaya || 0))}</span></div>
              <div className="flex justify-between border-t border-border pt-1"><span className="font-bold text-muted-fg">Sisa Utang Saat Ini:</span><strong className="font-mono text-sm text-red-600">{formatRupiah(maxDebtTarget)}</strong></div>
            </div>
            <div>
              <label className="font-bold text-fg block mb-1">Nominal Pembayaran (Rp) *</label>
              <input type="number" required min={1} max={maxDebtTarget} value={payDebtNominal === 0 ? "" : payDebtNominal} onChange={(e) => onChangePayDebtNominal(Number(e.target.value))} className="w-full px-3 py-2 border-2 border-border rounded font-bold text-base bg-card outline-none focus:border-accent" />
              <button type="button" onClick={() => onChangePayDebtNominal(maxDebtTarget)} className="mt-1 text-[11px] text-accent hover:underline font-bold cursor-pointer">
                Bayar Lunas Penuh ({formatRupiah(maxDebtTarget)})
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-fg block mb-1">Metode Bayar</label>
                <select value={payDebtMetode} onChange={(e) => onChangePayDebtMetode(e.target.value as "transfer" | "tunai")} className="w-full px-2.5 py-1.5 border-2 border-border rounded bg-card font-semibold">
                  <option value="transfer">Transfer Bank</option>
                  <option value="tunai">Uang Tunai Kas</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-fg block mb-1">Tanggal Bayar</label>
                <input type="date" value={payDebtTgl} onChange={(e) => onChangePayDebtTgl(e.target.value)} className="w-full px-2.5 py-1.5 border-2 border-border rounded bg-card font-semibold" />
              </div>
            </div>
            <div>
              <label className="font-bold text-fg block mb-1">Catatan / Bukti Bayar (Opsional)</label>
              <input type="text" value={payDebtCatatan} onChange={(e) => onChangePayDebtCatatan(e.target.value)} placeholder="Contoh: Transfer BCA via M-Banking / No. Ref 1234" className="w-full px-2.5 py-1.5 border-2 border-border rounded bg-card" />
            </div>
            <div className="p-2.5 rounded bg-muted border border-border flex justify-between items-center text-xs">
              <span>Sisa Utang Setelah Bayar:</span>
              <strong className="font-mono text-sm text-fg">{formatRupiah(Math.max(0, maxDebtTarget - payDebtNominal))}</strong>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={onClosePayDebt}>Batal</Button>
              <Button type="submit" size="sm" disabled={submittingPayDebt} className="bg-accent text-accent-fg font-bold">
                <Save className="w-3.5 h-3.5 mr-1" />
                {submittingPayDebt ? "Menyimpan..." : "Konfirmasi Pembayaran"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
