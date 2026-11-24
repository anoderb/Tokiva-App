"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ProductImage } from "@/components/shared/product-image";
import { useToast } from "@/components/ui/toast";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { aiService } from "@/lib/services/ai.service";
import { formatDateTime } from "@/lib/format";
import type { AIKelas } from "@/types/api";

interface TabLogInferensiProps {
  logs: any[];
  kelasList?: AIKelas[];
  ringkasanAkurasi: any;
  onRefresh: () => void;
}

export function TabLogInferensi({
  logs: initialLogs,
  kelasList = [],
  ringkasanAkurasi,
  onRefresh,
}: TabLogInferensiProps) {
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<"semua" | "sesuai" | "koreksi">("semua");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<any[]>(initialLogs || []);
  const [totalLogs, setTotalLogs] = useState<number>(initialLogs?.length || 0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Modal konfirmasi kelas tujuan saat "+ Data Latih"
  const [promoteLog, setPromoteLog] = useState<any | null>(null);
  const [promoteKelasId, setPromoteKelasId] = useState<string>("");
  const [submittingLogId, setSubmittingLogId] = useState<string | null>(null);

  const fetchLogsPage = useCallback(
    async (targetPage: number, targetLimit: number, targetStatus: "semua" | "sesuai" | "koreksi") => {
      setLoadingLogs(true);
      try {
        const butuhKoreksi =
          targetStatus === "koreksi"
            ? true
            : targetStatus === "sesuai"
            ? false
            : undefined;

        const res = await aiService.getLogInferensi(
          {
            butuh_koreksi: butuhKoreksi,
            page: targetPage,
            limit: targetLimit,
          },
          "admin"
        );
        const items = res.items || [];
        const total = res.pagination?.total ?? res.meta?.total ?? items.length;
        const pages =
          res.pagination?.total_pages ??
          res.meta?.totalPages ??
          Math.max(1, Math.ceil(total / targetLimit));

        setRows(items);
        setTotalLogs(total);
        setTotalPages(Math.max(1, pages));
      } catch {
        // Fallback ke initialLogs jika gagal
      } finally {
        setLoadingLogs(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchLogsPage(page, pageSize, statusFilter);
  }, [page, pageSize, statusFilter, fetchLogsPage]);

  const akurasi = ringkasanAkurasi || {
    total_deteksi: totalLogs,
    diterima_kasir: rows.filter((l) => l.diterima_kasir && !l.butuh_koreksi).length,
    butuh_koreksi: rows.filter((l) => l.butuh_koreksi).length,
    akurasi_lapangan_persen:
      rows.length > 0
        ? Math.round(
            (rows.filter((l) => l.diterima_kasir && !l.butuh_koreksi).length / rows.length) * 100
          )
        : 100,
  };

  const openPromoteModal = (log: any) => {
    const defaultKelas =
      log.produk_asli?.ai_kelas_id ||
      log.prediksi_kelas_id ||
      kelasList[0]?.id ||
      "";
    setPromoteKelasId(defaultKelas);
    setPromoteLog(log);
  };

  const handleConfirmPromote = async () => {
    if (!promoteLog || !promoteKelasId) {
      toast.error("Pilih kelas AI tujuan terlebih dahulu.");
      return;
    }

    setSubmittingLogId(promoteLog.id);
    try {
      await aiService.jadikanDataLatihDariLog(promoteLog.id, promoteKelasId, "admin", true);
      toast.success("Cuplikan log langsung masuk dataset terverifikasi (siap sinkronisasi HF)!");
      setPromoteLog(null);
      await fetchLogsPage(page, pageSize, statusFilter);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mempromosikan log menjadi sampel latih");
    } finally {
      setSubmittingLogId(null);
    }
  };

  const startItem = totalLogs > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalLogs);

  return (
    <div className="space-y-6">
      {/* 1. Header & POS Accuracy Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-fg tracking-wider">
            Total Identifikasi Kamera POS
          </span>
          <h4 className="font-heading font-black text-2xl">
            {(akurasi.total_deteksi || 0).toLocaleString("id-ID")}
          </h4>
          <p className="text-[11px] text-muted-fg">Panggilan inferensi kasir</p>
        </div>

        <div className="p-4 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-fg tracking-wider">
            Akurat / Diterima Kasir
          </span>
          <h4 className="font-heading font-black text-2xl text-emerald-600">
            {(akurasi.diterima_kasir || 0).toLocaleString("id-ID")}
          </h4>
          <p className="text-[11px] text-muted-fg">Produk langsung masuk transaksi</p>
        </div>

        <div className="p-4 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-fg tracking-wider">
            Dikoreksi Kasir
          </span>
          <h4 className="font-heading font-black text-2xl text-amber-600">
            {(akurasi.butuh_koreksi || 0).toLocaleString("id-ID")}
          </h4>
          <p className="text-[11px] text-muted-fg">Kasir memilih produk lain</p>
        </div>

        <div className="p-4 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-fg tracking-wider">
            Akurasi Lapangan (Field Accuracy)
          </span>
          <h4 className="font-heading font-black text-2xl text-accent">
            {akurasi.akurasi_lapangan_persen != null
              ? `${Number(akurasi.akurasi_lapangan_persen).toFixed(1)}%`
              : "100.0%"}
          </h4>
          <p className="text-[11px] text-muted-fg">Evaluasi real-world POS</p>
        </div>
      </div>

      {/* 2. Logs Table */}
      <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              <h4 className="font-heading font-bold text-base">
                Audit Log Inferensi Kasir Real-Time
              </h4>
            </div>
            <p className="text-[11px] text-muted-fg mt-0.5">
              Klik <strong>+ Data Latih</strong> untuk langsung memasukkan cuplikan ke dataset terverifikasi (tanpa validasi ulang).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted p-1 rounded border border-border text-xs">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("semua");
                  setPage(1);
                }}
                className={`px-2.5 py-0.5 rounded font-bold text-[11px] ${
                  statusFilter === "semua" ? "bg-accent text-accent-fg" : "text-muted-fg hover:text-fg"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("sesuai");
                  setPage(1);
                }}
                className={`px-2.5 py-0.5 rounded font-bold text-[11px] ${
                  statusFilter === "sesuai" ? "bg-emerald-200 text-emerald-900" : "text-muted-fg hover:text-fg"
                }`}
              >
                Sesuai
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("koreksi");
                  setPage(1);
                }}
                className={`px-2.5 py-0.5 rounded font-bold text-[11px] ${
                  statusFilter === "koreksi" ? "bg-amber-200 text-amber-900" : "text-muted-fg hover:text-fg"
                }`}
              >
                Dikoreksi Kasir
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                fetchLogsPage(page, pageSize, statusFilter);
                onRefresh();
              }}
              disabled={loadingLogs}
              className="text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="border-2 border-fg rounded-md overflow-hidden bg-card">
          <table className="w-full text-left text-xs font-body">
            <thead className="bg-muted border-b-2 border-border font-bold uppercase text-[10px] text-muted-fg">
              <tr>
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Cuplikan</th>
                <th className="py-2.5 px-3">Tebakan AI &amp; Keyakinan</th>
                <th className="py-2.5 px-3">Pilihan Akhir Kasir</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {loadingLogs && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-fg">
                    Memuat riwayat log inferensi...
                  </td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((log) => {
                  const isCorrect = !log.butuh_koreksi;
                  const pct = Math.round((log.skor_yakin || 0.85) * 100);
                  const alreadyPromoted = Boolean(log.sudah_jadi_sampel);

                  return (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-muted-fg">
                        {log.dibuat_pada ? formatDateTime(log.dibuat_pada) : "Baru saja"}
                      </td>
                      <td className="py-2.5 px-3">
                        <ProductImage
                          src={log.foto_cuplikan}
                          alt="Inference Cuplikan"
                          size="sm"
                          className="rounded border"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-fg block">
                          {log.kelas_prediksi?.nama || log.prediksi_kelas_id || "Produk Terdeteksi"}
                        </span>
                        <span className="font-mono text-[10px] text-muted-fg">
                          Keyakinan: {pct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {log.produk_asli?.nama ? (
                          <span className="font-semibold text-fg">{log.produk_asli.nama}</span>
                        ) : isCorrect ? (
                          <span className="text-muted-fg italic">Sesuai Prediksi</span>
                        ) : (
                          <span className="text-amber-600 font-semibold">Dikoreksi manual</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-muted-fg">
                        {log.versi_model || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        {isCorrect ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Diterima
                          </span>
                        ) : (
                          <span className="text-amber-600 font-bold flex items-center gap-1 text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" /> Dikoreksi
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="p-1 rounded border border-border hover:bg-muted text-muted-fg"
                            title="Detail Log"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {log.foto_cuplikan &&
                            (alreadyPromoted ? (
                              <Badge variant="green" className="text-[10px]">
                                <Check className="w-3 h-3 inline mr-0.5" /> Masuk Dataset
                              </Badge>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openPromoteModal(log)}
                                disabled={submittingLogId === log.id}
                                className="px-2 py-0.5 rounded border-2 border-fg bg-card hover:bg-accent hover:text-accent-fg text-[11px] font-bold flex items-center gap-1"
                                title="Konfirmasi kelas & langsung masukkan dataset terverifikasi"
                              >
                                <Plus className="w-3 h-3" /> Data Latih
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-fg">
                    Tidak ada log inferensi yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalLogs > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1">
            <span className="text-[11px] font-mono text-muted-fg">
              Menampilkan <strong className="text-fg">{startItem}</strong>–
              <strong className="text-fg">{endItem}</strong> dari{" "}
              <strong className="text-fg">{totalLogs}</strong> log
            </span>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) || 20);
                  setPage(1);
                }}
                className="px-2 py-1 rounded border-2 border-fg bg-card text-[11px] font-bold"
              >
                <option value={10}>10 / hal</option>
                <option value={20}>20 / hal</option>
                <option value={50}>50 / hal</option>
              </select>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || loadingLogs}
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
                  disabled={page >= totalPages || loadingLogs}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 text-xs font-bold"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detail Log */}
      {selectedLog && (
        <Modal
          open={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Detail Audit Log Inferensi POS"
          className="max-w-md"
        >
          <div className="space-y-3 text-xs font-body">
            <div className="relative aspect-video rounded border-2 border-fg overflow-hidden bg-black flex items-center justify-center">
              <ProductImage
                src={selectedLog.foto_cuplikan}
                alt="Cuplikan"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-fg block">Waktu:</span>
                <span className="font-semibold">{formatDateTime(selectedLog.dibuat_pada)}</span>
              </div>
              <div>
                <span className="text-muted-fg block">Versi Model:</span>
                <span className="font-mono font-semibold">{selectedLog.versi_model || "—"}</span>
              </div>
              <div>
                <span className="text-muted-fg block">Prediksi AI:</span>
                <span className="font-bold text-accent">
                  {selectedLog.kelas_prediksi?.nama || selectedLog.prediksi_kelas_id}
                </span>
              </div>
              <div>
                <span className="text-muted-fg block">Keyakinan AI:</span>
                <span className="font-mono font-bold">
                  {Math.round((selectedLog.skor_yakin || 0.85) * 100)}%
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>
                Tutup
              </Button>
              {selectedLog.foto_cuplikan && !selectedLog.sudah_jadi_sampel && (
                <Button
                  onClick={() => {
                    const target = selectedLog;
                    setSelectedLog(null);
                    openPromoteModal(target);
                  }}
                  className="font-bold"
                >
                  Jadikan Data Latih
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Konfirmasi Kelas Tujuan & Langsung Verifikasi */}
      {promoteLog && (
        <Modal
          open={!!promoteLog}
          onClose={() => setPromoteLog(null)}
          title="Tambahkan Cuplikan ke Dataset Terverifikasi"
          className="max-w-md"
        >
          <div className="space-y-3 text-xs font-body">
            <div className="relative aspect-video rounded border-2 border-fg overflow-hidden bg-black flex items-center justify-center">
              <ProductImage
                src={promoteLog.foto_cuplikan}
                alt="Cuplikan Data Latih"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-2.5 rounded border border-border bg-muted/30 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-fg">Tebakan AI:</span>
                <span className="font-bold">{promoteLog.kelas_prediksi?.nama || "—"}</span>
              </div>
              {promoteLog.produk_asli?.nama && (
                <div className="flex justify-between">
                  <span className="text-muted-fg">Pilihan Kasir:</span>
                  <span className="font-bold text-amber-600">{promoteLog.produk_asli.nama}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">
                Kelas AI Tujuan (Langsung Siap Sync Hugging Face):
              </label>
              <select
                value={promoteKelasId}
                onChange={(e) => setPromoteKelasId(e.target.value)}
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
              <Button variant="outline" onClick={() => setPromoteLog(null)}>
                Batal
              </Button>
              <Button
                onClick={handleConfirmPromote}
                disabled={submittingLogId === promoteLog.id || !promoteKelasId}
                className="font-bold"
              >
                {submittingLogId === promoteLog.id
                  ? "Menyimpan..."
                  : "Simpan & Langsung Verifikasi"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
