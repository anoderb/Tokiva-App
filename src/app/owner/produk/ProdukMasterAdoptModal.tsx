"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProductImage } from "@/components/shared/product-image";
import { formatRupiah } from "@/lib/format";
import type { ProdukMaster } from "@/types/api";

/** Modal adopsi cepat produk dari Katalog Master Global ke toko owner */
export function ProdukMasterAdoptModal({
  open,
  masterSearch,
  masterCatalog,
  onClose,
  onChangeSearch,
  onSearch,
  onAdopt,
}: {
  open: boolean;
  masterSearch: string;
  masterCatalog: ProdukMaster[];
  onClose: () => void;
  onChangeSearch: (q: string) => void;
  onSearch: () => void;
  onAdopt: (m: ProdukMaster) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Adopsi Produk dari Katalog Master Global" className="max-w-xl">
      <div className="space-y-3 text-xs">
        <div className="flex gap-2">
          <input
            value={masterSearch}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="Cari nama atau barcode produk master..."
            className="flex-1 px-3 py-2 border-2 border-border rounded bg-card"
          />
          <Button size="sm" onClick={onSearch}>Cari</Button>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border border border-border rounded">
          {masterCatalog.map((m) => (
            <div key={m.id} className="p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <ProductImage src={m.foto_url} alt={m.nama} className="w-10 h-10 rounded border border-border" />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{m.nama}</div>
                  <div className="text-[10px] text-muted-fg font-mono">
                    {m.barcode || "-"} · Harga Saran: {formatRupiah(m.harga_saran)}/{m.satuan_dasar}
                  </div>
                </div>
              </div>
              <Button size="sm" onClick={() => onAdopt(m)}>Adopsi</Button>
            </div>
          ))}
          {masterCatalog.length === 0 && (
            <div className="p-6 text-center text-muted-fg">Tidak ada produk master ditemukan.</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
