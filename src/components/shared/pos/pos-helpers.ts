import type { ReceiptData } from "@/components/shared/thermal-receipt-modal";
import type { Pelanggan, Produk, Toko } from "@/types/api";
import type { CartItem, PaymentMethod, PendingCartOrder } from "./pos-types";

/** Membaca daftar keranjang pending dari localStorage per toko. */
export function loadPendingOrders(storageKey: string): PendingCartOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Menyimpan daftar keranjang pending ke localStorage secara aman. */
export function savePendingOrders(storageKey: string, orders: PendingCartOrder[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(orders));
  } catch {
    // Abaikan kuota penyimpanan penuh
  }
}

/** Menghitung total stok fisik (satuan dasar) yang sudah masuk ke keranjang untuk suatu produk. */
export function getCommittedPhysicalStock(
  cart: CartItem[],
  productId: string,
  excludeCartItemId?: string
): number {
  return cart
    .filter((c) => c.product.id === productId && c.cartItemId !== excludeCartItemId)
    .reduce((sum, item) => sum + item.qty * item.multiplier, 0);
}

/** Menggabungkan item order pending ke keranjang aktif dengan validasi total stok fisik lintas satuan. */
export function mergeCartOrders(
  activeCart: CartItem[],
  incomingItems: CartItem[]
): { merged: CartItem[] | null; overflowError?: string } {
  const merged = [...activeCart];
  for (const inc of incomingItems) {
    const idx = merged.findIndex((c) => c.cartItemId === inc.cartItemId);
    if (idx > -1) {
      const nextQty = merged[idx].qty + inc.qty;
      merged[idx] = { ...merged[idx], qty: nextQty, subtotal: nextQty * merged[idx].unitPrice };
    } else {
      merged.push(inc);
    }
  }

  const physicalTotals = new Map<string, { qtyBase: number; product: Produk }>();
  for (const item of merged) {
    const prev = physicalTotals.get(item.product.id);
    physicalTotals.set(item.product.id, {
      qtyBase: (prev?.qtyBase || 0) + item.qty * item.multiplier,
      product: item.product,
    });
  }

  for (const { qtyBase, product } of physicalTotals.values()) {
    const maxStock = Number(product.stok || 0);
    if (qtyBase > maxStock) {
      return {
        merged: null,
        overflowError: `Gagal gabung antrean: total "${product.nama}" (${qtyBase} ${product.satuan_dasar}) melebihi stok tersedia (${maxStock} ${product.satuan_dasar}).`,
      };
    }
  }

  return { merged };
}

/** Membentuk data struk pelunasan kas bon mandiri. */
export function buildDebtReceiptData(params: {
  customer: Pelanggan;
  amount: number;
  method: "tunai" | "qris";
  remainingDebt: number;
  cashierName: string;
  toko: Toko | null;
  fallbackStoreName: string;
}): ReceiptData {
  const { customer, amount, method, remainingDebt, cashierName, toko, fallbackStoreName } = params;
  const now = new Date();
  return {
    id: `BON-${Date.now().toString().slice(-6)}`,
    date: now.toLocaleDateString("id-ID"),
    time: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    cashier: cashierName,
    storeName: toko?.nama || fallbackStoreName,
    storeAddress: toko?.alamat || undefined,
    storePhone: toko?.telepon || undefined,
    customer: customer.nama,
    items: [
      {
        name: "Pelunasan / Cicilan Kas Bon",
        qty: 1,
        unit: "transaksi",
        price: amount,
        subtotal: amount,
      },
    ],
    subtotal: amount,
    total: amount,
    method: method === "tunai" ? "Tunai" : "QRIS",
    debtPaid: amount,
    debtRemaining: remainingDebt,
    cashReceived: method === "tunai" ? amount : undefined,
    change: 0,
  };
}

/** Membentuk data struk checkout POS utama dari respons backend & state pembayaran. */
export function buildCheckoutReceiptData(params: {
  createdTx: any;
  cart: CartItem[];
  cartTotalQty: number;
  cartSubtotal: number;
  discountAmount: number;
  cartGrandTotal: number;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  splitCashAmount: number;
  debtDownPayment: number;
  allocateDebtPayment: boolean;
  debtAllocatedAmount: number;
  qrRefId: string;
  selectedCustomer: Pelanggan | null;
  cashierName: string;
  toko: Toko | null;
  fallbackStoreName: string;
}): ReceiptData {
  const {
    createdTx,
    cart,
    cartTotalQty,
    cartSubtotal,
    discountAmount,
    cartGrandTotal,
    paymentMethod,
    cashReceived,
    splitCashAmount,
    debtDownPayment,
    allocateDebtPayment,
    debtAllocatedAmount,
    qrRefId,
    selectedCustomer,
    cashierName,
    toko,
    fallbackStoreName,
  } = params;

  const txHeader = createdTx?.transaksi || createdTx;
  const txNumber =
    txHeader?.no_transaksi ||
    txHeader?.nomor_faktur ||
    txHeader?.id ||
    `INV-${Date.now().toString().slice(-6)}`;
  const txDate = new Date(txHeader?.tgl_transaksi || txHeader?.dibuat_pada || Date.now());

  return {
    id: txNumber,
    date: txDate.toLocaleDateString("id-ID"),
    time: txDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    cashier: cashierName,
    storeName: toko?.nama || fallbackStoreName,
    storeAddress: toko?.alamat || undefined,
    storePhone: toko?.telepon || undefined,
    customer: selectedCustomer?.nama || "Pelanggan Umum",
    items: cart.map((c) => ({
      name: c.product.nama,
      qty: c.qty,
      unit: c.selectedUnit,
      price: c.unitPrice,
      subtotal: c.subtotal,
    })),
    totalQty: cartTotalQty,
    subtotal: cartSubtotal,
    discount: discountAmount,
    total: cartGrandTotal,
    method:
      paymentMethod === "cash"
        ? "Tunai"
        : paymentMethod === "qris"
        ? "QRIS"
        : paymentMethod === "split"
        ? "Split (Tunai + QRIS)"
        : "Kas Bon (Piutang)",
    cashReceived: paymentMethod === "cash" ? cashReceived : undefined,
    debtPaid: allocateDebtPayment && debtAllocatedAmount > 0 ? debtAllocatedAmount : undefined,
    change:
      paymentMethod === "cash"
        ? Math.max(0, cashReceived - (cartGrandTotal + (allocateDebtPayment ? debtAllocatedAmount : 0)))
        : undefined,
    splitCash: paymentMethod === "split" ? splitCashAmount : undefined,
    splitNonCash: paymentMethod === "split" ? cartGrandTotal - splitCashAmount : undefined,
    qrisRef: paymentMethod === "qris" || paymentMethod === "split" ? qrRefId : undefined,
    debtRemaining:
      paymentMethod === "debt"
        ? Math.max(0, cartGrandTotal - debtDownPayment)
        : allocateDebtPayment && debtAllocatedAmount > 0 && selectedCustomer
        ? Math.max(0, Number(selectedCustomer.total_piutang || 0) - debtAllocatedAmount)
        : selectedCustomer && Number(selectedCustomer.total_piutang || 0) > 0
        ? Number(selectedCustomer.total_piutang)
        : undefined,
  };
}
