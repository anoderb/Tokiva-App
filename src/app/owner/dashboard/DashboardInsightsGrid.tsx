"use client";

import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/shared/product-image";
import type { DashboardOwnerData } from "@/lib/services/laporan.service";
import { formatNumber, formatRupiah } from "@/lib/format";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

/** Panel wawasan operasional: Produk Terlaris (7H) & Peringatan Stok Menipis */
export function DashboardInsightsGrid({
  loading,
  topProducts,
  lowStocks,
  maxTopProductOmzet,
}: {
  loading: boolean;
  topProducts: DashboardOwnerData["produk_terlaris"];
  lowStocks: DashboardOwnerData["inventaris"]["produk_stok_menipis"];
  maxTopProductOmzet: number;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <SectionCard
        title="Produk Terlaris (7 Hari)"
        desc="Kontribusi produk dengan nilai penjualan tertinggi di toko."
        customAction={
          <Link href="/owner/laporan" className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1">
            Lihat Laporan <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {loading ? (
          <div className="py-10 text-center text-xs text-muted-fg">Memuat data...</div>
        ) : topProducts.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-fg">Belum ada data produk terjual dalam 7 hari terakhir.</div>
        ) : (
          <div className="space-y-2.5">
            {topProducts.map((p, idx) => {
              const widthPct = Math.max(8, Math.round((Number(p.total_omzet || 0) / maxTopProductOmzet) * 100));
              const rankBadgeClass =
                idx === 0 ? "bg-amber-300 text-slate-900" : idx === 1 ? "bg-slate-200 text-slate-900" : idx === 2 ? "bg-orange-200 text-slate-900" : "bg-muted text-fg";

              return (
                <div key={p.produk_id || idx} className="p-3 rounded-md border-2 border-border bg-card hover:border-fg transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-full border border-fg flex items-center justify-center font-heading font-bold text-xs shrink-0 ${rankBadgeClass}`}>
                        {idx + 1}
                      </div>
                      <ProductImage src={p.foto_url} alt={p.nama_produk} className="w-9 h-9 rounded border border-border shrink-0" iconClassName="w-4 h-4" />
                      <div className="min-w-0">
                        <div className="font-semibold text-xs truncate">{p.nama_produk}</div>
                        <div className="text-[11px] text-muted-fg">{formatNumber(p.total_qty)} {p.satuan_dasar || "unit"} terjual</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <strong className="text-xs font-bold text-accent">{formatRupiah(p.total_omzet)}</strong>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden border border-border">
                    <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Peringatan Stok Menipis"
        desc="Produk yang telah menyentuh atau berada di bawah batas stok minimum."
        customAction={
          <Link href="/owner/persediaan" className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1">
            Kelola Stok <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {loading ? (
          <div className="py-10 text-center text-xs text-muted-fg">Memuat data...</div>
        ) : lowStocks.length === 0 ? (
          <div className="py-10 px-4 text-center rounded-md border-2 border-dashed border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Seluruh Stok Produk Aman</div>
            <p className="text-[11px] text-muted-fg mt-0.5">Tidak ada produk aktif yang berada di bawah batas minimum stok.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {lowStocks.slice(0, 5).map((item) => {
              const minStock = Math.max(1, Number(item.stok_min ?? 10));
              const currentStock = Math.max(0, Number(item.stok || 0));
              const ratioPct = Math.min(100, Math.round((currentStock / minStock) * 100));
              const isOut = Number(item.stok || 0) <= 0;

              return (
                <div key={item.id} className="p-3 rounded-md border-2 border-border bg-card hover:border-fg transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProductImage src={item.foto_url} alt={item.nama} className="w-9 h-9 rounded border border-border shrink-0" iconClassName="w-4 h-4" />
                      <div className="min-w-0">
                        <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                          <span className="truncate">{item.nama}</span>
                          {isOut && <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                        </div>
                        <div className="text-[11px] text-muted-fg">Batas minimum: {minStock} {item.satuan_dasar}</div>
                      </div>
                    </div>
                    <Badge variant={isOut ? "red" : "yellow"}>{isOut ? "Stok Habis" : `Sisa: ${item.stok} ${item.satuan_dasar}`}</Badge>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden border border-border">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isOut ? "bg-red-500" : "bg-amber-500"}`}
                      style={{ width: `${isOut ? 100 : Math.max(10, ratioPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {lowStocks.length > 5 && (
              <div className="pt-1 text-center">
                <Link href="/owner/persediaan" className="text-xs font-semibold text-muted-fg hover:text-accent">
                  +{lowStocks.length - 5} produk lainnya perlu restock →
                </Link>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
