"use client";

import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Cpu, Target, Zap, Clock, AlertTriangle, Layers, Info } from "lucide-react";
import type { AIModel } from "@/types/api";

function formatMetric(val?: number | null, digits = 2): string {
  if (val == null || Number.isNaN(Number(val))) return "—";
  const num = Number(val);
  const pct = num <= 1 ? num * 100 : num;
  return `${pct.toFixed(digits)}%`;
}

interface ModelDetailModalProps {
  model: AIModel | null;
  open: boolean;
  onClose: () => void;
}

export function ModelDetailModal({ model, open, onClose }: ModelDetailModalProps) {
  if (!model) return null;

  const summary = (model.ringkasan_training || {}) as Record<string, any>;
  const errorSummary: Array<{
    true_label?: string;
    true_class?: string;
    most_confused_with?: string;
    predicted_class?: string;
    total_errors?: number;
    count?: number;
    avg_confidence?: number | null;
    description?: string;
  }> = summary.error_summary || summary.misclassified_samples || [];

  return (
    <Modal open={open} onClose={onClose} title="Detail Model & Spesifikasi Riset" className="max-w-2xl">
      <div className="space-y-4 text-xs font-body">
        {/* Header Hero */}
        <div className="flex items-center justify-between p-3 rounded-lg border-2 border-fg bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-accent/20 border-2 border-fg flex items-center justify-center text-accent">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-heading font-bold text-sm">{model.nama_model || model.arsitektur}</h4>
                <Badge variant={model.aktif ? "green" : "gray"}>
                  {model.aktif ? "● LIVE AKTIF" : "○ STAGING"}
                </Badge>
              </div>
              <p className="text-muted-fg font-mono text-[11px]">{model.versi}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-muted-fg block">Total Kelas</span>
            <span className="font-heading font-bold text-sm">{model.jml_kelas || model.total_kelas || 24} Kelas</span>
          </div>
        </div>

        {/* 4 Core Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-md border-2 border-fg bg-lime-50/50 dark:bg-lime-950/20">
            <div className="flex items-center gap-1.5 text-lime-700 dark:text-lime-400 mb-1">
              <Target className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase">Val Accuracy</span>
            </div>
            <p className="font-heading font-bold text-base text-lime-900 dark:text-lime-200">
              {formatMetric(model.akurasi_top1)}
            </p>
          </div>

          <div className="p-2.5 rounded-md border-2 border-fg bg-teal-50/50 dark:bg-teal-950/20">
            <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400 mb-1">
              <Layers className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase">F1-Macro</span>
            </div>
            <p className="font-heading font-bold text-base text-teal-900 dark:text-teal-200">
              {formatMetric(model.f1_score || summary.f1_macro || summary.f1_score)}
            </p>
          </div>

          <div className="p-2.5 rounded-md border-2 border-fg bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase">Latensi TFJS</span>
            </div>
            <p className="font-heading font-bold text-base text-amber-900 dark:text-amber-200">
              {model.latensi_ms != null ? `${model.latensi_ms.toFixed(1)} ms` : summary.inference_ms ? `${summary.inference_ms} ms` : "—"}
            </p>
          </div>

          <div className="p-2.5 rounded-md border-2 border-fg bg-sky-50/50 dark:bg-sky-950/20">
            <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase">Training Time</span>
            </div>
            <p className="font-heading font-bold text-base text-sky-900 dark:text-sky-200">
              {summary.training_time_s != null
                ? `${Math.round(summary.training_time_s / 60)} mnt`
                : summary.training_time_min
                ? `${summary.training_time_min} mnt`
                : "—"}
            </p>
          </div>
        </div>

        {/* Hyperparameters & Artifact Info */}
        <div className="p-3 rounded-md border-2 border-fg bg-card space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-muted-fg text-[11px] uppercase">
            <Info className="w-3.5 h-3.5" /> Parameter & Karakteristik Model
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>
              <span className="text-muted-fg block">Arsitektur:</span>
              <span className="font-semibold">{model.arsitektur}</span>
            </div>
            <div>
              <span className="text-muted-fg block">Ukuran Model:</span>
              <span className="font-semibold">{model.ukuran_mb || model.ukuran_model_mb ? `${model.ukuran_mb || model.ukuran_model_mb} MB` : "—"}</span>
            </div>
            <div>
              <span className="text-muted-fg block">Best Epoch:</span>
              <span className="font-semibold">{summary.best_epoch || "—"}</span>
            </div>
            <div>
              <span className="text-muted-fg block">Input Shape:</span>
              <span className="font-semibold font-mono">224 x 224 x 3</span>
            </div>
            <div>
              <span className="text-muted-fg block">Misclassified:</span>
              <span className="font-semibold text-rose-600">
                {summary.num_misclassified != null ? `${summary.num_misclassified} sampel` : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-fg block">Test Split:</span>
              <span className="font-semibold">{summary.num_test_images || 720} foto</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-fg block">Storage Shard Path:</span>
              <span className="font-mono text-[10px] truncate block text-muted-fg" title={model.model_json_url}>
                {model.model_json_url || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Error Summary / Most Confused Pairs */}
        {errorSummary.length > 0 && (
          <div className="p-3 rounded-md border-2 border-fg bg-card space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 text-[11px] uppercase">
              <AlertTriangle className="w-3.5 h-3.5" /> Kesalahan Prediksi Terbanyak (Confusion Matrix Analysis)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-muted border-b border-border text-muted-fg uppercase text-[10px]">
                  <tr>
                    <th className="py-1 px-2">Label Sebenarnya</th>
                    <th className="py-1 px-2">Terprediksi Salah Sebagai</th>
                    <th className="py-1 px-2 text-center">Jumlah Kasus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {errorSummary.slice(0, 6).map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/40">
                      <td className="py-1 px-2 font-semibold">
                        {item.true_label || item.true_class || "—"}
                      </td>
                      <td className="py-1 px-2 text-rose-600 font-semibold">
                        {item.most_confused_with || item.predicted_class || "—"}
                      </td>
                      <td className="py-1 px-2 text-center font-bold">
                        {item.total_errors ?? item.count ?? 1}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

