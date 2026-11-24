import type { AIKelas, Produk, ProdukSatuan } from "@/types/api";

export interface AiDetectionCandidate {
  product: Produk;
  confidence: number;
  classLabel: string;
  kelasId?: string;
}

export interface SessionScanItem {
  cartItemId: string;
  product: Produk;
  unit: ProdukSatuan | "base";
  unitName: string;
  unitPrice: number;
  qty: number;
  confidence: number;
  classLabel: string;
  kelasId?: string;
  snapshot?: string | null;
  scannedAt: Date;
}

export interface AiVisionModalProps {
  open: boolean;
  onClose: () => void;
  products: Produk[];
  onSelectProduct: (
    product: Produk,
    selectedUnit?: ProdukSatuan | "base",
    metodeInput?: "ai_kamera"
  ) => void;
  onUpdateCartQty?: (cartItemId: string, newQty: number) => void;
  cart?: any[];
}

export const COOLDOWN_SAME_ITEM_MS = 1800;
