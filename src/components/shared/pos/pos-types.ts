import type { Produk } from "@/types/api";

export type PosMode = "kasir" | "owner";
export type PaymentMethod = "cash" | "qris" | "split" | "debt";

export interface CartItem {
  cartItemId: string;
  product: Produk;
  qty: number;
  selectedUnit: string;
  multiplier: number;
  unitPrice: number;
  subtotal: number;
  metodeInput: "manual" | "barcode" | "ai_kamera";
}

export interface PendingCartOrder {
  id: string;
  label: string;
  customerId: string;
  customerName: string;
  items: CartItem[];
  totalQty: number;
  subtotal: number;
  createdAt: string;
  cashierName: string;
}
