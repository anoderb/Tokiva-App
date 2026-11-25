"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast } from "@/components/ui/toast";
import { aiService } from "@/lib/services/ai.service";
import type { AIKelasEmbedding } from "@/types/api";
import { Cpu, Power, PowerOff, RefreshCw, Trash2 } from "lucide-react";

/** Panel monitoring & moderasi Admin terhadap prototipe embedding sementara per toko (Model v2) */
export function EmbeddingMonitorSection({ activeModelVersion }: { activeModelVersion?: string | null }) {
  const { toast } = useToast();
  const [items, setItems] = useState<AIKelasEmbedding[]>([]);
  const [summary, setSummary] = useState({ total: 0, aktif: 0, terlatih: 0, nonaktif: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("semua");
  const [loading, setLoading] = useState<boolean>(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AIKelasEmbedding | null>(null);

  const loadEmbeddings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await aiService.getAdminEmbeddings({
        status: statusFilter === "semua" ? undefined : statusFilter,
        limit: 100,
      });
      setItems(res.items || []);
      setSummary(res.summary || { total: 0, aktif: 0, terlatih: 0, nonaktif: 0 });
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadEmbeddings();
  }, [loadEmbeddings]);

  const handleToggleStatus = async (row: AIKelasEmbedding) => {
    const nextStatus = row.status === "aktif" ? "nonaktif" : "aktif";
    setSubmittingId(row.id);
    try {
      await aiService.updateAdminEmbeddingStatus(row.id, nextStatus);
      toast.success(`Embedding "${row.kelas?.nama || row.produk?.nama || "produk"}" diubah ke '${nextStatus}'.`);
      loadEmbeddings();
    } catch (err: any) {
      toast.error(err?.message || "Gagal memperbarui status embedding");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSubmittingId(deleteTarget.id);
    try {
      await aiService.deleteAdminEmbedding(deleteTarget.id);
      toast.success("Prototipe embedding berhasil dihapus.");
      setDeleteTarget(null);
      loadEmbeddings();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menghapus embedding");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-border pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Cpu className="w-5 h-5 text-admin shrink-0" />
            <h4 className="font-heading font-bold text-base">
              Monitor Embedding Sementara Lintas Toko (Model v2 Hybrid)
            </h4>
            <Badge variant="purple">{summary.aktif} Aktif</Badge>
            <Badge variant="green">{summary.terlatih} Terlatih</Badge>
          </div>
          <p className="text-xs text-muted-fg mt-0.5">
            Daftar produk baru yang didaftarkan Owner agar langsung terdeteksi kasir via Embedding (Tier 2) sambil menunggu training Kaggle v2 berikutnya.
            {activeModelVersion ? ` Model aktif saat ini: ${activeModelVersion}.` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-bold"
          >
            <option value="semua">Semua Status ({summary.total})</option>
            <option value="aktif">Aktif Sementara ({summary.aktif})</option>
            <option value="terlatih">Sudah Terlatih ({summary.terlatih})</option>
            <option value="nonaktif">Nonaktif ({summary.nonaktif})</option>
          </select>

          <Button type="button" variant="outline" size="sm" onClick={loadEmbeddings} disabled={loading} className="text-xs font-bold">
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="border-2 border-fg rounded-md overflow-hidden bg-card">
        <div className="md:hidden px-3 py-1.5 bg-muted/50 border-b border-border text-[10px] font-semibold text-muted-fg flex items-center justify-between">
          <span>Geser tabel ke samping untuk melihat seluruh kolom</span>
          <span>↔</span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[740px] text-left text-xs font-body">
            <thead className="bg-muted border-b-2 border-border font-bold uppercase text-[10px] text-muted-fg">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Toko</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Produk / Kelas AI</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Versi Model</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Sampel / Dimensi</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {items.length > 0 ? (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                      {row.toko?.nama || row.toko_id.slice(0, 8)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-fg block whitespace-nowrap">
                        {row.produk?.nama || row.kelas?.nama || "—"}
                      </span>
                      <span className="text-[10px] font-mono text-muted-fg">
                        {row.kelas?.kode_kelas || row.kelas_id.slice(0, 8)}
                        {row.kelas?.barcode ? ` · ${row.kelas.barcode}` : ""}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">{row.model_versi}</td>
                    <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                      {row.jml_sampel} foto · {row.dimensi}d
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {row.status === "aktif" ? (
                        <Badge variant="purple">Aktif (Tier 2)</Badge>
                      ) : row.status === "terlatih" ? (
                        <Badge variant="green">Terlatih (Softmax)</Badge>
                      ) : (
                        <Badge variant="gray">Nonaktif</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {row.status !== "terlatih" && (
                          <button
                            type="button"
                            disabled={submittingId === row.id}
                            onClick={() => handleToggleStatus(row)}
                            className="px-2 py-1 rounded border-2 border-fg bg-card hover:bg-muted text-[11px] font-bold inline-flex items-center gap-1"
                            title={row.status === "aktif" ? "Nonaktifkan Embedding" : "Aktifkan Kembali"}
                          >
                            {row.status === "aktif" ? (
                              <>
                                <PowerOff className="w-3 h-3 text-amber-600" /> Nonaktifkan
                              </>
                            ) : (
                              <>
                                <Power className="w-3 h-3 text-emerald-600" /> Aktifkan
                              </>
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={submittingId === row.id}
                          onClick={() => setDeleteTarget(row)}
                          className="p-1 rounded border-2 border-fg bg-card hover:bg-rose-50 text-rose-600"
                          title="Hapus Embedding Permanen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-fg">
                    {loading ? "Memuat daftar embedding..." : "Belum ada embedding sementara yang terdaftar."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Embedding Produk?"
        message={`Hapus prototipe embedding "${deleteTarget?.kelas?.nama || deleteTarget?.produk?.nama || ""}" milik toko "${deleteTarget?.toko?.nama || ""}"? Foto dataset asli tetap aman.`}
        variant="danger"
        confirmText={submittingId ? "Menghapus..." : "Ya, Hapus"}
        cancelText="Batal"
      />
    </div>
  );
}
