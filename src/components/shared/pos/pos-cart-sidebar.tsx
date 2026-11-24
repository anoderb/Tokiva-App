"use client";

import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
import type { Pelanggan } from "@/types/api";
import type { CartItem, PosMode } from "./pos-types";
import {
  Clock,
  HandCoins,
  Minus,
  PauseCircle,
  Plus,
  ShoppingCart,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";

/** Sidebar kanan POS: pemilih pelanggan, item keranjang, tombol Tunda & Bayar */
export function PosCartSidebar({
  visible,
  mode,
  cart,
  cartTotalQty,
  cartGrandTotal,
  pendingCount,
  customers,
  selectedCustomerId,
  selectedCustomer,
  processingCheckout,
  onBackToCatalog,
  onOpenPendingList,
  onOpenClearCart,
  onOpenAddCustomer,
  onSelectCustomer,
  onOpenPayDebt,
  onUpdateCartQty,
  onOpenHoldModal,
  onOpenPayment,
}: {
  visible: boolean;
  mode: PosMode;
  cart: CartItem[];
  cartTotalQty: number;
  cartGrandTotal: number;
  pendingCount: number;
  customers: Pelanggan[];
  selectedCustomerId: string;
  selectedCustomer: Pelanggan | null;
  processingCheckout: boolean;
  onBackToCatalog: () => void;
  onOpenPendingList: () => void;
  onOpenClearCart: () => void;
  onOpenAddCustomer: () => void;
  onSelectCustomer: (id: string) => void;
  onOpenPayDebt: () => void;
  onUpdateCartQty: (cartItemId: string, nextQty: number) => void;
  onOpenHoldModal: () => void;
  onOpenPayment: () => void;
}) {
  return (
    <aside
      className={`w-full min-w-0 lg:w-[380px] shrink-0 ${
        mode === "owner" ? "max-lg:pb-6" : ""
      } ${visible ? "block" : "hidden lg:block"}`}
    >
      <div className="bg-card border-2 border-fg rounded-lg p-3 sm:p-4 shadow-pop-soft sticky top-20">
        <div className="lg:hidden flex items-center justify-between pb-2 mb-2 border-b border-border">
          <button
            type="button"
            onClick={onBackToCatalog}
            className="text-xs font-bold text-accent flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>← Kembali ke Katalog Produk</span>
          </button>
          <span className="text-[11px] font-bold text-muted-fg">{cartTotalQty} item dipilih</span>
        </div>

        <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-border">
          <ShoppingCart className="w-5 h-5 text-accent" />
          <h3 className="font-heading font-bold text-base">Keranjang Belanja</h3>
          <span className="ml-auto text-sm font-bold text-accent">{cartTotalQty} item</span>
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={onOpenPendingList}
              className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-500 text-amber-900 dark:text-amber-200 text-[10px] font-bold hover:brightness-95 cursor-pointer flex items-center gap-1"
              title="Lihat antrean transaksi yang ditunda"
            >
              <Clock className="w-3 h-3" />
              <span>Pending ({pendingCount})</span>
            </button>
          )}
          {cart.length > 0 && (
            <button
              onClick={onOpenClearCart}
              className="text-[11px] font-bold text-red-500 hover:underline ml-1 cursor-pointer"
            >
              Kosongkan
            </button>
          )}
        </div>

        {/* Customer Selector */}
        <div className="mb-3 bg-muted p-2 rounded-sm border-2 border-border text-[12px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-muted-fg font-medium flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-accent" /> Pelanggan:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenAddCustomer}
                className="px-2 py-0.5 rounded bg-card hover:bg-muted border border-border text-[10px] font-bold text-accent flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                title="Tambah Pelanggan Baru Langsung di POS"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Pelanggan</span>
              </button>
              {selectedCustomerId !== "umum" && (
                <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Bisa Kas Bon
                </span>
              )}
            </div>
          </div>

          <select
            value={selectedCustomerId}
            onChange={(e) => onSelectCustomer(e.target.value)}
            className="w-full px-2 py-1.5 bg-card border-2 border-border rounded text-[12px] font-body outline-none focus:border-accent cursor-pointer"
          >
            <option value="umum">Pelanggan Umum (Tunai / QRIS)</option>
            {customers.map((cust) => {
              const piutang = Number(cust.total_piutang || 0);
              return (
                <option key={cust.id} value={cust.id}>
                  {cust.nama} {cust.telepon ? `(${cust.telepon})` : ""}{" "}
                  {piutang > 0 ? `• [Bon: Rp${piutang.toLocaleString("id-ID")}]` : ""}
                </option>
              );
            })}
          </select>

          {selectedCustomer && Number(selectedCustomer.total_piutang || 0) > 0 && (
            <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block">
                  Kas Bon Aktif:
                </span>
                <strong className="text-xs text-red-600 font-extrabold font-mono">
                  Rp{Number(selectedCustomer.total_piutang).toLocaleString("id-ID")}
                </strong>
              </div>
              <button
                type="button"
                onClick={onOpenPayDebt}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-xs"
                title="Pelunasan kas bon mandiri di meja kasir"
              >
                <HandCoins className="w-3.5 h-3.5" />
                <span>Bayar Bon</span>
              </button>
            </div>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex flex-col gap-2 mb-3 max-h-[380px] overflow-y-auto pr-0.5">
          {cart.map((c) => (
            <div key={c.cartItemId} className="flex items-center gap-2 p-2 rounded-md border-2 border-border bg-muted/60">
              <ProductImage
                src={c.product.foto_url}
                alt={c.product.nama}
                className="w-9 h-9 rounded border border-border"
                iconClassName="w-4 h-4"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[12px] font-semibold truncate">{c.product.nama}</span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-accent/15 text-accent border border-accent/30 uppercase">
                    {c.selectedUnit}{" "}
                    {c.multiplier > 1 ? `(${c.multiplier} ${c.product.satuan_dasar})` : ""}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-fg mt-0.5">
                  Rp{c.unitPrice.toLocaleString("id-ID")}{" "}
                  <span className="text-[10px] text-muted-fg font-normal">
                    × {c.qty} = Rp{c.subtotal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onUpdateCartQty(c.cartItemId, c.qty - 1)}
                  className="w-7 h-7 sm:w-6 sm:h-6 rounded-full border-2 border-fg bg-card flex items-center justify-center cursor-pointer hover:bg-tertiary"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-bold w-5 text-center">{c.qty}</span>
                <button
                  onClick={() => onUpdateCartQty(c.cartItemId, c.qty + 1)}
                  className="w-7 h-7 sm:w-6 sm:h-6 rounded-full border-2 border-fg bg-card flex items-center justify-center cursor-pointer hover:bg-tertiary"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onUpdateCartQty(c.cartItemId, 0)}
                  className="w-7 h-7 sm:w-6 sm:h-6 rounded-full border-2 border-fg bg-card flex items-center justify-center cursor-pointer hover:bg-red-100 ml-1 text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="text-center text-muted-fg text-sm py-8 border-2 border-dashed border-border rounded-md space-y-2 px-3">
              <div>Keranjang masih kosong.</div>
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={onOpenPendingList}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 border-fg bg-amber-400 text-slate-950 font-heading font-bold text-xs shadow-xs hover:bg-amber-300 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Ada {pendingCount} Transaksi Pending — Buka Daftar</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Total & Checkout */}
        <div className="pt-3 border-t-2 border-border">
          <div className="flex justify-between items-center mb-1 text-[12px] text-muted-fg">
            <span>Total Item:</span>
            <span className="font-bold text-fg">{cartTotalQty} item</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="font-heading font-bold text-base">Total Bayar:</span>
            <span className="font-heading font-extrabold text-xl text-accent">
              Rp{cartGrandTotal.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={cart.length === 0 || processingCheckout}
              onClick={onOpenHoldModal}
              className="py-3 px-3.5 text-xs font-bold shrink-0 border-2 border-fg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-900 dark:text-amber-200 cursor-pointer"
              title="Tunda transaksi ini sementara pembeli mengambil barang tambahan"
            >
              <PauseCircle className="w-4 h-4 mr-1" />
              Tunda
            </Button>

            <Button
              disabled={cart.length === 0 || processingCheckout}
              onClick={onOpenPayment}
              className="flex-1 py-3 text-[14px] justify-center"
            >
              {processingCheckout ? "Memproses..." : "Proses Pembayaran"}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
