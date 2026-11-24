"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { Pelanggan } from "@/types/api";
import type { PaymentMethod } from "./pos-types";
import { PosPaymentQrView, PosQrZoomModal } from "./pos-payment-qr";
import { BookOpen, Coins, QrCode, Split } from "lucide-react";

interface PosPaymentModalProps {
  open: boolean;
  paymentStep: "form" | "awaiting_qr";
  paymentMethod: PaymentMethod;
  cartGrandTotal: number;
  cashReceived: number;
  splitCashAmount: number;
  debtDownPayment: number;
  selectedCustomer: Pelanggan | null;
  allocateDebtPayment: boolean;
  debtAllocatedAmount: number;
  processingCheckout: boolean;
  generatingQr: boolean;
  qrStatus: "waiting" | "paid" | "expired";
  qrRemainingSec: number;
  qrRefId: string;
  dynamicQrImage: string | null;
  dynamicQrMerchant: string;
  dynamicQrCity: string;
  storeName: string;
  isQrZoomModalOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: PaymentMethod) => void;
  onChangeCashReceived: (val: number) => void;
  onChangeSplitCash: (val: number) => void;
  onChangeDebtDownPayment: (val: number) => void;
  onToggleAllocateDebt: (checked: boolean) => void;
  onChangeDebtAllocated: (val: number) => void;
  onConfirmPayment: () => void;
  onRegenerateQr: (amount: number) => void;
  onBackToForm: () => void;
  onFinalizePayment: () => void;
  onOpenQrZoom: () => void;
  onCloseQrZoom: () => void;
}

const PAYMENT_OPTIONS: Array<{ id: PaymentMethod; label: string; icon: typeof Coins }> = [
  { id: "cash", label: "Tunai", icon: Coins },
  { id: "qris", label: "QRIS", icon: QrCode },
  { id: "split", label: "Split", icon: Split },
  { id: "debt", label: "Kas Bon", icon: BookOpen },
];

