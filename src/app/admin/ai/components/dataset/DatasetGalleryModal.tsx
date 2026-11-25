"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProductImage } from "@/components/shared/product-image";
import type { AIKelas, AISampel } from "@/types/api";
import { Check, ChevronLeft, ChevronRight, CloudUpload, Maximize2, RefreshCw, Trash2 } from "lucide-react";

/** Modal galeri sampel foto per kelas AI beserta kurasi batch & lightbox preview */
export function DatasetGalleryModal({
  open,
  galleryClass,
  galleryPhotos,
  loadingGallery,
  galleryFilter,
  galleryPage,
  galleryPageSize,
  galleryTotal,
  galleryTotalPages,
  selectedPhotoIds,
  submitting,
  isSyncingHf,
  lightboxPhoto,
  onClose,
  onCloseLightbox,
  onOpenLightbox,
  onChangeFilter,
  onChangePageSize,
  onChangePage,
  onToggleSelectAll,
  onToggleSelectOne,
  onVerifyBatch,
  onDeleteBatch,
  onSyncClass,
}: {
  open: boolean;
  galleryClass: AIKelas | null;
  galleryPhotos: AISampel[];
  loadingGallery: boolean;
  galleryFilter: "semua" | "supabase" | "huggingface";
  galleryPage: number;
  galleryPageSize: number;
  galleryTotal: number;
  galleryTotalPages: number;
  selectedPhotoIds: string[];
  submitting: boolean;
  isSyncingHf: boolean;
  lightboxPhoto: AISampel | null;
  onClose: () => void;
  onCloseLightbox: () => void;
  onOpenLightbox: (photo: AISampel) => void;
  onChangeFilter: (filter: "semua" | "supabase" | "huggingface") => void;
  onChangePageSize: (size: number) => void;
  onChangePage: (page: number) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectOne: (id: string, checked: boolean) => void;
  onVerifyBatch: () => void;
  onDeleteBatch: () => void;
  onSyncClass: (kelasId: string) => void;
}) {
  const sbCount =
    (galleryClass as any)?.jml_supabase ??
    Math.max(0, (galleryClass?.total_foto || 0) - (galleryClass?.jml_hf ?? galleryClass?.foto_tersinkron_hf ?? 0));
  const hfCount = galleryClass?.jml_hf ?? galleryClass?.foto_tersinkron_hf ?? 0;

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Galeri Sampel Citra: ${galleryClass?.nama || ""}`} className="max-w-4xl">
        <div className="space-y-4 text-xs font-body">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded border-2 border-fg bg-muted/20">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-muted-fg">Filter Lokasi:</span>
              <button
                type="button"
                onClick={() => onChangeFilter("semua")}
                className={`px-2 py-0.5 rounded border text-[11px] font-bold ${galleryFilter === "semua" ? "bg-admin text-white border-fg" : "bg-card text-muted-fg"}`}
              >
                Semua ({galleryClass?.total_foto ?? galleryTotal})
              </button>
              <button
                type="button"
                onClick={() => onChangeFilter("supabase")}
                className={`px-2 py-0.5 rounded border text-[11px] font-bold ${galleryFilter === "supabase" ? "bg-lime-100 text-lime-800 border-lime-300" : "bg-card text-muted-fg"}`}
              >
                Supabase ({sbCount})
              </button>
              <button
                type="button"
                onClick={() => onChangeFilter("huggingface")}
                className={`px-2 py-0.5 rounded border text-[11px] font-bold ${galleryFilter === "huggingface" ? "bg-sky-100 text-sky-800 border-sky-300" : "bg-card text-muted-fg"}`}
              >
                🤗 Hugging Face ({hfCount})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <label className="flex items-center gap-1 text-[11px] font-bold cursor-pointer mr-2">
                <input
                  type="checkbox"
                  checked={galleryPhotos.length > 0 && selectedPhotoIds.length === galleryPhotos.length}
                  onChange={(e) => onToggleSelectAll(e.target.checked)}
                  className="rounded border-fg"
                />
                Pilih Halaman ({galleryPhotos.length})
              </label>

              {selectedPhotoIds.length > 0 && (
                <>
                  <Button size="sm" variant="outline" onClick={onVerifyBatch} disabled={submitting} className="text-[11px] py-0.5 px-2 font-bold">
                    <Check className="w-3 h-3 mr-1" /> Verifikasi ({selectedPhotoIds.length})
                  </Button>
                  <Button size="sm" onClick={onDeleteBatch} disabled={submitting} className="text-[11px] py-0.5 px-2 bg-rose-600 hover:bg-rose-700 text-white font-bold">
                    <Trash2 className="w-3 h-3 mr-1" /> Hapus ({selectedPhotoIds.length})
                  </Button>
                </>
              )}

              {galleryClass && (
                <Button size="sm" variant="outline" onClick={() => onSyncClass(galleryClass.id)} disabled={isSyncingHf} className="text-[11px] py-0.5 px-2 font-bold">
                  <CloudUpload className="w-3 h-3 mr-1" /> Sync Kelas ke HF
                </Button>
              )}
            </div>
          </div>

          {loadingGallery ? (
            <div className="p-12 text-center text-muted-fg space-y-2">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin" />
              <p>Memuat sampel foto dataset...</p>
            </div>
          ) : galleryPhotos.length > 0 ? (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[50vh] overflow-y-auto p-1">
                {galleryPhotos.map((photo) => {
                  const isSelected = selectedPhotoIds.includes(photo.id);
                  const isHf = photo.tersinkron_hf || photo.lokasi_simpan === "huggingface";
                  return (
                    <div
                      key={photo.id}
                      className={`relative aspect-square rounded-md border-2 overflow-hidden group cursor-pointer transition-all ${
                        isSelected ? "border-admin ring-2 ring-admin" : "border-fg hover:border-admin"
                      }`}
                    >
                      <ProductImage src={photo.foto_url} alt={photo.nama_file} className="w-full h-full object-cover" />
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          e.stopPropagation();
                          onToggleSelectOne(photo.id, e.target.checked);
                        }}
                        className="absolute top-1 left-1 rounded border-fg z-10"
                      />
                      <span className={`absolute bottom-1 right-1 px-1 py-0.2 rounded text-white text-[9px] font-mono ${isHf ? "bg-sky-700/90" : "bg-black/70"}`}>
                        {isHf ? "HF" : "SB"}
                      </span>
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white" onClick={() => onOpenLightbox(photo)}>
                        <Maximize2 className="w-4 h-4 drop-shadow" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border">
                <div className="text-[11px] font-mono text-muted-fg">
                  Menampilkan <strong className="text-fg">{(galleryPage - 1) * galleryPageSize + 1}</strong>–
                  <strong className="text-fg">{Math.min(galleryPage * galleryPageSize, galleryTotal)}</strong> dari{" "}
                  <strong className="text-fg">{galleryTotal}</strong> foto
                  {galleryFilter !== "semua" ? ` (filter: ${galleryFilter})` : ""}
                </div>

                <div className="flex items-center gap-2">
                  <select value={galleryPageSize} onChange={(e) => onChangePageSize(Number(e.target.value) || 36)} className="px-2 py-1 rounded border-2 border-fg bg-card text-[11px] font-bold">
                    <option value={24}>24 / hal</option>
                    <option value={36}>36 / hal</option>
                    <option value={60}>60 / hal</option>
                    <option value={120}>120 / hal</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <Button type="button" size="sm" variant="outline" disabled={galleryPage <= 1 || loadingGallery} onClick={() => onChangePage(galleryPage - 1)} className="px-2 py-1 text-xs font-bold">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="px-2.5 py-1 rounded border-2 border-fg bg-muted font-mono font-bold text-[11px]">
                      Hal {galleryPage} / {galleryTotalPages}
                    </span>
                    <Button type="button" size="sm" variant="outline" disabled={galleryPage >= galleryTotalPages || loadingGallery} onClick={() => onChangePage(galleryPage + 1)} className="px-2 py-1 text-xs font-bold">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-muted-fg border-2 border-dashed border-border rounded-lg">
              {galleryFilter === "semua" ? "Belum ada foto tersimpan untuk kelas ini." : `Tidak ada foto dengan lokasi simpan "${galleryFilter}" pada kelas ini.`}
            </div>
          )}
        </div>
      </Modal>

      {lightboxPhoto && (
        <Modal open={!!lightboxPhoto} onClose={onCloseLightbox} title={lightboxPhoto.nama_file} className="max-w-xl">
          <div className="space-y-3">
            <div className="relative aspect-square max-h-[60vh] rounded-md border-2 border-fg overflow-hidden flex items-center justify-center bg-black">
              <ProductImage src={lightboxPhoto.foto_url} alt={lightboxPhoto.nama_file} className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-fg font-mono">
              <span>Sudut: {lightboxPhoto.sudut_ambil || lightboxPhoto.sudut || "Umum"}</span>
              <span>Status: {lightboxPhoto.tersinkron_hf || lightboxPhoto.lokasi_simpan === "huggingface" ? "Tersinkron HF" : "Supabase Storage"}</span>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
