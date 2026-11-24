"use client";

import { ProductImage } from "@/components/shared/product-image";
import type { AIKelas } from "@/types/api";
import { Edit2, FolderKanban, Image as ImageIcon, Plus, Scan, Search, Trash2 } from "lucide-react";

/** Filter pencarian/kuota dan grid kartu Master Kelas AI */
export function DatasetKelasGrid({
  filteredClasses,
  searchTerm,
  quotaFilter,
  onChangeSearch,
  onOpenSearchScanner,
  onChangeQuotaFilter,
  onOpenGallery,
  onOpenAddSamples,
  onOpenEditClass,
  onDeleteClass,
}: {
  filteredClasses: AIKelas[];
  searchTerm: string;
  quotaFilter: "all" | "low" | "medium" | "complete";
  onChangeSearch: (val: string) => void;
  onOpenSearchScanner: () => void;
  onChangeQuotaFilter: (val: "all" | "low" | "medium" | "complete") => void;
  onOpenGallery: (cls: AIKelas) => void;
  onOpenAddSamples: (cls: AIKelas) => void;
  onOpenEditClass: (cls: AIKelas) => void;
  onDeleteClass: (cls: AIKelas) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" />
            <input
              type="text"
              placeholder="Cari kelas nama / barcode / slug..."
              value={searchTerm}
              onChange={(e) => onChangeSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-md border-2 border-fg bg-card text-xs font-body focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onOpenSearchScanner}
            className="p-2 rounded-md border-2 border-fg bg-muted hover:bg-muted/80 text-fg shrink-0"
            title="Scan Barcode Kamera"
          >
            <Scan className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-fg text-[11px] font-bold mr-1">Kuota:</span>
          {(
            [
              { id: "all", label: "Semua", activeClass: "bg-accent text-accent-fg" },
              { id: "low", label: "< 50%", activeClass: "bg-amber-100 text-amber-800" },
              { id: "medium", label: "50-99%", activeClass: "bg-sky-100 text-sky-800" },
              { id: "complete", label: "≥ 100%", activeClass: "bg-lime-100 text-lime-800" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onChangeQuotaFilter(f.id)}
              className={`px-2.5 py-1 rounded border-2 border-fg text-[11px] font-bold ${
                quotaFilter === f.id ? f.activeClass : "bg-card text-muted-fg"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredClasses.map((cls) => {
          const currentTotal = cls.total_foto || cls.foto_terkumpul || 0;
          const target = cls.target_foto || 200;
          const pct = target > 0 ? Math.min(100, Math.round((currentTotal / target) * 100)) : 0;
          const hfCount = cls.jml_hf || cls.foto_tersinkron_hf || 0;
          const verifiedCount = cls.jml_terverifikasi || 0;

          return (
            <div
              key={cls.id}
              className="p-4 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-3 flex flex-col justify-between group hover:border-accent transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <ProductImage
                    src={cls.foto_url || cls.produk_master?.foto_url}
                    alt={cls.nama}
                    size="md"
                    className="rounded border-2 border-fg shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h5 className="font-heading font-bold text-xs truncate" title={cls.nama}>{cls.nama}</h5>
                    <p className="font-mono text-[10px] text-muted-fg truncate">{cls.kode_kelas || cls.nama_kelas || "—"}</p>
                    {cls.barcode && (
                      <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border inline-block mt-0.5">
                        {cls.barcode}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-fg">Koleksi Citra:</span>
                    <span className="font-mono font-bold">{currentTotal} / {target} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border">
                    <div
                      className={`h-full transition-all ${pct >= 100 ? "bg-lime-500" : pct >= 50 ? "bg-sky-500" : "bg-amber-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-lime-100 text-lime-800 border border-lime-300">SB: {verifiedCount}</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300">HF: {hfCount}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onOpenGallery(cls)}
                  className="px-2 py-1 rounded border-2 border-fg bg-muted hover:bg-muted/80 text-[11px] font-bold flex items-center gap-1"
                >
                  <ImageIcon className="w-3 h-3" /> Galeri
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onOpenAddSamples(cls)}
                    className="px-2 py-1 rounded border-2 border-fg bg-accent text-accent-fg text-[11px] font-bold hover:brightness-95 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenEditClass(cls)}
                    className="p-1 rounded border-2 border-fg bg-card hover:bg-muted text-muted-fg hover:text-fg"
                    title="Edit Target / Nama"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteClass(cls)}
                    className="p-1 rounded border-2 border-fg bg-card hover:bg-rose-50 text-rose-600"
                    title="Hapus Kelas"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredClasses.length === 0 && (
        <div className="p-8 text-center text-muted-fg border-2 border-dashed border-border rounded-lg space-y-2">
          <FolderKanban className="w-8 h-8 mx-auto text-muted-fg/60" />
          <p className="text-xs font-bold">Tidak ada kelas AI yang sesuai filter pencarian.</p>
        </div>
      )}
    </div>
  );
}