/** Modal pembayaran POS (Tunai, QRIS, Split, Kas Bon + Zoom QRIS) */
export function PosPaymentModal(props: PosPaymentModalProps) {
  const {
    open,
    paymentStep,
    paymentMethod,
    cartGrandTotal,
    cashReceived,
    splitCashAmount,
    debtDownPayment,
    selectedCustomer,
    allocateDebtPayment,
    debtAllocatedAmount,
    processingCheckout,
    generatingQr,
    qrStatus,
    qrRemainingSec,
    qrRefId,
    dynamicQrImage,
    dynamicQrMerchant,
    dynamicQrCity,
    storeName,
    isQrZoomModalOpen,
    onClose,
    onSelectMethod,
    onChangeCashReceived,
    onChangeSplitCash,
    onChangeDebtDownPayment,
    onToggleAllocateDebt,
    onChangeDebtAllocated,
    onConfirmPayment,
    onRegenerateQr,
    onBackToForm,
    onFinalizePayment,
    onOpenQrZoom,
    onCloseQrZoom,
  } = props;

  const qrisAmount = paymentMethod === "split" ? Math.max(0, cartGrandTotal - splitCashAmount) : cartGrandTotal;
  const totalPiutang = Number(selectedCustomer?.total_piutang || 0);
  const cashQuickPresets = [
    cartGrandTotal,
    ...[10000, 20000, 50000, 100000, 200000].filter((amt) => amt >= cartGrandTotal),
  ].filter((val, idx, arr) => arr.indexOf(val) === idx);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={paymentStep === "awaiting_qr" ? "Scan QRIS Pembayaran" : "Pembayaran Transaksi"}
        className="max-w-md"
      >
        {paymentStep === "form" ? (
          <div className="flex flex-col gap-3 text-[13px]">
            <div className="bg-muted p-3 rounded border-2 border-border text-center">
              <span className="text-xs text-muted-fg">Total Tagihan:</span>
              <div className="text-2xl font-extrabold text-accent">Rp{cartGrandTotal.toLocaleString("id-ID")}</div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {PAYMENT_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMethod(m.id)}
                  className={`p-2 rounded border-2 flex flex-col items-center gap-1 text-[11px] font-bold cursor-pointer transition-all ${
                    paymentMethod === m.id ? "bg-accent text-white border-fg shadow-sm" : "bg-card border-border hover:bg-muted"
                  }`}
                >
                  <m.icon className="w-4 h-4" />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === "cash" && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-fg">Uang Tunai Diterima (Rp):</label>
                <input
                  type="number"
                  min={0}
                  value={cashReceived === 0 ? "" : cashReceived}
                  onChange={(e) => {
                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                    onChangeCashReceived(Number.isFinite(val) ? Math.max(0, val) : 0);
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-card border-2 border-border rounded text-base font-bold outline-none focus:border-accent"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {cashQuickPresets.map((amt, i) => (
                    <button
                      key={`${amt}-${i}`}
                      type="button"
                      onClick={() => onChangeCashReceived(amt)}
                      className={`px-2 py-1 text-[11px] font-bold border rounded hover:bg-card cursor-pointer transition-colors ${
                        Number(cashReceived) === Number(amt)
                          ? "bg-accent text-white border-fg shadow-sm"
                          : "bg-muted border-border text-fg"
                      }`}
                    >
                      {amt === cartGrandTotal ? "Uang Pas (" : ""}Rp{amt.toLocaleString("id-ID")}
                      {amt === cartGrandTotal ? ")" : ""}
                    </button>
                  ))}
                </div>

                {selectedCustomer && totalPiutang > 0 && (
                  <div className="mt-2 p-2.5 rounded-lg border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="flex items-center gap-2 font-bold cursor-pointer text-amber-900 dark:text-amber-200">
                        <input
                          type="checkbox"
                          checked={allocateDebtPayment}
                          onChange={(e) => onToggleAllocateDebt(e.target.checked)}
                          className="w-4 h-4 rounded border-amber-400 text-accent focus:ring-accent"
                        />
                        <span>Potong Kas Bon dari Uang Diterima</span>
                      </label>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded">
                        Bon: Rp{totalPiutang.toLocaleString("id-ID")}
                      </span>
                    </div>

                    {allocateDebtPayment && (
                      <div className="space-y-2 pt-1 border-t border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-fg whitespace-nowrap">Nominal Potong Bon:</span>
                          <input
                            type="number"
                            min={0}
                            max={Math.min(cashReceived, totalPiutang)}
                            value={debtAllocatedAmount || ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : Number(e.target.value);
                              onChangeDebtAllocated(Number.isFinite(val) ? Math.max(0, val) : 0);
                            }}
                            className="w-full px-2 py-1 bg-card border border-border rounded font-bold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const rawKembalian = Math.max(0, cashReceived - cartGrandTotal);
                              onChangeDebtAllocated(Math.min(rawKembalian, totalPiutang));
                            }}
                            className="px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-bold text-[10px] whitespace-nowrap cursor-pointer"
                          >
                            Semua Lebih
                          </button>
                        </div>

                        <div className="text-[11px] space-y-1 text-slate-700 dark:text-slate-300 bg-card/60 p-2 rounded">
                          <div className="flex justify-between">
                            <span>Belanja Hari Ini:</span>
                            <span>Rp{cartGrandTotal.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="flex justify-between font-bold text-amber-800 dark:text-amber-300">
                            <span>Potong Kas Bon:</span>
                            <span>Rp{debtAllocatedAmount.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="flex justify-between font-bold pt-1 border-t border-border">
                            <span>Total Uang Terpotong:</span>
                            <span>Rp{(cartGrandTotal + debtAllocatedAmount).toLocaleString("id-ID")}</span>
                          </div>
                          <div className="flex justify-between text-muted-fg text-[10px]">
                            <span>Sisa Kas Bon Pelanggan Nanti:</span>
                            <span className="font-bold text-fg">
                              Rp{Math.max(0, totalPiutang - debtAllocatedAmount).toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-border text-sm">
                  <span>Kembalian Tunai Kasir:</span>
                  <strong
                    className={`font-bold font-mono text-base ${
                      cashReceived >= cartGrandTotal + (allocateDebtPayment ? debtAllocatedAmount : 0)
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    Rp
                    {Math.max(
                      0,
                      cashReceived - (cartGrandTotal + (allocateDebtPayment ? debtAllocatedAmount : 0))
                    ).toLocaleString("id-ID")}
                  </strong>
                </div>
              </div>
            )}

            {paymentMethod === "qris" && (
              <div className="p-3 bg-muted/60 border border-border rounded text-center flex flex-col items-center gap-1.5">
                <QrCode className="w-10 h-10 text-accent" />
                <span className="font-bold text-fg">Pembayaran Penuh via QRIS</span>
                <p className="text-[11px] text-muted-fg leading-relaxed">
                  Kode QRIS dengan nominal <strong>Rp{cartGrandTotal.toLocaleString("id-ID")}</strong> akan ditampilkan untuk dipindai pelanggan.
                </p>
              </div>
            )}

            {paymentMethod === "split" && (
              <div className="flex flex-col gap-2.5 text-xs">
                <div>
                  <label className="font-bold text-muted-fg block mb-1">1. Porsi Uang Tunai Diterima (Rp):</label>
                  <input
                    type="number"
                    min={0}
                    value={splitCashAmount || ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? 0 : Number(e.target.value);
                      onChangeSplitCash(Number.isFinite(val) ? Math.max(0, val) : 0);
                    }}
                    className="w-full px-3 py-2 bg-card border-2 border-border rounded font-bold text-sm outline-none focus:border-accent"
                  />
                </div>
                <div className="p-2.5 bg-accent/10 border-2 border-accent/40 rounded flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-fg block">2. Sisa Tagihan via QRIS:</span>
                    <strong className="text-base font-extrabold text-accent">Rp{qrisAmount.toLocaleString("id-ID")}</strong>
                  </div>
                  <QrCode className="w-6 h-6 text-accent" />
                </div>
              </div>
            )}

            {paymentMethod === "debt" && (
              <div className="flex flex-col gap-2 text-xs">
                <div className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-300 text-amber-900 dark:text-amber-200">
                  Pencatatan utang otomatis ke buku Kas Bon pelanggan terdaftar.
                </div>
                <div>
                  <label className="font-bold text-muted-fg">Uang Muka / DP Tunai (Opsional):</label>
                  <input
                    type="number"
                    min={0}
                    max={cartGrandTotal}
                    value={debtDownPayment || ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? 0 : Number(e.target.value);
                      onChangeDebtDownPayment(Number.isFinite(val) ? Math.max(0, val) : 0);
                    }}
                    className="w-full px-2 py-1.5 bg-card border-2 border-border rounded font-bold"
                  />
                </div>
                <div className="flex justify-between pt-1">
                  <span>Sisa Piutang Dicatat:</span>
                  <strong className="font-bold text-red-500">
                    Rp{Math.max(0, cartGrandTotal - debtDownPayment).toLocaleString("id-ID")}
                  </strong>
                </div>
              </div>
            )}

            <div className="sticky bottom-0 bg-card flex justify-end gap-2 pt-3 pb-1 border-t border-border">
              <Button variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button disabled={processingCheckout || generatingQr} onClick={onConfirmPayment}>
                {processingCheckout
                  ? "Memproses..."
                  : generatingQr
                  ? "Menyiapkan QRIS..."
                  : paymentMethod === "qris" || paymentMethod === "split"
                  ? "Tampilkan QRIS"
                  : "Konfirmasi & Cetak Struk"}
              </Button>
            </div>
          </div>
        ) : (
          <PosPaymentQrView
            paymentMethod={paymentMethod}
            cartGrandTotal={cartGrandTotal}
            splitCashAmount={splitCashAmount}
            qrStatus={qrStatus}
            qrRemainingSec={qrRemainingSec}
            qrRefId={qrRefId}
            dynamicQrImage={dynamicQrImage}
            dynamicQrMerchant={dynamicQrMerchant}
            dynamicQrCity={dynamicQrCity}
            storeName={storeName}
            generatingQr={generatingQr}
            processingCheckout={processingCheckout}
            onZoomQr={onOpenQrZoom}
            onRegenerateQr={onRegenerateQr}
            onBackToForm={onBackToForm}
            onFinalize={onFinalizePayment}
          />
        )}
      </Modal>

      <PosQrZoomModal
        open={isQrZoomModalOpen}
        dynamicQrImage={dynamicQrImage}
        qrRefId={qrRefId}
        qrisAmount={qrisAmount}
        merchantName={dynamicQrMerchant || storeName}
        merchantCity={dynamicQrCity}
        onClose={onCloseQrZoom}
      />
    </>
      );
}
