"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatRupiah } from "@/lib/format";
import type { Pemasok, Produk } from "@/types/api";
import type { KulakanRowItem } from "./pembelian-types";
import { Package, Plus, Save, Scan, Trash2, TrendingDown, TrendingUp } from "lucide-react";

interface PembelianCreateModalProps {
  open: boolean;
  onClose: () => void;
  noFaktur: string;
  onChangeNoFaktur: (v: string) => void;
  pemasokId: string;
  onChangePemasokId: (v: string) => void;
  pemasokList: Pemasok[];
  tglBeli: string;
  onChangeTglBeli: (v: string) => void;
  metodeBayar: "tunai" | "transfer" | "tempo";
  onChangeMetodeBayar: (v: "tunai" | "transfer" | "tempo") => void;
  onChangeStatusBayar: (v: "lunas" | "belum_lunas") => void;
  jatuhTempo: string;
  onChangeJatuhTempo: (v: string) => void;
  items: KulakanRowItem[];
  onChangeItems: React.Dispatch<React.SetStateAction<KulakanRowItem[]>>;
  products: Produk[];
  submitting: boolean;
  onOpenSupplierModal: () => void;
  onOpenScannerModal: () => void;
  onAddNewItemRow: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** Modal pencatatan faktur kulakan baru dengan kalkulasi konversi satuan & batch FIFO */
export function PembelianCreateModal({
  open,
  onClose,
  noFaktur,
  onChangeNoFaktur,
  pemasokId,
  onChangePemasokId,
  pemasokList,
  tglBeli,
  onChangeTglBeli,
  metodeBayar,
  onChangeMetodeBayar,
  onChangeStatusBayar,
  jatuhTempo,
  onChangeJatuhTempo,
  items,
  onChangeItems,
  products,
  submitting,
  onOpenSupplierModal,
  onOpenScannerModal,
  onAddNewItemRow,
  onSubmit,
}: PembelianCreateModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Catat Faktur Kulakan & Barang Masuk (FIFO)" className="max-w-4xl max-h-[92vh] overflow-y-auto">
      <form onSubmit={onSubmit} className="space-y-4 text-xs font-body">
        <div className="p-3 bg-muted/30 border-2 border-fg/30 rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="font-bold block mb-1">Nomor Faktur / Nota *</label>
            <input
              required
              value={noFaktur}
              onChange={(e) => onChangeNoFaktur(e.target.value)}
              placeholder="KB-YYYYMMDD-XXXX"
              className="w-full px-3 py-2 border-2 border-border rounded font-mono font-bold bg-card"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold">Pemasok / Grosir</label>
              <button type="button" onClick={onOpenSupplierModal} className="text-accent underline font-bold text-[10px] cursor-pointer">
                + Supplier Baru
              </button>
            </div>
            <select value={pemasokId} onChange={(e) => onChangePemasokId(e.target.value)} className="w-full px-3 py-2 border-2 border-border rounded bg-card font-medium">
              <option value="">-- Grosir Umum / Tanpa Pemasok --</option>
              {pemasokList.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold block mb-1">Tanggal Kulakan</label>
            <input type="date" required value={tglBeli} onChange={(e) => onChangeTglBeli(e.target.value)} className="w-full px-3 py-2 border-2 border-border rounded bg-card font-medium" />
          </div>

          <div>
            <label className="font-bold block mb-1">Metode Pembayaran</label>
            <select
              value={metodeBayar}
              onChange={(e) => {
                const val = e.target.value as "tunai" | "transfer" | "tempo";
                onChangeMetodeBayar(val);
                onChangeStatusBayar(val === "tempo" ? "belum_lunas" : "lunas");
              }}
              className="w-full px-3 py-2 border-2 border-border rounded bg-card font-semibold"
            >
              <option value="tunai">Tunai (Potong Kas Toko)</option>
              <option value="transfer">Transfer Bank</option>
              <option value="tempo">Tempo (Utang Dagang)</option>
            </select>
          </div>

          {metodeBayar === "tempo" && (
            <div>
              <label className="font-bold block mb-1 text-amber-700">Tanggal Jatuh Tempo</label>
              <input type="date" value={jatuhTempo} onChange={(e) => onChangeJatuhTempo(e.target.value)} className="w-full px-3 py-2 border-2 border-amber-400 rounded bg-card font-medium" />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border pb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-accent" />
              <span className="font-heading font-black text-xs uppercase tracking-wide">Daftar Barang yang Dibeli</span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" icon={Scan} onClick={onOpenScannerModal} className="border-2 border-fg font-bold shadow-pop-soft">
                Scan Barcode Kemasan
              </Button>
              <Button type="button" size="sm" variant="outline" icon={Plus} onClick={onAddNewItemRow}>
                + Tambah Baris
              </Button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-border rounded-lg text-muted-fg">
              Belum ada barang di faktur ini. Klik &ldquo;+ Tambah Baris&rdquo; atau &ldquo;Scan Barcode Kemasan&rdquo;.
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((row, idx) => {
                const prod = products.find((p) => p.id === row.produk_id);
                const satuanListProd = prod
                  ? [
                      { nama: prod.satuan_dasar, konversi: 1 },
                      ...(prod.satuan_tambahan || prod.produk_satuan || []).map((s) => ({ nama: s.nama_satuan, konversi: Number(s.isi_konversi || 1) })),
                    ]
                  : [{ nama: "pcs", konversi: 1 }];
                const totalPcs = row.jumlah * (row.isi_konversi || 1);
                const subtotalBaris = row.jumlah * row.harga_beli_satuan;
                const hppBaru = row.isi_konversi > 0 ? Math.round(row.harga_beli_satuan / row.isi_konversi) : row.harga_beli_satuan;
                const hppLama = Number(prod?.harga_modal || 0);
                const diffHpp = hppBaru - hppLama;

                return (
                  <div key={row.id} className="p-3 rounded-lg border-2 border-border bg-card shadow-pop-soft space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-4">
                        <label className="font-bold block mb-1">Pilih Produk Toko *</label>
                        <select
                          value={row.produk_id}
                          onChange={(e) => {
                            const chosen = products.find((p) => p.id === e.target.value);
                            onChangeItems((prev) =>
                              prev.map((it, i) =>
                                i === idx
                                  ? { ...it, produk_id: e.target.value, nama_satuan: chosen?.satuan_dasar || "pcs", isi_konversi: 1, harga_beli_satuan: Number(chosen?.harga_modal || 0) }
                                  : it
                              )
                            );
                          }}
                          className="w-full px-2.5 py-1.5 border-2 border-border rounded bg-card font-semibold"
                        >
                          <option value="">-- Pilih Produk --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nama} ({p.barcode || "No Barcode"}) · Stok: {p.stok} {p.satuan_dasar}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-bold block mb-1">Satuan Beli</label>
                        <select
                          value={row.nama_satuan}
                          onChange={(e) => {
                            const matched = satuanListProd.find((s) => s.nama === e.target.value);
                            onChangeItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, nama_satuan: e.target.value, isi_konversi: matched ? matched.konversi : 1 } : it))
                            );
                          }}
                          className="w-full px-2 py-1.5 border-2 border-border rounded bg-card font-semibold"
                        >
                          {satuanListProd.map((s) => (
                            <option key={s.nama} value={s.nama}>{s.nama} ({s.konversi} {prod?.satuan_dasar || "pcs"})</option>
                          ))}
                          <option value="Dus">Dus / Karton</option>
                          <option value="Renceng">Renceng</option>
                          <option value="Pack">Pack</option>
                          <option value="Slop">Slop</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-bold block mb-1">Isi ({prod?.satuan_dasar || "pcs"}) / Satuan</label>
                        <input
                          type="number"
                          min={1}
                          value={row.isi_konversi || ""}
                          onChange={(e) => onChangeItems((prev) => prev.map((it, i) => (i === idx ? { ...it, isi_konversi: Number(e.target.value) } : it)))}
                          className="w-full px-2 py-1.5 border-2 border-border rounded bg-card font-mono font-bold"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="font-bold block mb-1">Qty Beli</label>
                        <input
                          type="number"
                          min={0.1}
                          step="any"
                          value={row.jumlah || ""}
                          onChange={(e) => onChangeItems((prev) => prev.map((it, i) => (i === idx ? { ...it, jumlah: Number(e.target.value) } : it)))}
                          className="w-full px-2 py-1.5 border-2 border-border rounded bg-card font-mono font-bold text-center"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-bold block mb-1">Harga Beli / Satuan (Rp)</label>
                        <input
                          type="number"
                          min={0}
                          value={row.harga_beli_satuan || ""}
                          onChange={(e) => onChangeItems((prev) => prev.map((it, i) => (i === idx ? { ...it, harga_beli_satuan: Number(e.target.value) } : it)))}
                          className="w-full px-2 py-1.5 border-2 border-border rounded bg-card font-mono font-bold text-accent"
                        />
                      </div>

                      <div className="sm:col-span-1 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          onClick={() => onChangeItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          title="Hapus baris barang"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-muted/50 border border-border/80 text-[11px]">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-fg font-medium">Fisik Masuk: <strong className="text-fg font-mono">+{totalPcs} {prod?.satuan_dasar || "pcs"}</strong></span>
                        <span className="text-muted-fg">·</span>
                        <span className="text-muted-fg font-medium">HPP Dasar Baru: <strong className="text-accent font-mono">{formatRupiah(hppBaru)}/{prod?.satuan_dasar || "pcs"}</strong></span>
                        {hppLama > 0 && diffHpp !== 0 && (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${diffHpp > 0 ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"}`}>
                            {diffHpp > 0 ? <><TrendingUp className="w-3 h-3" /> Naik +{formatRupiah(diffHpp)}</> : <><TrendingDown className="w-3 h-3" /> Turun {formatRupiah(Math.abs(diffHpp))}</>}
                          </span>
                        )}
                      </div>
                      <div className="font-bold">Subtotal: <span className="text-accent font-extrabold">{formatRupiah(subtotalBaris)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3.5 rounded-lg border-2 border-fg bg-muted/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-muted-fg block">Total Barang & Unit Fisik:</span>
            <strong className="text-fg text-sm">{items.length} Barang · +{items.reduce((sum, it) => sum + it.jumlah * (it.isi_konversi || 1), 0)} Pcs Fisik Masuk Rak</strong>
          </div>
          <div className="text-right">
            <span className="text-muted-fg block">Total Tagihan Faktur:</span>
            <strong className="text-accent text-lg font-extrabold font-heading">{formatRupiah(items.reduce((sum, it) => sum + it.jumlah * it.harga_beli_satuan, 0))}</strong>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" icon={Save} disabled={submitting}>{submitting ? "Menyimpan & Menambah Stok..." : "Simpan Faktur Kulakan"}</Button>
        </div>
      </form>
    </Modal>
  );
}
