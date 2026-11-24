"use client";

import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import type { PaymentMethod } from "./pos-types";
import { AlertTriangle, Check, Loader2, QrCode, RefreshCw } from "lucide-react";

interface PosPaymentQrProps {
  paymentMethod: PaymentMethod;
  cartGrandTotal: number;
  splitCashAmount: number;
  qrStatus: "waiting" | "paid" | "expired";
  qrRemainingSec: number;
  qrRefId: string;
  dynamicQrImage: string | null;
  dynamicQrMerchant: string;
  dynamicQrCity: string;
  storeName: string;
  generatingQr: boolean;
  processingCheckout: boolean;
  onZoomQr: () => void;
  onRegenerateQr: (amount: number) => void;
  onBackToForm: () => void;
  onFinalize: () => void;
}

/** Tampilan langkah pembayaran QRIS dinamis di dalam modal checkout */
export function PosPaymentQrView({
  paymentMethod,
  cartGrandTotal,
  splitCashAmount,
  qrStatus,
  qrRemainingSec,
  qrRefId,
  dynamicQrImage,
  dynamicQrMerchant,
  dynamicQrCity,
  storeName,
  generatingQr,
  processingCheckout,
  onZoomQr,
  onRegenerateQr,
  onBackToForm,
  onFinalize,
}: PosPaymentQrProps) {
  const qrisAmount = paymentMethod === "split" ? Math.max(0, cartGrandTotal - splitCashAmount) : cartGrandTotal;

  return (
        <div className="flex flex-col gap-2.5 sm:gap-3 text-xs font-body">
          <div className="p-2.5 sm:p-3 bg-muted/60 border-2 border-border rounded-lg flex justify-between items-center gap-2">
            <div>
              <span className="text-[11px] text-muted-fg block">Nominal Tagihan QRIS:</span>
              <strong className="text-lg sm:text-xl font-extrabold text-accent">Rp{qrisAmount.toLocaleString("id-ID")}</strong>
            </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 text-emerald-700 dark:text-emerald-300 inline-block">
                  Nominal Terkunci (Dinamis)
                </span>
                <div className="text-[10px] text-muted-fg font-mono mt-0.5 flex items-center justify-end gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${qrRemainingSec > 60 ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-ping"
                      }`}
                  />
                  <span>
                    Berlaku: {Math.floor(qrRemainingSec / 60).toString().padStart(2, "0")}:
                    {(qrRemainingSec % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>

              <div className="bg-card p-3 sm:p-4 rounded-xl border-2 border-fg shadow-pop-soft flex flex-col items-center justify-center text-center">
                {generatingQr ? (
                    <div className="w-40 h-40 sm:w-52 sm:h-52 flex flex-col items-center justify-center gap-2 text-muted-fg">
                      <Loader2 className="w-8 h-8 animate-spin text-accent" />
                      <span className="text-xs font-bold">Membuat QRIS Dinamis...</span>
                    </div>
                    ) : dynamicQrImage ? (
                    <button
                      type="button"
                      onClick={onZoomQr}
                      className="group relative cursor-pointer focus:outline-none"
                      title="Klik untuk memperbesar QR pembayaran"
                    >
                        <div className="w-40 h-40 sm:w-52 sm:h-52 bg-white border-2 border-slate-900 rounded-lg p-2 sm:p-2.5 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={dynamicQrImage} alt="QRIS Dinamis Tokiva" className="w-full h-full object-contain" />
                          {qrStatus === "expired" && (
                            <div className="absolute inset-0 bg-slate-950/85 rounded-lg flex flex-col items-center justify-center text-white gap-2 p-3">
                              <AlertTriangle className="w-8 h-8 text-amber-400" />
                              <span className="font-bold text-xs">Waktu QR Habis</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRegenerateQr(qrisAmount);
                                }}
                                className="bg-white text-black font-bold text-[11px]"
                              >
                                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                Buat QR Baru
                              </Button>
                            </div>
                          )}
                        </div>
                        <span className="block text-[10px] text-muted-fg group-hover:text-accent font-medium mt-1.5">
                          🔍 Klik QR untuk Perbesar Layar Penuh
                        </span>
                    </button>
                    ) : (
                      <div className="w-40 h-40 sm:w-52 sm:h-52 bg-muted border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-fg gap-2 p-3">
                        <QrCode className="w-12 h-12 text-muted-fg/60" />
                        <span className="text-[11px] text-center">Gagal memuat QRIS dinamis toko</span>
                      </div>
        )}

                        <div className="mt-1.5 sm:mt-2 text-[11px] font-mono text-muted-fg">
                          <span className="font-bold text-fg">{dynamicQrMerchant || storeName}</span>
                          {dynamicQrCity && <span> · {dynamicQrCity}</span>}
                          <div>Ref: {qrRefId}</div>
                        </div>
                      </div>

                        <div className="p-2 sm:p-2.5 bg-muted/30 border border-border rounded text-[11px] text-muted-fg leading-relaxed">
                          💡 Pembeli cukup memindai dengan aplikasi m-banking atau e-wallet (BCA, Mandiri, BRI, GoPay, OVO, DANA, ShopeePay). Nominal tagihan{" "}
                          <strong>otomatis terisi pas</strong> tanpa perlu diketik manual.
                        </div>

                          <div className="sticky bottom-0 bg-card flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2.5 pb-1 border-t border-border">
                            <button
                              type="button"
                              onClick={onBackToForm}
                              className="w-full sm:w-auto py-1.5 sm:py-0 text-xs font-bold text-muted-fg hover:text-fg hover:underline cursor-pointer text-center"
                            >
                              ← Kembali
                            </button>
                            <Button
                              size="sm"
                              disabled={processingCheckout || qrStatus === "expired"}
                              onClick={onFinalize}
                              className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                              <Check className="w-3.5 h-3.5 mr-1 shrink-0" />
                              {processingCheckout ? "Menyimpan..." : "Konfirmasi Pembayaran Diterima"}
                            </Button>
                          </div>
                        </div>
                        );
}

                        /** Overlay layar penuh untuk mempermudah pemindaian QRIS oleh pembeli */
                        export function PosQrZoomModal({
                          open,
                          dynamicQrImage,
                          qrRefId,
                          qrisAmount,
                          merchantName,
                          merchantCity,
                          onClose,
}: {
                          open: boolean;
                        dynamicQrImage: string | null;
                        qrRefId: string;
                        qrisAmount: number;
                        merchantName: string;
                        merchantCity: string;
  onClose: () => void;
}) {
  if (!open || !dynamicQrImage) return null;

                        const zoomModalNode = (
                        <div
                          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
                          onClick={onClose}
                        >
                          <div
                            className="bg-card border-4 border-fg rounded-2xl shadow-pop p-4 sm:p-6 max-w-sm w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto text-center space-y-3 sm:space-y-4 font-body"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-left">
                                <h3 className="font-heading font-extrabold text-base text-fg">Pindai QRIS Pembayaran</h3>
                                <p className="text-[11px] text-muted-fg font-mono">Ref: {qrRefId}</p>
                              </div>
                              <button
                                type="button"
                                onClick={onClose}
                                className="w-8 h-8 rounded-full border-2 border-fg bg-muted hover:bg-card flex items-center justify-center font-bold text-sm cursor-pointer shadow-pop-soft"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="p-3 bg-accent/10 border-2 border-accent/40 rounded-xl">
                              <span className="text-xs text-muted-fg block">Total Bayar Pas:</span>
                              <div className="text-2xl font-black text-accent font-heading">Rp{qrisAmount.toLocaleString("id-ID")}</div>
                              <span className="text-[10px] text-muted-fg block mt-0.5">Nominal terisi otomatis di aplikasi pelanggan</span>
                            </div>

                              <div className="p-3 sm:p-4 bg-white border-2 border-slate-900 rounded-xl shadow-md inline-block mx-auto">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={dynamicQrImage} alt="QRIS Dinamis Fullscreen" className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto" />
                              </div>

                              <div className="text-xs text-fg font-bold">
                                {merchantName}
                                {merchantCity && <span className="font-normal text-muted-fg text-[11px] block">{merchantCity}</span>}
                              </div>

                              <Button className="w-full font-bold" onClick={onClose}>
                                Kembali ke Layar Kasir
                              </Button>
                            </div>
                          </div>
                          );

                          return typeof document !== "undefined" ? createPortal(zoomModalNode, document.body) : zoomModalNode;
}
