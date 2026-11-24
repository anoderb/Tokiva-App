"use client";

import { ProductImage } from "@/components/shared/product-image";
import type { Kategori, Produk, ProdukSatuan } from "@/types/api";
import { Clock, Package, RefreshCw, Scan, Search, Sparkles } from "lucide-react";

/** Area kiri terminal POS: pencarian, pemicu barcode/AI/pending, filter kategori, dan grid produk */
export function PosProductCatalog({
  visible,
  products,
  categories,
  selectedCategory,
  searchQuery,
  loadingCatalog,
  pendingCount,
  onChangeSearch,
  onBarcodeEnter,
  onSelectCategory,
  onOpenBarcodeModal,
  onOpenAiModal,
  onOpenPendingModal,
  onRefresh,
  onAddToCart,
}: {
  visible: boolean;
  products: Produk[];
  categories: Kategori[];
  selectedCategory: string;
  searchQuery: string;
  loadingCatalog: boolean;
  pendingCount: number;
  onChangeSearch: (q: string) => void;
  onBarcodeEnter: (code: string) => void;
  onSelectCategory: (catId: string) => void;
  onOpenBarcodeModal: () => void;
  onOpenAiModal: () => void;
  onOpenPendingModal: () => void;
  onRefresh: () => void;
  onAddToCart: (product: Produk, unit: ProdukSatuan | "base") => void;
}) {
  return (
    <section className={`flex-1 min-w-0 ${visible ? "block" : "hidden lg:block"}`}>
      {/* SEARCH & 3 INPUT METHODS BAR */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg" />
          <input
            value={searchQuery}
            onChange={(e) => onChangeSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                e.preventDefault();
                onBarcodeEnter(searchQuery.trim());
                onChangeSearch("");
              }
            }}
            placeholder="Cari nama produk, SKU, atau scan barcode USB..."
            className="w-full pl-9 pr-7 py-2 sm:py-2.5 border-2 border-border rounded-full text-xs sm:text-[13px] font-body outline-none focus:border-accent bg-card"
          />
          {searchQuery && (
            <button
              onClick={() => onChangeSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-fg hover:text-fg font-bold text-xs cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        <button
          onClick={onOpenBarcodeModal}
          className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-full border-2 border-fg bg-card text-fg font-body font-bold text-[11px] sm:text-[12px] shadow-[2px_2px_0px_#1E293B] hover:bg-muted cursor-pointer flex items-center gap-1 shrink-0 transition-all"
          title="Scan Barcode"
        >
          <Scan className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
          <span className="hidden sm:inline">Scan Barcode</span>
          <span className="sm:hidden text-[11px]">Scan</span>
        </button>

        <button
          onClick={onOpenAiModal}
          className="px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-full border-2 border-fg bg-accent text-white font-body font-bold text-[11px] sm:text-[12px] shadow-pop hover:shadow-pop-hover cursor-pointer flex items-center gap-1 shrink-0 transition-all"
          title="Identifikasi AI"
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Identifikasi AI</span>
          <span className="sm:hidden text-[11px]">AI</span>
        </button>

        <button
          type="button"
          onClick={onOpenPendingModal}
          className={`px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-full border-2 border-fg font-body font-bold text-[11px] sm:text-[12px] shadow-[2px_2px_0px_#1E293B] cursor-pointer flex items-center gap-1.5 shrink-0 transition-all ${
            pendingCount > 0
              ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
              : "bg-card text-fg hover:bg-muted"
          }`}
          title="Daftar Transaksi Pending (Ditunda)"
        >
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Pending</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold border ${
              pendingCount > 0
                ? "bg-slate-950 text-amber-300 border-slate-950"
                : "bg-muted text-muted-fg border-border"
            }`}
          >
            {pendingCount}
          </span>
        </button>

        <button
          onClick={onRefresh}
          className="p-2 sm:p-2.5 rounded-full border-2 border-border bg-card hover:bg-muted text-muted-fg hover:text-fg cursor-pointer shrink-0"
          title="Muat Ulang Katalog"
        >
          <RefreshCw className={`w-4 h-4 ${loadingCatalog ? "animate-spin text-accent" : ""}`} />
        </button>
      </div>

      {/* CATEGORY FILTER PILLS */}
      <div className="flex gap-1.5 sm:gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => onSelectCategory("Semua")}
          className={`px-3 py-1.5 rounded-full border-2 text-[11px] sm:text-[12px] font-medium cursor-pointer transition-all whitespace-nowrap shrink-0 ${
            selectedCategory === "Semua"
              ? "bg-accent text-white border-fg shadow-[2px_2px_0px_#1E293B]"
              : "border-border bg-card hover:bg-muted text-fg"
          }`}
        >
          Semua
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full border-2 text-[11px] sm:text-[12px] font-medium cursor-pointer transition-all whitespace-nowrap shrink-0 ${
              selectedCategory === cat.id
                ? "bg-accent text-white border-fg shadow-[2px_2px_0px_#1E293B]"
                : "border-border bg-card hover:bg-muted text-fg"
            }`}
          >
            {cat.nama}
          </button>
        ))}
      </div>

      {/* PRODUCT CARDS GRID */}
      {loadingCatalog ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="h-44 rounded-md border-2 border-border bg-card animate-pulse p-3 flex flex-col justify-between"
            >
              <div className="w-12 h-12 rounded bg-muted" />
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="p-10 text-center bg-card border-2 border-dashed border-border rounded-lg text-muted-fg text-sm">
          Tidak ada produk yang cocok dengan pencarian atau filter kategori.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
          {products.map((p) => {
            const stockNum = Number(p.stok || 0);
            const isOutOfStock = stockNum <= 0;
            const multiUnits = p.satuan_tambahan || p.produk_satuan || [];
            const hasMulti = multiUnits.length > 0;

            return (
              <div
                key={p.id}
                className={`p-2.5 sm:p-3 rounded-md border-2 border-fg bg-card shadow-pop-soft transition-all flex flex-col justify-between ${
                  isOutOfStock
                    ? "opacity-55 cursor-not-allowed bg-muted"
                    : "hover:-translate-x-0.5 hover:-translate-y-0.5"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <ProductImage
                      src={p.foto_url}
                      alt={p.nama}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-md border border-border"
                    />
                    <div className="flex flex-col items-end gap-1">
                      {isOutOfStock ? (
                        <span className="text-[9px] sm:text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          Habis
                        </span>
                      ) : (
                        hasMulti && (
                          <span className="text-[8px] sm:text-[9px] font-bold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-300">
                            Grosir
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="text-[12px] sm:text-[13px] font-semibold truncate leading-tight" title={p.nama}>
                    {p.nama}
                  </div>

                  <div className="text-accent font-bold text-xs sm:text-sm mt-0.5">
                    Rp{Number(p.harga_jual).toLocaleString("id-ID")}{" "}
                    <span className="text-[10px] text-muted-fg font-normal">/{p.satuan_dasar}</span>
                  </div>

                  {hasMulti && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {multiUnits.map((mu) => (
                        <button
                          key={mu.id}
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(p, mu);
                          }}
                          className="text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                          title={`Beli 1 ${mu.nama_satuan} (Isi ${mu.isi_konversi} ${p.satuan_dasar})`}
                        >
                          <Package className="w-2.5 h-2.5" />
                          <span>
                            {mu.nama_satuan}: Rp{Number(mu.harga_jual).toLocaleString("id-ID")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-muted-fg mt-2 pt-1.5 border-t border-border flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <span className="hidden sm:inline">Stok: </span>
                    <strong className="text-fg font-bold">{stockNum}</strong>{" "}
                    <span className="text-[9px] text-muted-fg">{p.satuan_dasar}</span>
                  </div>
                  <button
                    disabled={isOutOfStock}
                    onClick={() => onAddToCart(p, "base")}
                    className="px-2.5 py-1 rounded bg-accent text-white font-bold text-[10px] border border-fg hover:brightness-105 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    + {p.satuan_dasar}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
