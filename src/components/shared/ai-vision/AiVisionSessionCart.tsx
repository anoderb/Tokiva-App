"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
import type { Produk } from "@/types/api";
import type { SessionScanItem } from "./ai-vision-types";
import { ArrowRight, Check, Edit2, Minus, Package, Plus, Search, ShoppingCart, X } from "lucide-react";

interface AiVisionSessionCartProps {
  sessionScans: SessionScanItem[];
  products: Produk[];
  correctingItem: SessionScanItem | null;
  correctionSearch: string;
  onStartCorrection: (item: SessionScanItem) => void;
  onCancelCorrection: () => void;
  onChangeCorrectionSearch: (val: string) => void;
  onApplyCorrection: (wrongItem: SessionScanItem, trueProduct: Produk) => void;
  onIncrementItem: (item: SessionScanItem) => void;
  onDecrementItem: (item: SessionScanItem) => void;
  onClose: () => void;
}

/** Mini-keranjang sesi AI Vision dengan panel koreksi cepat aktif untuk data latih */
export function AiVisionSessionCart({
  sessionScans,
  products,
  correctingItem,
  correctionSearch,
  onStartCorrection,
  onCancelCorrection,
  onChangeCorrectionSearch,
  onApplyCorrection,
  onIncrementItem,
  onDecrementItem,
  onClose,
}: AiVisionSessionCartProps) {
  const totalSessionItems = sessionScans.reduce((sum, s) => sum + s.qty, 0);
  const totalSessionPrice = sessionScans.reduce((sum, s) => sum + s.qty * s.unitPrice, 0);

  return (
    <div className="lg:col-span-5 flex flex-col justify-between border-2 border-fg rounded-lg bg-card p-3 shadow-pop-soft">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b-2 border-border pb-2.5">
          <div className="flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-accent" />
            <span className="font-heading font-bold text-sm text-fg">Hasil Pindai Sesi Ini</span>
          </div>
          <Badge variant="purple" className="font-mono text-xs font-bold">
            {totalSessionItems} Item
          </Badge>
        </div>

        <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
          {sessionScans.length === 0 ? (
            <div className="py-12 text-center text-muted-fg space-y-2">
              <Package className="w-8 h-8 mx-auto text-slate-400 animate-pulse" />
              <p className="font-semibold text-xs">Belum ada barang yang di-scan.</p>
              <p className="text-[11px] text-muted-fg leading-relaxed">
                Arahkan kemasan barang ke depan kamera. Bunyi <strong>BEEP!</strong> akan bersuara otomatis setiap barang terbaca.
              </p>
            </div>
          ) : (
            sessionScans.map((item, idx) => (
              <div
                key={item.cartItemId || idx}
                className="p-2 rounded-md border-2 border-border bg-muted/20 hover:border-fg transition-all flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ProductImage
                    src={item.product.foto_url}
                    alt={item.product.nama}
                    className="w-9 h-9 rounded border border-border shrink-0"
                    iconClassName="w-4 h-4"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-fg truncate">{item.product.nama}</div>
                    <div className="text-[10px] text-muted-fg font-mono">
                      Rp{item.unitPrice.toLocaleString("id-ID")} /{item.unitName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onStartCorrection(item)}
                    className="p-1 rounded border border-amber-500 bg-amber-50 hover:bg-amber-200 text-amber-800 cursor-pointer transition-colors"
                    title="Salah tebak? Koreksi produk ini"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecrementItem(item)}
                    className="p-1 rounded border border-fg bg-card hover:bg-rose-500 hover:text-white cursor-pointer transition-colors"
                    title="Kurangi 1"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent min-w-[30px] text-center">
                    x{item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => onIncrementItem(item)}
                    className="p-1 rounded border border-fg bg-card hover:bg-accent hover:text-white cursor-pointer transition-colors"
                    title="Tambah 1"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {correctingItem && (
          <div className="p-2.5 rounded-md border-2 border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[11px] text-amber-900 dark:text-amber-200 truncate">
                Koreksi: {correctingItem.product.nama}
              </span>
              <button type="button" onClick={onCancelCorrection} className="p-0.5 rounded hover:bg-black/10 text-muted-fg">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-muted-fg" />
              <input
                type="text"
                value={correctionSearch}
                onChange={(e) => onChangeCorrectionSearch(e.target.value)}
                placeholder="Cari nama produk yang benar..."
                className="w-full pl-7 pr-2 py-1 rounded border-2 border-fg bg-card text-xs focus:outline-none"
              />
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1">
              {products
                .filter(
                  (p) =>
                    p.id !== correctingItem.product.id &&
                    (!correctionSearch.trim() || p.nama.toLowerCase().includes(correctionSearch.toLowerCase()))
                )
                .slice(0, 8)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onApplyCorrection(correctingItem, p)}
                    className="w-full text-left px-2 py-1 rounded border border-border bg-card hover:bg-accent hover:text-white text-[11px] font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{p.nama}</span>
                    <span className="font-mono text-[10px] shrink-0 ml-2">
                      Rp{Number(p.harga_jual).toLocaleString("id-ID")}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t-2 border-border space-y-2.5 mt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-fg font-medium">Subtotal Pindai:</span>
          <span className="font-heading font-bold text-base text-accent">
            Rp{totalSessionPrice.toLocaleString("id-ID")}
          </span>
        </div>

        <Button
          type="button"
          onClick={onClose}
          className="w-full justify-center py-3 font-heading font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-pop hover:shadow-pop-hover cursor-pointer"
        >
          <Check className="w-4 h-4 mr-1.5" />
          Selesai & Lanjut Bayar ({totalSessionItems} Item)
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
