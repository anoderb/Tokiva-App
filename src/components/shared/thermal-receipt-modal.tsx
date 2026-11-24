"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { Printer } from "lucide-react";

export interface ReceiptItem {
  name: string;
  qty: number;
  unit: string;
  price: number;
  subtotal: number;
}

export interface ReceiptData {
  id: string;
  date: string;
  time: string;
  cashier: string;
  customer: string;
  items: ReceiptItem[];
  totalQty?: number;
  subtotal: number;
  discount?: number;
  total: number;
  method: string;
  cashReceived?: number;
  change?: number;
  splitCash?: number;
  splitNonCash?: number;
  qrisRef?: string;
  debtPaid?: number;
  debtRemaining?: number;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  isReprint?: boolean;
}

export function ThermalReceiptModal({
  open,
  onClose,
  data,
  title = "Struk Bukti Transaksi Penjualan",
}: {
  open: boolean;
  onClose: () => void;
  data: ReceiptData | null;
  title?: string;
}) {
  const { toko } = useAuth();
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("58mm");

  useEffect(() => {
    if (toko?.lebar_kertas === "80mm" || toko?.lebar_kertas === "58mm") {
      setPaperWidth(toko.lebar_kertas);
    }
  }, [toko?.lebar_kertas]);

  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("printing-receipt");
      }
    };
  }, []);

  if (!data) return null;

  const storeName = data.storeName || toko?.nama || "Tokiva POS";
  const storeAddress = data.storeAddress || toko?.alamat || "";
  const storePhone = data.storePhone || toko?.telepon || "";
  const headerStruk = data.receiptHeader || toko?.struk_header || "";
  const footerStruk =
    data.receiptFooter ||
    toko?.struk_footer ||
    "Terima kasih telah berbelanja di toko kami.";

  const handlePrint = () => {
    if (typeof window === "undefined") return;
    document.body.classList.add("printing-receipt");
    const cleanup = () => {
      document.body.classList.remove("printing-receipt");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  };

  const ReceiptContent = () => (
    <div
      style={{
        width: paperWidth === "58mm" ? "210px" : "290px",
        margin: "0 auto",
      }}
      className="bg-white text-slate-900 p-3 text-[11px] font-mono leading-tight flex flex-col gap-2"
    >
      {/* Header */}
      <div className="text-center border-b border-dashed border-slate-400 pb-2">
        <div className="font-bold text-sm tracking-wide uppercase">{storeName}</div>
        {headerStruk && <div className="text-[10px] font-semibold">{headerStruk}</div>}
        {storeAddress && <div className="text-[9px] text-slate-600">{storeAddress}</div>}
        {storePhone && <div className="text-[9px] text-slate-600">Telp: {storePhone}</div>}
        {data.isReprint && (
          <div className="text-[9px] font-bold text-slate-800 mt-1 uppercase">
            [ SALINAN / CETAK ULANG ]
          </div>
        )}
      </div>

      {/* Meta Info */}
      <div className="flex flex-col gap-0.5 text-[10px] border-b border-dashed border-slate-400 pb-2">
        <div className="flex justify-between">
          <span>No. Trx:</span>
          <span className="font-bold">{data.id}</span>
        </div>
        <div className="flex justify-between">
          <span>Waktu:</span>
          <span>
            {data.date} {data.time}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Kasir:</span>
          <span>{data.cashier}</span>
        </div>
        <div className="flex justify-between">
          <span>Pelanggan:</span>
          <span className="font-bold truncate max-w-[140px]">{data.customer}</span>
        </div>
      </div>

      {/* Itemized List */}
      <div className="border-b border-dashed border-slate-400 pb-2 flex flex-col gap-1 text-[10px]">
        {data.items.map((it, idx) => (
          <div key={idx} className="flex flex-col">
            <span className="font-bold">{it.name}</span>
            <div className="flex justify-between text-slate-700">
              <span>
                {it.qty} {it.unit} × {it.price.toLocaleString("id-ID")}
              </span>
              <span className="font-bold text-slate-900">
                Rp{it.subtotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals & Calculations */}
      <div className="flex flex-col gap-0.5 text-[10px] border-b border-dashed border-slate-400 pb-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>Rp{data.subtotal.toLocaleString("id-ID")}</span>
        </div>
        {data.discount && data.discount > 0 ? (
          <div className="flex justify-between text-red-600">
            <span>Diskon:</span>
            <span>-Rp{data.discount.toLocaleString("id-ID")}</span>
          </div>
        ) : null}
        <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
          <span>TOTAL:</span>
          <span>Rp{data.total.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex justify-between pt-0.5">
          <span>Metode:</span>
          <span className="font-bold uppercase">{data.method}</span>
        </div>
        {data.cashReceived !== undefined && data.cashReceived > 0 && (
          <>
            <div className="flex justify-between">
              <span>Tunai Diterima:</span>
              <span>Rp{data.cashReceived.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Kembalian:</span>
              <span>Rp{(data.change ?? 0).toLocaleString("id-ID")}</span>
            </div>
          </>
        )}
        {data.splitCash !== undefined && data.splitCash > 0 && (
          <>
            <div className="flex justify-between">
              <span>Tunai:</span>
              <span>Rp{data.splitCash.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between">
              <span>Non-Tunai (QRIS):</span>
              <span>Rp{(data.splitNonCash ?? 0).toLocaleString("id-ID")}</span>
            </div>
          </>
        )}
        {data.qrisRef && (
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Ref QRIS:</span>
            <span>{data.qrisRef}</span>
          </div>
        )}
        {data.debtPaid !== undefined && data.debtPaid > 0 && (
          <div className="flex justify-between font-bold text-emerald-800">
            <span>Bayar Kas Bon:</span>
            <span>Rp{data.debtPaid.toLocaleString("id-ID")}</span>
          </div>
        )}
        {data.debtRemaining !== undefined && (
          <div className={`flex justify-between font-bold ${data.debtRemaining > 0 ? "text-amber-800" : "text-emerald-800"}`}>
            <span>Sisa Kas Bon:</span>
            <span>{data.debtRemaining === 0 ? "Rp 0 (LUNAS)" : `Rp${data.debtRemaining.toLocaleString("id-ID")}`}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[9px] text-slate-600 pt-1 leading-snug">
        {footerStruk}
      </div>
    </div>
  );

  return (
    <>
      <Modal open={open} onClose={onClose} title={title} className="max-w-md">
        <div className="flex flex-col gap-3 text-xs font-body">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="font-bold text-muted-fg">Ukuran Kertas Thermal:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPaperWidth("58mm")}
                className={`px-3 py-1 rounded text-xs font-bold border transition-colors cursor-pointer ${
                  paperWidth === "58mm"
                    ? "bg-accent text-white border-fg shadow-sm"
                    : "bg-muted text-muted-fg border-border hover:border-fg"
                }`}
              >
                58 mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth("80mm")}
                className={`px-3 py-1 rounded text-xs font-bold border transition-colors cursor-pointer ${
                  paperWidth === "80mm"
                    ? "bg-accent text-white border-fg shadow-sm"
                    : "bg-muted text-muted-fg border-border hover:border-fg"
                }`}
              >
                80 mm
              </button>
            </div>
          </div>

          <div className="bg-muted p-4 rounded border-2 border-dashed border-border flex justify-center overflow-x-auto">
            <div className="bg-white rounded shadow-md border border-slate-200">
              <ReceiptContent />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose}>
              Tutup
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5 mr-1" />
              Cetak Struk Thermal
            </Button>
          </div>
        </div>
      </Modal>

      {open && (
        <div id="thermal-receipt-print-area">
          <style
            dangerouslySetInnerHTML={{
              __html: `@page { size: ${paperWidth === "58mm" ? "58mm" : "80mm"} auto; margin: 0; }`,
            }}
          />
          <ReceiptContent />
        </div>
      )}
    </>
  );
}
