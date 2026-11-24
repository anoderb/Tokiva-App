"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Modal } from "@/components/ui/modal";
import { ProductImage } from "@/components/shared/product-image";
import { useToast } from "@/components/ui/toast";
import {
  CheckSquare,
  Check,
  Tag,
  Trash2,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { aiService } from "@/lib/services/ai.service";
import type { AIKelas, AISampel } from "@/types/api";

interface TabValidasiKurasiProps {
  kelasList: AIKelas[];
  sampelList: AISampel[];
  totalSampel: number;
  onRefresh: () => void;
}

export function TabValidasiKurasi({
  kelasList,
  sampelList: initialSampelList,
  totalSampel: initialTotal,
  onRefresh,
}: TabValidasiKurasiProps) {
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<"semua" | "menunggu" | "terverifikasi">(
    "menunggu"
  );
  const [sourceFilter, setSourceFilter] = useState<"semua" | "owner" | "kasir" | "admin">(
    "semua"
  );
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  const [items, setItems] = useState<AISampel[]>(initialSampelList || []);
  const [totalItems, setTotalItems] = useState<number>(initialTotal || 0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loadingList, setLoadingList] = useState<boolean>(false);

  const [selectedSampelIds, setSelectedSampelIds] = useState<string[]>([]);

  // Modal Ubah Kelas
  const [changeClassModalOpen, setChangeClassModalOpen] = useState(false);
  const [targetNewClassId, setTargetNewClassId] = useState<string>("");
  const [targetSampelForChange, setTargetSampelForChange] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const fetchSamplesPage = useCallback(
    async (
      targetPage: number,
      targetLimit: number,
      targetStatus: "semua" | "menunggu" | "terverifikasi",
      targetSource: "semua" | "owner" | "kasir" | "admin",
      targetClassId: string
    ) => {
      setLoadingList(true);
      try {
        const res = await aiService.getSampelList(
          {
            status:
              targetStatus === "menunggu"
                ? "menunggu"
                : targetStatus === "terverifikasi"
                ? "diterima"
                : undefined,
            sumber: targetSource === "semua" ? undefined : targetSource,
            kelas_id: targetClassId || undefined,
            page: targetPage,
            limit: targetLimit,
          },
          "admin"
        );
        const fetched = res.items || [];
        const total = res.pagination?.total ?? res.meta?.total ?? fetched.length;
        const pages =
          res.pagination?.total_pages ??
          res.meta?.totalPages ??
          Math.max(1, Math.ceil(total / targetLimit));

        setItems(fetched);
        setTotalItems(total);
        setTotalPages(Math.max(1, pages));
        setSelectedSampelIds([]);
      } catch {
        setItems([]);
      } finally {
        setLoadingList(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchSamplesPage(page, pageSize, statusFilter, sourceFilter, selectedClassId);
  }, [page, pageSize, statusFilter, sourceFilter, selectedClassId, fetchSamplesPage]);

  // Batch Verify
  const handleVerify = async (ids: string[]) => {
    if (ids.length === 0) return;
    setSubmitting(true);
    try {
      await aiService.verifikasiSampel({ sampel_ids: ids, status: "diterima" }, "admin");
      toast.success(`${ids.length} sampel berhasil diverifikasi masuk dataset!`);
      setSelectedSampelIds((prev) => prev.filter((id) => !ids.includes(id)));
      await fetchSamplesPage(page, pageSize, statusFilter, sourceFilter, selectedClassId);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal memverifikasi sampel");
    } finally {
      setSubmitting(false);
    }
  };

  // Batch Delete
  const handleDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    setPendingDeleteIds(ids);
  };

  const executeDeleteSamples = async () => {
    const ids = pendingDeleteIds || [];
    if (ids.length === 0) return;

    setSubmitting(true);
    try {
      await aiService.deleteSampelBatch(ids, "admin");
      toast.success(`${ids.length} sampel berhasil dihapus!`);
      setSelectedSampelIds((prev) => prev.filter((id) => !ids.includes(id)));
      setPendingDeleteIds(null);
      await fetchSamplesPage(page, pageSize, statusFilter, sourceFilter, selectedClassId);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menghapus sampel");
    } finally {
      setSubmitting(false);
    }
  };

  // Change Class
  const handleChangeClassSubmit = async () => {
    if (!targetNewClassId || targetSampelForChange.length === 0) return;
    setSubmitting(true);
    try {
      await aiService.ubahKelasSampel(targetSampelForChange, targetNewClassId, "admin");
      toast.success(`${targetSampelForChange.length} sampel berhasil dipindahkan ke kelas baru!`);
      setChangeClassModalOpen(false);
      setSelectedSampelIds([]);
      await fetchSamplesPage(page, pageSize, statusFilter, sourceFilter, selectedClassId);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengubah kelas sampel");
    } finally {
      setSubmitting(false);
    }
  };

  const startItem = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-4 sm:p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-accent" />
            <h4 className="font-heading font-bold text-base">
              Inbox Validasi Kualitas &amp; Kurasi Sampel Masuk
            </h4>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchSamplesPage(page, pageSize, statusFilter, sourceFilter, selectedClassId)}
            disabled={loadingList}
            className="text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingList ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
        <p className="text-xs text-muted-fg">
          Pusat pemeriksaan sampel foto kiriman <strong>Owner saat tambah produk baru</strong> atau draf unggahan sebelum disinkronkan ke Hugging Face Hub.
        </p>
      </div>

      {/* Filter and Action Bar */}
      <div className="p-3 rounded-lg border-2 border-fg bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded border border-border">
            <span className="text-[10px] font-bold text-muted-fg uppercase px-1">Status:</span>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("menunggu");
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                statusFilter === "menunggu" ? "bg-accent text-accent-fg" : "text-muted-fg hover:text-fg"
              }`}
            >
              Menunggu Kurasi
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("terverifikasi");
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                statusFilter === "terverifikasi"
                  ? "bg-lime-200 text-lime-900"
                  : "text-muted-fg hover:text-fg"
              }`}
            >
              Terverifikasi
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("semua");
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                statusFilter === "semua" ? "bg-accent text-accent-fg" : "text-muted-fg hover:text-fg"
              }`}
            >
              Semua
            </button>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded border border-border">
            <span className="text-[10px] font-bold text-muted-fg uppercase px-1">Sumber:</span>
            <button
              type="button"
              onClick={() => {
                setSourceFilter("semua");
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                sourceFilter === "semua" ? "bg-accent text-accent-fg" : "text-muted-fg hover:text-fg"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceFilter("owner");
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                sourceFilter === "owner"
                  ? "bg-purple-200 text-purple-900 border border-purple-400"
                  : "text-muted-fg hover:text-fg"
              }`}
            >
              Owner Toko (Produk Baru)
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceFilter("kasir");
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                sourceFilter === "kasir"
                  ? "bg-amber-200 text-amber-900"
                  : "text-muted-fg hover:text-fg"
              }`}
            >
              Koreksi Kasir POS
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceFilter("admin");
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                sourceFilter === "admin"
                  ? "bg-sky-200 text-sky-900"
                  : "text-muted-fg hover:text-fg"
              }`}
            >
              Kamera / Admin
            </button>
          </div>

          {/* Class Filter */}
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1 rounded border-2 border-fg bg-card text-[11px] font-bold focus:outline-none"
          >
            <option value="">Semua Kelas AI ({kelasList.length})</option>
            {kelasList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.nama}
              </option>
            ))}
          </select>
        </div>

        {/* Batch Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <label className="flex items-center gap-1.5 font-bold cursor-pointer text-[11px]">
            <input
              type="checkbox"
              checked={items.length > 0 && selectedSampelIds.length === items.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedSampelIds(items.map((s) => s.id));
                } else {
                  setSelectedSampelIds([]);
                }
              }}
              className="rounded border-fg"
            />
            Pilih Halaman ({items.length})
          </label>

          {selectedSampelIds.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                onClick={() => handleVerify(selectedSampelIds)}
                disabled={submitting}
                className="text-[11px] py-1 px-2.5 font-bold bg-lime-600 hover:bg-lime-700 text-white"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Terima ({selectedSampelIds.length})
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTargetSampelForChange(selectedSampelIds);
                  setTargetNewClassId(kelasList[0]?.id || "");
                  setChangeClassModalOpen(true);
                }}
                disabled={submitting}
                className="text-[11px] py-1 px-2.5 font-bold"
              >
                <Tag className="w-3.5 h-3.5 mr-1" /> Ubah Kelas
              </Button>

              <Button
                size="sm"
                onClick={() => handleDelete(selectedSampelIds)}
                disabled={submitting}
                className="text-[11px] py-1 px-2.5 font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Tolak &amp; Hapus
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Curation Grid */}
      {loadingList && items.length === 0 ? (
        <div className="p-12 text-center text-muted-fg space-y-2 border-2 border-border rounded-lg">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin" />
          <p className="text-xs">Memuat sampel untuk dikurasi...</p>
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {items.map((s) => {
              const isSelected = selectedSampelIds.includes(s.id);
              const isKasir = s.sumber === "koreksi_kasir" || s.sumber === "kasir";
              const isOwner =
                s.sumber === "owner_produk" || s.sumber === "owner_studio" || s.sumber === "owner";
              const isVerified = s.terverifikasi || s.status === "diterima";
              const isHf = s.tersinkron_hf || s.lokasi_simpan === "huggingface";

              return (
                <div
                  key={s.id}
                  className={`p-2.5 rounded-lg border-2 bg-card space-y-2 flex flex-col justify-between transition-all ${
                    isSelected ? "border-accent ring-2 ring-accent shadow-pop-soft" : "border-fg hover:border-accent"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="relative aspect-square rounded overflow-hidden border border-border bg-black/10">
                      <ProductImage
                        src={s.foto_url}
                        alt={s.nama_file}
                        className="w-full h-full object-cover"
                      />

                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedSampelIds((prev) => [...prev, s.id]);
                          } else {
                            setSelectedSampelIds((prev) => prev.filter((id) => id !== s.id));
                          }
                        }}
                        className="absolute top-1.5 left-1.5 rounded border-fg z-10"
                      />

                      <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 items-end">
                        {isOwner && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500 text-white font-bold text-[9px] shadow-sm">
                            Owner Toko
                          </span>
                        )}
                        {isKasir && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[9px]">
                            Koreksi Kasir
                          </span>
                        )}
                        {isVerified ? (
                          <span className="px-1.5 py-0.5 rounded bg-lime-500 text-white font-bold text-[9px]">
                            ✓ Valid
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold text-[9px]">
                            Menunggu
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h6
                        className="font-heading font-bold text-xs truncate"
                        title={s.kelas?.nama || "Kelas"}
                      >
                        {s.kelas?.nama || "Kelas AI"}
                      </h6>
                      <div className="flex items-center justify-between text-[10px] text-muted-fg font-mono">
                        <span>Sudut: {s.sudut_ambil || s.sudut || "Umum"}</span>
                        <span>{isHf ? "🤗 HF" : "🗄️ SB"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between gap-1">
                    {!isVerified ? (
                      <button
                        type="button"
                        onClick={() => handleVerify([s.id])}
                        className="flex-1 py-1 px-1 rounded bg-lime-100 hover:bg-lime-200 text-lime-900 border border-lime-300 font-bold text-[10px] flex items-center justify-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Terima
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-lime-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setTargetSampelForChange([s.id]);
                        setTargetNewClassId(s.kelas_id);
                        setChangeClassModalOpen(true);
                      }}
                      className="p-1 rounded border border-border hover:bg-muted text-muted-fg"
                      title="Ubah Kelas"
                    >
                      <Tag className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete([s.id])}
                      className="p-1 rounded border border-rose-300 hover:bg-rose-50 text-rose-600"
                      title="Tolak & Hapus"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border-2 border-fg bg-card text-xs">
            <span className="text-[11px] font-mono text-muted-fg">
              Menampilkan <strong className="text-fg">{startItem}</strong>–
              <strong className="text-fg">{endItem}</strong> dari{" "}
              <strong className="text-fg">{totalItems}</strong> sampel
            </span>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) || 24);
                  setPage(1);
                }}
                className="px-2 py-1 rounded border-2 border-fg bg-card text-[11px] font-bold"
              >
                <option value={24}>24 / hal</option>
                <option value={48}>48 / hal</option>
                <option value={96}>96 / hal</option>
              </select>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || loadingList}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 text-xs font-bold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="px-2.5 py-1 rounded border-2 border-fg bg-muted font-mono font-bold text-[11px]">
                  Hal {page} / {totalPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || loadingList}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 text-xs font-bold"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="p-12 text-center text-muted-fg border-2 border-dashed border-border rounded-lg space-y-2">
          <CheckCircle2 className="w-10 h-10 mx-auto text-lime-600" />
          <h5 className="font-heading font-bold text-sm">Tidak Ada Antrean Kurasi</h5>
          <p className="text-xs">
            Semua sampel citra telah diverifikasi atau tidak ada data yang cocok dengan kriteria filter saat ini.
          </p>
        </div>
      )}

      {/* Modal Ubah Kelas */}
      <Modal
        open={changeClassModalOpen}
        onClose={() => setChangeClassModalOpen(false)}
        title="Ubah Label Kelas Sampel"
        className="max-w-md"
      >
        <div className="space-y-3 text-xs font-body">
          <p className="text-muted-fg">
            Pindahkan {targetSampelForChange.length} sampel foto terpilih ke kelas produk AI yang benar:
          </p>

          <div>
            <label className="block text-[11px] font-bold mb-1">Kelas AI Tujuan:</label>
            <select
              value={targetNewClassId}
              onChange={(e) => setTargetNewClassId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-bold focus:outline-none"
            >
              {kelasList.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.nama} ({cls.kode_kelas})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button variant="outline" onClick={() => setChangeClassModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleChangeClassSubmit} disabled={submitting}>
              {submitting ? "Memindahkan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(pendingDeleteIds && pendingDeleteIds.length > 0)}
        onClose={() => setPendingDeleteIds(null)}
        onConfirm={executeDeleteSamples}
        loading={submitting}
        title="Hapus Sampel Dataset?"
        message={`Hapus ${pendingDeleteIds?.length || 0} sampel foto ini secara permanen? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus Sampel"
        variant="danger"
      />
    </div>
  );
}
