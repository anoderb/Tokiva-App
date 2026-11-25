"use client";

import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
import { CheckCircle2, RefreshCw } from "lucide-react";

/** Sub-tab daftar produk toko yang belum memiliki mapping kelas AI */
export function DatasetUnmappedTab({
  unmappedProducts,
  loadingUnmapped,
  onRefresh,
  onSelectMapping,
}: {
  unmappedProducts: any[];
  loadingUnmapped: boolean;
  onRefresh: () => void;
  onSelectMapping: (product: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-fg">
          Produk berikut ada di katalog toko namun belum memiliki mapping kelas AI untuk visual recognition POS.
        </p>
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={loadingUnmapped}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingUnmapped ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {unmappedProducts.length > 0 ? (
        <div className="border-2 border-fg rounded-lg overflow-hidden bg-card">
          <div className="md:hidden px-3 py-1.5 bg-muted/50 border-b border-border text-[10px] font-semibold text-muted-fg flex items-center justify-between">
            <span>Geser tabel ke samping untuk melihat seluruh kolom</span>
            <span>↔</span>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-muted border-b-2 border-border font-bold uppercase text-[10px] text-muted-fg">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Produk</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Barcode</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Kategori</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Harga Jual</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Aksi Mapping</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border">
                {unmappedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-semibold flex items-center gap-2 whitespace-nowrap">
                      <ProductImage src={p.foto_url} alt={p.nama} size="sm" className="rounded border shrink-0" />
                      <span>{p.nama}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">{p.barcode || "—"}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{p.kategori?.nama || "Umum"}</td>
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">Rp {(p.harga_jual || 0).toLocaleString("id-ID")}</td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="admin" onClick={() => onSelectMapping(p)} className="text-[11px] font-bold py-1 px-2.5">
                        Petakan ke AI
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-muted-fg border-2 border-dashed border-border rounded-lg space-y-2">
          <CheckCircle2 className="w-8 h-8 mx-auto text-lime-600" />
          <p className="text-xs font-bold">Semua produk katalog toko telah terpetakan ke kelas AI!</p>
        </div>
      )}
    </div>
  );
}
