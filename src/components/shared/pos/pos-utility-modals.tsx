"use client";

import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { Pelanggan } from "@/types/api";
import type { PendingCartOrder } from "./pos-types";
import {
  Banknote,
  Check,
  Clock,
  PauseCircle,
  PlayCircle,
  Plus,
  QrCode,
  Trash2,
  UserPlus,
} from "lucide-react";

/** Kumpulan modal pendukung POS: Buka Shift, Pelanggan Cepat, Bayar Bon, Tunda & Antrean Pending */
export function PosUtilityModals({
  isShiftModalOpen,
  openShiftCashInput,
  onCloseShiftModal,
  onChangeOpenShiftCash,
  onOpenShiftNow,
  isAddCustomerModalOpen,
  newCustNama,
  newCustTelepon,
  newCustAlamat,
  newCustBatasBon,
  submittingCust,
  onCloseAddCustomer,
  onChangeNewCustNama,
  onChangeNewCustTelepon,
  onChangeNewCustAlamat,
  onChangeNewCustBatasBon,
  onSaveQuickCustomer,
  isPayDebtModalOpen,
  selectedCustomer,
  debtPayAmount,
  debtPayMethod,
  submittingDebtPay,
  onClosePayDebt,
  onChangeDebtPayAmount,
  onChangeDebtPayMethod,
  onSubmitPayDebt,
  isHoldCartModalOpen,
  cartLength,
  cartTotalQty,
  cartSubtotal,
  holdNoteInput,
  onCloseHoldModal,
  onChangeHoldNote,
  onConfirmHoldCart,
  isPendingListModalOpen,
  pendingOrders,
  onClosePendingList,
  onDeletePendingOrder,
  onResumePendingOrder,
}: {
  isShiftModalOpen: boolean;
  openShiftCashInput: number;
  onCloseShiftModal: () => void;
  onChangeOpenShiftCash: (val: number) => void;
  onOpenShiftNow: () => void;
  isAddCustomerModalOpen: boolean;
  newCustNama: string;
  newCustTelepon: string;
  newCustAlamat: string;
  newCustBatasBon: number;
  submittingCust: boolean;
  onCloseAddCustomer: () => void;
  onChangeNewCustNama: (val: string) => void;
  onChangeNewCustTelepon: (val: string) => void;
  onChangeNewCustAlamat: (val: string) => void;
  onChangeNewCustBatasBon: (val: number) => void;
  onSaveQuickCustomer: (e: React.FormEvent) => void;
  isPayDebtModalOpen: boolean;
  selectedCustomer: Pelanggan | null;
  debtPayAmount: number;
  debtPayMethod: "tunai" | "qris";
  submittingDebtPay: boolean;
  onClosePayDebt: () => void;
  onChangeDebtPayAmount: (val: number) => void;
  onChangeDebtPayMethod: (m: "tunai" | "qris") => void;
  onSubmitPayDebt: (e: React.FormEvent) => void;
  isHoldCartModalOpen: boolean;
  cartLength: number;
  cartTotalQty: number;
  cartSubtotal: number;
  holdNoteInput: string;
  onCloseHoldModal: () => void;
  onChangeHoldNote: (val: string) => void;
  onConfirmHoldCart: (e?: React.FormEvent) => void;
  isPendingListModalOpen: boolean;
  pendingOrders: PendingCartOrder[];
  onClosePendingList: () => void;
  onDeletePendingOrder: (id: string, label: string) => void;
  onResumePendingOrder: (order: PendingCartOrder, strategy: "swap" | "merge") => void;
}) {
  return (
    <>
      <Modal open={isShiftModalOpen} onClose={onCloseShiftModal} title="Buka Shift Kasir Baru" className="max-w-sm">
        <div className="flex flex-col gap-3 text-xs">
          <p className="text-muted-fg">Masukkan nominal uang modal awal di laci kasir untuk memulai shift.</p>
          <div>
            <label className="font-bold text-fg block mb-1">Modal Awal Laci (Rp):</label>
            <input
              type="number"
              min={0}
              value={openShiftCashInput}
              onChange={(e) => {
                const val = e.target.value === "" ? 0 : Number(e.target.value);
                onChangeOpenShiftCash(Number.isFinite(val) ? Math.max(0, val) : 0);
              }}
              className="w-full px-3 py-2 border-2 border-border rounded font-bold text-sm bg-card"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onCloseShiftModal}>
              Batal
            </Button>
            <Button size="sm" onClick={onOpenShiftNow}>
              Buka Shift
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={isAddCustomerModalOpen} onClose={onCloseAddCustomer} title="Daftarkan Pelanggan Baru (Cepat)" className="max-w-md">
        <form onSubmit={onSaveQuickCustomer} className="flex flex-col gap-3 text-xs">
          <p className="text-muted-fg text-[11px]">
            Daftarkan pembeli menjadi pelanggan tetap toko agar dapat mencatat transaksi kas bon atau riwayat belanja.
          </p>
          <div>
            <label className="font-bold text-fg block mb-1">Nama Lengkap Pelanggan *</label>
            <input
              type="text"
              required
              value={newCustNama}
              onChange={(e) => onChangeNewCustNama(e.target.value)}
              placeholder="Contoh: Pak Budi Santoso"
              className="w-full px-3 py-2 border-2 border-border rounded font-bold text-sm bg-card outline-none focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-fg block mb-1">No. WhatsApp / HP</label>
              <input
                type="text"
                value={newCustTelepon}
                onChange={(e) => onChangeNewCustTelepon(e.target.value)}
                placeholder="0812xxxx"
                className="w-full px-3 py-2 border-2 border-border rounded text-xs bg-card outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="font-bold text-fg block mb-1">Plafon Limit Kas Bon (Rp)</label>
              <input
                type="number"
                min={0}
                value={newCustBatasBon}
                onChange={(e) => {
                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                  onChangeNewCustBatasBon(Number.isFinite(val) ? Math.max(0, val) : 0);
                }}
                className="w-full px-3 py-2 border-2 border-border rounded text-xs font-bold bg-card outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="font-bold text-fg block mb-1">Alamat / RT-RW (Opsional)</label>
            <input
              type="text"
              value={newCustAlamat}
              onChange={(e) => onChangeNewCustAlamat(e.target.value)}
              placeholder="Contoh: RT 02 / RW 01 Rumah Biru"
              className="w-full px-3 py-2 border-2 border-border rounded text-xs bg-card outline-none focus:border-accent"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border mt-1">
            <Button type="button" variant="outline" size="sm" onClick={onCloseAddCustomer}>
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={submittingCust} className="bg-accent text-accent-fg font-bold">
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              {submittingCust ? "Mendaftarkan..." : "Simpan & Pilih"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={isPayDebtModalOpen} onClose={onClosePayDebt} title={`Pelunasan Kas Bon: ${selectedCustomer?.nama || ""}`} className="max-w-md">
        {selectedCustomer && (
          <form onSubmit={onSubmitPayDebt} className="flex flex-col gap-3 text-xs">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 space-y-1">
              <div className="flex items-center justify-between text-amber-900 dark:text-amber-200">
                <span>Total Tunggakan Bon:</span>
                <strong className="text-base font-mono text-red-600">
                  Rp{Number(selectedCustomer.total_piutang || 0).toLocaleString("id-ID")}
                </strong>
              </div>
              <p className="text-[10px] text-muted-fg leading-tight">
                Pembayaran menggunakan alokasi FIFO (nota bon tertua dilunasi terlebih dahulu). Uang tunai masuk langsung dihitung ke shift kasir aktif.
              </p>
            </div>
            <div>
              <label className="font-bold text-fg block mb-1">Nominal Pembayaran (Rp) *</label>
              <input
                type="number"
                required
                min={1}
                max={Number(selectedCustomer.total_piutang || 0)}
                value={debtPayAmount === 0 ? "" : debtPayAmount}
                onChange={(e) => {
                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                  onChangeDebtPayAmount(Number.isFinite(val) ? Math.max(0, val) : 0);
                }}
                className="w-full px-3 py-2 border-2 border-border rounded font-bold text-base bg-card outline-none focus:border-accent"
              />
              <div className="flex gap-1.5 flex-wrap mt-1.5">
                {[
                  Number(selectedCustomer.total_piutang || 0),
                  ...[10000, 20000, 50000, 100000].filter((amt) => amt <= Number(selectedCustomer.total_piutang || 0)),
                ]
                  .filter((val, idx, arr) => arr.indexOf(val) === idx && val > 0)
                  .map((amt, i) => (
                    <button
                      key={`${amt}-${i}`}
                      type="button"
                      onClick={() => onChangeDebtPayAmount(amt)}
                      className={`px-2 py-1 text-[11px] font-bold border rounded hover:bg-card cursor-pointer transition-colors ${
                        debtPayAmount === amt ? "bg-accent text-white border-fg shadow-sm" : "bg-muted border-border text-fg"
                      }`}
                    >
                      {amt === Number(selectedCustomer.total_piutang) ? "Bayar Lunas (" : ""}
                      Rp{amt.toLocaleString("id-ID")}
                      {amt === Number(selectedCustomer.total_piutang) ? ")" : ""}
                    </button>
                  ))}
              </div>
            </div>
            <div>
              <label className="font-bold text-fg block mb-1">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeDebtPayMethod("tunai")}
                  className={`p-2.5 rounded border-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                    debtPayMethod === "tunai" ? "border-fg bg-accent text-accent-fg shadow-xs" : "border-border bg-card text-muted-fg"
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Uang Tunai</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeDebtPayMethod("qris")}
                  className={`p-2.5 rounded border-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                    debtPayMethod === "qris" ? "border-fg bg-accent text-accent-fg shadow-xs" : "border-border bg-card text-muted-fg"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>QRIS</span>
                </button>
              </div>
            </div>
            <div className="p-2.5 rounded bg-muted border border-border flex items-center justify-between text-xs">
              <span>Sisa Kas Bon Setelah Dibayar:</span>
              <strong className="font-mono text-sm font-bold text-fg">
                Rp{Math.max(0, Number(selectedCustomer.total_piutang || 0) - debtPayAmount).toLocaleString("id-ID")}
              </strong>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={onClosePayDebt}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={submittingDebtPay} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                <Check className="w-3.5 h-3.5 mr-1" />
                {submittingDebtPay ? "Memproses..." : "Konfirmasi Pembayaran Bon"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={isHoldCartModalOpen} onClose={onCloseHoldModal} title="Tunda Transaksi (Pending)" className="max-w-md">
        <form onSubmit={onConfirmHoldCart} className="space-y-3 text-xs font-body">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 text-amber-900 dark:text-amber-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <PauseCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Simpan Sementara Keranjang Belanja</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Gunakan fitur ini apabila pembeli masih mengambil barang tambahan di rak sedangkan antrean kasir sedang ramai.
            </p>
          </div>
          <div className="p-2.5 rounded bg-muted border border-border flex items-center justify-between">
            <div>
              <span className="text-muted-fg block text-[11px]">Isi Keranjang Saat Ini:</span>
              <strong className="font-bold text-fg">
                {cartTotalQty} Item ({cartLength} Jenis Produk)
              </strong>
            </div>
            <div className="text-right">
              <span className="text-muted-fg block text-[11px]">Subtotal Sementara:</span>
              <strong className="font-heading text-sm font-extrabold text-accent">
                Rp{cartSubtotal.toLocaleString("id-ID")}
              </strong>
            </div>
          </div>
          <div>
            <label className="font-bold text-fg block mb-1">Label / Catatan Pembeli:</label>
            <input
              type="text"
              value={holdNoteInput}
              onChange={(e) => onChangeHoldNote(e.target.value)}
              placeholder="Contoh: Ibu Baju Merah / Bapak Ambil Minyak..."
              autoFocus
              className="w-full px-3 py-2 bg-card border-2 border-border rounded text-xs outline-none focus:border-accent"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onCloseHoldModal}>
              Batal
            </Button>
            <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              <PauseCircle className="w-3.5 h-3.5 mr-1" />
              Simpan ke Pending
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={isPendingListModalOpen} onClose={onClosePendingList} title={`Daftar Transaksi Pending (${pendingOrders.length})`} className="max-w-lg">
        <div className="space-y-3 text-xs font-body">
          {cartLength > 0 && pendingOrders.length > 0 && (
            <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-400 text-amber-900 dark:text-amber-200 text-[11px]">
              <strong>Perhatian:</strong> Keranjang aktif sedang berisi <strong>{cartTotalQty} item</strong>. Memilih <strong>Tukar &amp; Lanjutkan</strong> akan otomatis menyimpan keranjang aktif ke daftar Pending.
            </div>
          )}
          {pendingOrders.length === 0 ? (
            <div className="py-10 text-center text-muted-fg border-2 border-dashed border-border rounded-lg space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-400" />
              <div className="font-bold text-sm text-fg">Belum Ada Transaksi yang Ditunda</div>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {pendingOrders.map((order) => (
                <div key={order.id} className="p-3 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-heading font-extrabold text-sm text-fg">{order.label}</span>
                        <Badge variant="yellow" className="text-[10px]">
                          {order.totalQty} Item
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-fg mt-0.5">
                        Pelanggan: <strong>{order.customerName}</strong> ·{" "}
                        {new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-muted-fg block">Subtotal</span>
                      <strong className="font-heading font-extrabold text-sm text-accent">
                        Rp{Number(order.subtotal || 0).toLocaleString("id-ID")}
                      </strong>
                    </div>
                  </div>
                  <div className="p-2 rounded bg-muted/60 border border-border text-[11px] space-y-1 max-h-28 overflow-y-auto">
                    {order.items.map((it, idx) => (
                      <div key={it.cartItemId || idx} className="flex justify-between gap-2">
                        <span className="truncate">
                          {it.qty}x {it.product.nama} <span className="text-muted-fg">({it.selectedUnit})</span>
                        </span>
                        <span className="font-mono font-semibold shrink-0">Rp{Number(it.subtotal).toLocaleString("id-ID")}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onDeletePendingOrder(order.id, order.label)}
                      className="px-2.5 py-1.5 rounded border border-red-300 bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      {cartLength > 0 ? (
                        <>
                          <Button type="button" size="sm" variant="outline" onClick={() => onResumePendingOrder(order, "merge")} className="text-[11px]">
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Gabung
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onResumePendingOrder(order, "swap")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                          >
                            <PlayCircle className="w-3.5 h-3.5 mr-1" />
                            Tukar &amp; Lanjutkan
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onResumePendingOrder(order, "swap")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                          <PlayCircle className="w-3.5 h-3.5 mr-1" />
                          Lanjutkan Transaksi
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
