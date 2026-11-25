"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast } from "@/components/ui/toast";
import {
  Cpu,
  Play,
  Upload,
  RefreshCw,
  Trash2,
  Check,
  CheckCircle2,
  Sliders,
  AlertCircle,
  Eye,
  Rocket,
  ShieldCheck,
  Zap,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { aiService } from "@/lib/services/ai.service";
import { TestingSandbox } from "./TestingSandbox";
import { ModelDetailModal } from "./ModelDetailModal";
import type { AIModel } from "@/types/api";

function formatMetric(val?: number | null, digits = 2): string {
  if (val == null || Number.isNaN(Number(val))) return "—";
  const num = Number(val);
  const pct = num <= 1 ? num * 100 : num;
  return `${pct.toFixed(digits)}%`;
}

function formatDateTimeWib(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return (
      new Date(iso).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
  } catch {
    return "—";
  }
}

function formatTrainingDuration(summary?: Record<string, any> | null): string | null {
  if (!summary) return null;
  if (summary.training_time_s != null && !Number.isNaN(Number(summary.training_time_s))) {
    const totalSec = Math.max(0, Math.round(Number(summary.training_time_s)));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m > 0 ? (s > 0 ? `${m} mnt ${s} dtk` : `${m} mnt`) : `${s} dtk`;
  }
  if (summary.training_time_min != null && !Number.isNaN(Number(summary.training_time_min))) {
    return `${Number(summary.training_time_min)} mnt`;
  }
  return null;
}

interface TabModelSandboxDeployProps {
  models: AIModel[];
  activeModel: AIModel | null;
  onRefresh: () => void;
}

export function TabModelSandboxDeploy({
  models,
  activeModel,
  onRefresh,
}: TabModelSandboxDeployProps) {
  const { toast } = useToast();

  const [sandboxModel, setSandboxModel] = useState<AIModel | null>(activeModel || models[0] || null);
  const [detailModalModel, setDetailModalModel] = useState<AIModel | null>(null);

  // Sync / Register Modal
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncVersi, setSyncVersi] = useState("v1.2.20260912");
  const [syncSetAktif, setSyncSetAktif] = useState(false);

  // Activate Model Modal (with version override)
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [modelToActivate, setModelToActivate] = useState<AIModel | null>(null);
  const [versionOverrideInput, setVersionOverrideInput] = useState("");
  const [deleteTargetModel, setDeleteTargetModel] = useState<AIModel | null>(null);

  // Threshold Configuration
  const [highThreshold, setHighThreshold] = useState<number>(75);
  const [mediumThreshold, setMediumThreshold] = useState<number>(25);
  const [autoAddHigh, setAutoAddHigh] = useState<boolean>(true);
  const [showTop3, setShowTop3] = useState<boolean>(true);
  const [fallbackBarcode, setFallbackBarcode] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  const totalPages = Math.max(1, Math.ceil(models.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedModels = models.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Update sandboxModel when activeModel loads
  useEffect(() => {
    if (!sandboxModel && (activeModel || models[0])) {
      setSandboxModel(activeModel || models[0]);
    }
  }, [activeModel, models, sandboxModel]);

  // Load threshold config
  useEffect(() => {
    aiService
      .getThresholdConfig("admin")
      .then((cfg) => {
        if (cfg) {
          setHighThreshold(cfg.high_threshold ?? 75);
          setMediumThreshold(cfg.medium_threshold ?? 25);
          setAutoAddHigh(cfg.auto_add_high_confidence ?? true);
          setShowTop3(cfg.show_top3_candidates ?? true);
          setFallbackBarcode(cfg.fallback_barcode_on_low ?? true);
        }
      })
      .catch(() => { });
  }, []);

  // Activate Model
  const handleActivateSubmit = async () => {
    if (!modelToActivate) return;
    setSubmitting(true);
    try {
      await aiService.activateModel(
        modelToActivate.versi,
        "admin",
        versionOverrideInput.trim() || undefined
      );
      toast.success(`Model ${modelToActivate.versi} berhasil diaktifkan ke Production POS!`);
      setActivateModalOpen(false);
      setModelToActivate(null);
      setVersionOverrideInput("");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengaktifkan model");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Model
  const handleRequestDeleteModel = (m: AIModel) => {
    if (m.aktif) {
      toast.error("Tidak dapat menghapus model yang sedang aktif di production!");
      return;
    }
    setDeleteTargetModel(m);
  };

  const handleConfirmDeleteModel = async () => {
    if (!deleteTargetModel) return;
    setSubmitting(true);
    try {
      await aiService.deleteModel(deleteTargetModel.id || deleteTargetModel.versi, "admin");
      toast.success(`Model ${deleteTargetModel.versi} berhasil dihapus.`);
      setDeleteTargetModel(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menghapus model");
    } finally {
      setSubmitting(false);
    }
  };

  // Sync Storage
  const handleSyncStorage = async () => {
    if (!syncVersi.trim()) {
      toast.warning("Nama subfolder versi wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      await aiService.syncStorageModel(syncVersi.trim(), syncSetAktif, "admin");
      toast.success(
        syncSetAktif
          ? `Model ${syncVersi} disinkronkan dan langsung diaktifkan ke Production POS!`
          : `Model ${syncVersi} berhasil disinkronkan ke Staging dari Supabase Storage!`
      );
      setSyncModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal sinkronisasi model dari storage");
    } finally {
      setSubmitting(false);
    }
  };

  // Save Threshold Config
  const handleSaveThreshold = async () => {
    setSubmitting(true);
    try {
      await aiService.updateThresholdConfig(
        {
          high_threshold: highThreshold,
          medium_threshold: mediumThreshold,
          auto_add_high_confidence: autoAddHigh,
          show_top3_candidates: showTop3,
          fallback_barcode_on_low: fallbackBarcode,
        },
        "admin"
      );
      toast.success("Konfigurasi threshold verifikasi kasir berhasil diperbarui!");
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan konfigurasi threshold");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🚀</span>
              <h3 className="font-heading font-black text-lg">
                Registri Model AI, Deployment POS & Testing Sandbox
              </h3>
            </div>
            <p className="text-xs text-muted-fg">
              Kelola versi artefak TensorFlow.js (model.json & shards *.bin) di Supabase Storage bucket <code>ai-models</code>, uji coba inferensi langsung di browser, dan atur threshold konfirmasi kasir.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSyncModalOpen(true)}
              className="text-xs font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Sync Storage Bucket
            </Button>
          </div>
        </div>

        {/* Model Registry Table */}
        <div className="border-2 border-fg rounded-md overflow-hidden bg-card">
          <div className="md:hidden px-3 py-1.5 bg-muted/50 border-b border-border text-[10px] font-semibold text-muted-fg flex items-center justify-between">
            <span>Geser tabel ke samping untuk melihat seluruh kolom</span>
            <span>↔</span>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[740px] text-left text-xs font-body">
              <thead className="bg-muted border-b-2 border-border font-bold uppercase text-[10px] text-muted-fg">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Versi Model</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Arsitektur</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Kelas</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Top-1 Accuracy</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Ukuran / Latensi</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Waktu Training</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border">
                {paginatedModels.length > 0 ? (
                  paginatedModels.map((m) => {
                    const isSelectedForSandbox = sandboxModel?.id === m.id || sandboxModel?.versi === m.versi;
                    const releaseTime = formatDateTimeWib(m.tgl_rilis || m.dirilis_pada || m.dibuat_pada);
                    const durationTxt = formatTrainingDuration(m.ringkasan_training);
                    return (
                      <tr
                        key={m.id || m.versi}
                        className={`hover:bg-muted/30 ${isSelectedForSandbox ? "bg-admin/10" : ""}`}
                      >
                        <td className="py-2.5 px-3 font-semibold font-mono whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-fg font-bold">{m.versi}</span>
                            {m.aktif && <Badge variant="green">LIVE</Badge>}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold block whitespace-nowrap">{m.nama_model || m.arsitektur}</span>
                          <span className="text-[10px] text-muted-fg font-mono block truncate max-w-[200px]">
                            {m.model_json_url}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold whitespace-nowrap">
                          {m.jml_kelas || m.total_kelas || 24}
                        </td>
                        <td className="py-2.5 px-3 font-heading font-bold text-emerald-600 whitespace-nowrap">
                          {formatMetric(m.akurasi_top1)}
                        </td>
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                          {m.ukuran_mb || m.ukuran_model_mb ? `${m.ukuran_mb || m.ukuran_model_mb} MB` : "11.6 MB"}
                          <span className="text-muted-fg block text-[10px]">
                            {m.latensi_ms != null ? `${m.latensi_ms.toFixed(1)} ms` : "5.6 ms"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-semibold text-fg block whitespace-nowrap">
                            {releaseTime}
                          </span>
                          <span className="text-[10px] text-muted-fg flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {durationTxt ? `Durasi: ${durationTxt}` : "Durasi: —"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {m.aktif ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Aktif di Kasir
                            </span>
                          ) : (
                            <span className="text-muted-fg text-[11px]">⚪ Staging</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailModalModel(m)}
                              className="p-1 rounded border-2 border-fg bg-card hover:bg-muted text-muted-fg hover:text-fg"
                              title="Detail Spesifikasi Riset"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSandboxModel(m);
                                toast.success(`Model ${m.versi} dimuat ke Testing Sandbox!`);
                              }}
                              className={`px-2 py-1 rounded border-2 border-fg text-[11px] font-bold flex items-center gap-1 ${isSelectedForSandbox
                                ? "bg-admin text-white"
                                : "bg-muted hover:bg-muted/80 text-fg"
                                }`}
                            >
                              <Play className="w-3 h-3" /> Uji
                            </button>

                            {!m.aktif && (
                              <Button
                                size="sm"
                                variant="admin"
                                onClick={() => {
                                  setModelToActivate(m);
                                  setVersionOverrideInput(m.versi);
                                  setActivateModalOpen(true);
                                }}
                                className="text-[11px] py-0.5 px-2 font-bold"
                              >
                                <Rocket className="w-3 h-3 mr-1" /> Deploy
                              </Button>
                            )}

                            {!m.aktif && (
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteModel(m)}
                                className="p-1 rounded border-2 border-fg bg-card hover:bg-rose-50 text-rose-600"
                                title="Hapus Model"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-muted-fg">
                      Belum ada model terdaftar di registri.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

          {/* Pagination Bar */}
          {models.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
              <div className="text-muted-fg font-mono text-[11px]">
                Menampilkan{" "}
                <strong className="text-fg">{startIndex + 1}</strong>–
                <strong className="text-fg">{Math.min(startIndex + pageSize, models.length)}</strong>{" "}
                dari <strong className="text-fg">{models.length}</strong> model
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value) || 5);
                    setPage(1);
                  }}
                  className="px-2 py-1 rounded border-2 border-fg bg-card text-[11px] font-bold"
                >
                  <option value={5}>5 / hal</option>
                  <option value={10}>10 / hal</option>
                  <option value={20}>20 / hal</option>
                </select>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="px-2 py-1 text-xs font-bold"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="px-2.5 py-1 rounded border-2 border-fg bg-muted font-mono font-bold text-[11px]">
                    Hal {safePage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="px-2 py-1 text-xs font-bold"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Embedded Realtime Testing Sandbox */}
        <TestingSandbox model={sandboxModel} threshold={highThreshold / 100} />

        {/* 3. Threshold Configuration (3-Tier) */}
        <div className="p-5 sm:p-6 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-admin shrink-0" />
              <h4 className="font-heading font-bold text-base">
                Konfigurasi Threshold Verifikasi Kasir (3-Tier Recognition)
              </h4>
            </div>
            <Button
              type="button"
              variant="admin"
              onClick={handleSaveThreshold}
              disabled={submitting}
              className="text-xs font-bold"
            >
              {submitting ? "Menyimpan..." : "Simpan Konfigurasi Threshold"}
            </Button>
          </div>

          <p className="text-xs text-muted-fg">
            Atur batas ambang keyakinan probabilitas inferensi AI sebelum produk dimasukkan otomatis atau memerlukan konfirmasi kasir di POS:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tier 1 */}
            <div className="p-4 rounded-lg border-2 border-fg bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-xs uppercase text-emerald-800 dark:text-emerald-300">
                  Tier 1 — High Confidence
                </span>
                <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400">
                  ≥ {highThreshold}%
                </span>
              </div>
              <p className="text-[11px] text-muted-fg leading-relaxed">
                Produk langsung ditambahkan ke keranjang POS secara otomatis tanpa konfirmasi kasir.
              </p>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={highThreshold}
                onChange={(e) => setHighThreshold(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <label className="flex items-center gap-2 text-[11px] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAddHigh}
                  onChange={(e) => setAutoAddHigh(e.target.checked)}
                  className="rounded border-fg"
                />
                Auto-add ke keranjang transaksi
              </label>
            </div>

            {/* Tier 2 */}
            <div className="p-4 rounded-lg border-2 border-fg bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-xs uppercase text-amber-800 dark:text-amber-300">
                  Tier 2 — Medium Confidence
                </span>
                <span className="font-mono font-bold text-base text-amber-700 dark:text-amber-400">
                  {mediumThreshold}% – {highThreshold - 1}%
                </span>
              </div>
              <p className="text-[11px] text-muted-fg leading-relaxed">
                Tampilkan dialog Top-3 produk kandidat agar kasir memilih produk yang tepat dengan 1 sentuhan.
              </p>
              <input
                type="range"
                min="15"
                max="50"
                step="5"
                value={mediumThreshold}
                onChange={(e) => setMediumThreshold(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <label className="flex items-center gap-2 text-[11px] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTop3}
                  onChange={(e) => setShowTop3(e.target.checked)}
                  className="rounded border-fg"
                />
                Tampilkan popup Top-3 kandidat kasir
              </label>
            </div>

            {/* Tier 3 */}
            <div className="p-4 rounded-lg border-2 border-fg bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-xs uppercase text-rose-800 dark:text-rose-300">
                  Tier 3 — Low Confidence
                </span>
                <span className="font-mono font-bold text-base text-rose-700 dark:text-rose-400">
                  &lt; {mediumThreshold}%
                </span>
              </div>
              <p className="text-[11px] text-muted-fg leading-relaxed">
                Kemasan tidak terdeteksi atau tidak yakin. Otomatis alihkan ke pemindaian Barcode Scanner atau input manual.
              </p>
              <div className="pt-4 text-xs font-mono text-muted-fg">Fallback Trigger</div>
              <label className="flex items-center gap-2 text-[11px] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={fallbackBarcode}
                  onChange={(e) => setFallbackBarcode(e.target.checked)}
                  className="rounded border-fg"
                />
                Peringatan fallback ke pemindai barcode
              </label>
            </div>
          </div>
        </div>

        {/* Modal Deploy / Aktifkan Model */}
        <Modal
          open={activateModalOpen}
          onClose={() => setActivateModalOpen(false)}
          title="Deploy Model AI ke Production POS"
          className="max-w-md"
        >
          <div className="space-y-3 text-xs font-body">
            <p className="text-muted-fg">
              Anda akan mengaktifkan versi model <strong className="text-fg">{modelToActivate?.versi}</strong> ({modelToActivate?.arsitektur}) sebagai model inferensi utama pada seluruh terminal POS kasir.
            </p>

            <div>
              <label className="block text-[11px] font-bold mb-1">Versi Rilis POS (Override jika diperlukan):</label>
              <input
                type="text"
                value={versionOverrideInput}
                onChange={(e) => setVersionOverrideInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-mono focus:outline-none"
              />
            </div>

            <div className="p-3 rounded border-2 border-fg bg-amber-50 text-amber-900 text-[11px] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Semua terminal kasir yang sedang aktif akan otomatis mengunduh bundel bobot versi baru ini pada siklus cache berikutnya.</span>
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActivateModalOpen(false)}>
                Batal
              </Button>
              <Button variant="admin" onClick={handleActivateSubmit} disabled={submitting}>
                {submitting ? "Mengaktifkan..." : "Konfirmasi & Deploy"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Sync Storage */}
        <Modal
          open={syncModalOpen}
          onClose={() => setSyncModalOpen(false)}
          title="Sinkronisasi Model dari Supabase Storage"
          className="max-w-md"
        >
          <div className="space-y-3 text-xs font-body">
            <p className="text-muted-fg">
              Masukkan subfolder versi yang ada di bucket <code>ai-models/</code> pada Supabase Storage (misalnya <code>v1.2.20260912</code>):
            </p>
            <div>
              <label className="block text-[11px] font-bold mb-1">Folder Versi:</label>
              <input
                type="text"
                value={syncVersi}
                onChange={(e) => setSyncVersi(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-mono focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-[11px] font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={syncSetAktif}
                onChange={(e) => setSyncSetAktif(e.target.checked)}
                className="rounded border-fg"
              />
              Langsung aktifkan ke Production POS setelah sync (default: masuk Staging)
            </label>
            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSyncModalOpen(false)}>
                Batal
              </Button>
              <Button variant="admin" onClick={handleSyncStorage} disabled={submitting}>
                {submitting ? "Menyinkronkan..." : "Sync Sekarang"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Model Detail Modal */}
        <ModelDetailModal
          model={detailModalModel}
          open={!!detailModalModel}
          onClose={() => setDetailModalModel(null)}
        />

        {/* Confirm Delete Model Modal */}
        <ConfirmModal
          open={Boolean(deleteTargetModel)}
          onClose={() => setDeleteTargetModel(null)}
          onConfirm={handleConfirmDeleteModel}
          title="Hapus Model dari Registri?"
          message={`Apakah Anda yakin ingin menghapus versi model "${deleteTargetModel?.versi || ""}" dari registri?`}
          variant="danger"
          confirmText={submitting ? "Menghapus..." : "Ya, Hapus"}
          cancelText="Batal"
        />
      </div>
      );
}

