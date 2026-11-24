"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatRupiah, formatTanggal, formatWaktu } from "@/lib/format";
import type { ReceiptData } from "@/components/shared/thermal-receipt-modal";
import type { Transaksi } from "@/types/api";
import { AlertTriangle, Lock, Printer } from "lucide-react";

/**
 * Memetakan object Transaksi dari API backend ke format ReceiptData untuk cetak ulang struk.
 */
export function mapTransaksiToReceiptData(fullTx: Transaksi, fallbackCashier: string): ReceiptData {
  const items = fullTx.items || fullTx.transaksi_item || [];
  const totalQty = items.reduce((sum, it) => sum + Number(it.jumlah || 0), 0);
  const metode = fullTx.metode_bayar;

  const methodLabel =
    metode === "tunai"
      ? "Tunai"
      : metode === "qris"
      ? "QRIS"
      : metode === "split"
      ? "Split (Tunai + QRIS)"
      : metode === "bon"
      ? "Kas Bon (Piutang)"
      : String(metode).toUpperCase();

  return {
    id: fullTx.no_transaksi || fullTx.nomor_faktur || fullTx.id,
    date: formatTanggal(fullTx.tgl_transaksi || fullTx.dibuat_pada),
    time: formatWaktu(fullTx.tgl_transaksi || fullTx.dibuat_pada),
    cashier: fullTx.kasir?.nama_lengkap || fallbackCashier,
    customer: fullTx.pelanggan?.nama || "Pelanggan Umum",
    items: items.map((it) => ({
      name: it.nama_produk,
      qty: Number(it.jumlah),
      unit: it.nama_satuan,
      price: Number(it.harga_satuan),
      subtotal: Number(it.subtotal),
    })),
    totalQty,
    subtotal: Number(fullTx.subtotal),
    discount: Number(fullTx.diskon || 0),
    total: Number(fullTx.total),
    method: methodLabel,
    cashReceived:
      metode === "tunai" ? Number(fullTx.uang_diterima ?? fullTx.bayar_tunai ?? 0) : undefined,
    change: metode === "tunai" ? Number(fullTx.kembalian || 0) : undefined,
    splitCash: metode === "split" ? Number(fullTx.split_tunai || 0) : undefined,
    splitNonCash:
      metode === "split" ? Number(fullTx.split_qris ?? fullTx.bayar_qris ?? 0) : undefined,
    qrisRef:
      metode === "qris" || metode === "split" ? fullTx.qris_ref || undefined : undefined,
    debtPaid: metode === "bon" ? Number(fullTx.uang_diterima || 0) : undefined,
    debtRemaining:
      metode === "bon"
        ? Math.max(0, Number(fullTx.total || 0) - Number(fullTx.uang_diterima || 0))
        : undefined,
    isReprint: true,
  };
}

export function TransactionDetailModal({
  tx,
  onClose,
  onPrintReceipt,
}: {
  tx: Transaksi | null;
  onClose: () => void;
  onPrintReceipt: (tx: Transaksi) => void;
}) {
  return (
    <Modal
      open={Boolean(tx)}
      onClose={onClose}
      title={`Detail Faktur ${tx?.no_transaksi || tx?.nomor_faktur || ""}`}
      className="max-w-md"
    >
      {tx && (
        <div className="space-y-3 text-xs font-body">
          <div className="p-3 rounded bg-muted border border-border space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-fg">Waktu Transaksi:</span>
              <strong>
                {formatTanggal(tx.tgl_transaksi || tx.dibuat_pada)}{" "}
                {formatWaktu(tx.tgl_transaksi || tx.dibuat_pada)}
              </strong>
            </div>
            {tx.kasir?.nama_lengkap && (
              <div className="flex justify-between">
                <span className="text-muted-fg">Dilayani Oleh:</span>
                <strong>{tx.kasir.nama_lengkap}</strong>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-fg">Pelanggan:</span>
              <strong>{tx.pelanggan?.nama || "Pelanggan Umum"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-fg">Metode Bayar:</span>
              <strong className="uppercase">{tx.metode_bayar}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-fg">Status:</span>
              <Badge variant={tx.status === "selesai" ? "green" : "red"}>{tx.status}</Badge>
            </div>
            {tx.alasan_batal && (
              <div className="text-red-600 pt-1">Alasan Batal: {tx.alasan_batal}</div>
            )}
          </div>

          <div className="border border-border rounded divide-y divide-border max-h-56 overflow-y-auto">
            {(tx.items || tx.transaksi_item || []).map((it, idx) => (
              <div key={idx} className="p-2 flex justify-between items-center">
                <div>
                  <div className="font-semibold">{it.nama_produk}</div>
                  <div className="text-[10px] text-muted-fg">
                    {it.jumlah} {it.nama_satuan} × {formatRupiah(it.harga_satuan)}
                  </div>
                </div>
                <strong className="font-bold">{formatRupiah(it.subtotal)}</strong>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatRupiah(tx.subtotal)}</span>
            </div>
            {Number(tx.diskon) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Diskon:</span>
                <span>-{formatRupiah(tx.diskon)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-border">
              <span>Total Akhir:</span>
              <span className="text-accent">{formatRupiah(tx.total)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose}>
              Tutup
            </Button>
            <Button
              size="sm"
              icon={Printer}
              onClick={() => {
                onClose();
                onPrintReceipt(tx);
              }}
            >
              Cetak Struk
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function TransactionVoidModal({
  target,
  requirePin,
  reason,
  pin,
  loading,
  onChangeReason,
  onChangePin,
  onClose,
  onConfirm,
}: {
  target: Transaksi | null;
  requirePin: boolean;
  reason: string;
  pin: string;
  loading: boolean;
  onChangeReason: (val: string) => void;
  onChangePin: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      title={`Batalkan (Void) Faktur ${target?.no_transaksi || target?.nomor_faktur || ""}`}
      className="max-w-md"
    >
      {target && (
        <div className="space-y-3 text-xs font-body">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Peringatan Pembatalan Nota:</strong> Membatalkan faktur{" "}
              <strong>{target.no_transaksi || target.nomor_faktur}</strong> (
              {formatRupiah(target.total)}) akan mengembalikan stok fisik produk ke gudang
              secara otomatis dan membatalkan piutang terkait jika transaksi menggunakan Kas Bon.
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1">Alasan Pembatalan *</label>
            <input
              value={reason}
              onChange={(e) => onChangeReason(e.target.value)}
              placeholder="Contoh: Salah input jumlah barang / Pembeli batal beli"
              className="w-full px-3 py-2 border-2 border-border rounded-lg bg-card"
            />
          </div>

          {requirePin && (
            <div>
              <label className="font-bold flex items-center gap-1 mb-1">
                <Lock className="w-3.5 h-3.5 text-accent" /> PIN Otorisasi 6-Digit *
              </label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => onChangePin(e.target.value.replace(/\D/g, ""))}
                placeholder="Masukkan 6 digit PIN Kasir/Owner"
                className="w-full px-3 py-2 border-2 border-border rounded font-mono tracking-widest text-center text-base font-bold bg-card"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button variant="danger" size="sm" disabled={loading} onClick={onConfirm}>
              {loading ? "Memverifikasi..." : "Konfirmasi Void Transaksi"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
