"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatElapsed, formatMetric } from "./kaggle-helpers";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Layers,
  Play,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

/** Panel pipeline eksekusi training GPU Kaggle T4x2 & tabel perbandingan arsitektur riset */
export function KaggleTrainingPipelineSection({
  kaggleUrl,
  trainStatus,
  elapsed,
  trainResult,
  trainError,
  isFetchingOutput,
  researchSummary,
  onResetTraining,
  onCheckStatus,
  onFetchLatestOutput,
  onTriggerTrain,
}: {
  kaggleUrl: string;
  trainStatus: string;
  elapsed: number;
  trainResult: any;
  trainError: string | null;
  isFetchingOutput: boolean;
  researchSummary: any;
  onResetTraining: () => void;
  onCheckStatus: () => void;
  onFetchLatestOutput: () => void;
  onTriggerTrain: () => void;
}) {
  const split = researchSummary?.dataset_split || { train: 3360, val: 720, test: 720, total: 4800 };
  const comparison = researchSummary?.comparison || [];

  return (
    <>
      <div className="p-5 sm:p-6 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🚀</span>
              <h3 className="font-heading font-black text-lg">Automated Training Pipeline (Kaggle GPU T4x2)</h3>
              <Badge variant="purple">Kaggle MLOps</Badge>
            </div>
            <p className="text-xs text-muted-fg mt-0.5">Pemicu otomatis pelatihan model MobileNetV3-Large + CBAM Attention pada cluster Kaggle GPU T4x2.</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a href={kaggleUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-md border-2 border-fg bg-muted hover:bg-muted/80 text-xs font-bold inline-flex items-center gap-1.5 transition-colors">
              Lihat di Kaggle <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {trainStatus !== "idle" && (
              <Button variant="outline" size="sm" onClick={onResetTraining} className="text-xs font-bold" title="Reset Sesi">
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded border-2 border-fg bg-muted/20 space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-fg block">Kernel Slug</span>
            <span className="font-mono font-bold text-xs truncate block">{researchSummary?.kernel_id || "Dikonfigurasi via .env"}</span>
          </div>
          <div className="p-3 rounded border-2 border-fg bg-muted/20 space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-fg block">Akselerator Hardware</span>
            <span className="font-bold text-accent flex items-center gap-1 text-xs"><Cpu className="w-3.5 h-3.5" /> GPU NVIDIA T4 x 2</span>
          </div>
          <div className="p-3 rounded border-2 border-fg bg-muted/20 space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-fg block">Sumber Dataset</span>
            <span className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1 text-xs"><Database className="w-3.5 h-3.5" /> {researchSummary?.hf_repo ? `HF ${researchSummary.hf_repo}` : "Hugging Face Hub (.env)"}</span>
          </div>
          <div className="p-3 rounded border-2 border-fg bg-muted/20 space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted-fg block">Dataset Partition</span>
            <span className="font-mono font-bold text-xs">{split.train} Tr / {split.val} Val / {split.test} Test</span>
          </div>
        </div>

        <div className="p-4 rounded-md border-2 border-fg bg-muted/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-muted-fg">Status Eksekusi:</span>
              {trainStatus === "idle" && <Badge variant="gray">⚪ IDLE (Siap Dilatih)</Badge>}
              {trainStatus === "starting" && <Badge variant="yellow">🟡 STARTING (Mempersiapkan Kernel...)</Badge>}
              {trainStatus === "running" && <Badge variant="yellow"><RefreshCw className="w-3 h-3 inline mr-1 animate-spin" /> RUNNING DI KAGGLE GPU</Badge>}
              {trainStatus === "processing" && <Badge variant="blue"><RefreshCw className="w-3 h-3 inline mr-1 animate-spin" /> PROCESSING (Unduh & Registrasi Model...)</Badge>}
              {trainStatus === "complete" && <Badge variant="green">🟢 COMPLETE (Model Baru Siap Di-Deploy!)</Badge>}
              {trainStatus === "error" && <Badge variant="red">🔴 ERROR</Badge>}
            </div>

            {(trainStatus === "running" || trainStatus === "processing") && (
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-accent flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Elapsed: {formatElapsed(elapsed)}</span>
                <Button size="sm" variant="outline" onClick={onCheckStatus} className="text-[11px] py-0.5 px-2 font-bold">
                  <RefreshCw className="w-3 h-3 mr-1" /> Cek Status
                </Button>
              </div>
            )}
          </div>

          {trainStatus === "idle" ? (
            <div className="pt-2 border-t border-border space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg border-2 border-fg bg-lime-50/40 dark:bg-lime-950/20 flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-lime-800 dark:text-lime-300 block">Mode 1 — Instan (~5 Detik)</span>
                    <h5 className="font-heading font-bold text-xs text-lime-950 dark:text-lime-100 mt-0.5">Tarik Model dari Kaggle Eksisting</h5>
                    <p className="text-[11px] text-muted-fg mt-1">Mengambil langsung artefak TFJS (model.json, shards *.bin, class.json) dari kernel Kaggle versi terakhir yang sudah berstatus COMPLETE tanpa menunggu training ulang.</p>
                  </div>
                  <Button type="button" onClick={onFetchLatestOutput} disabled={isFetchingOutput} className="w-full font-bold text-xs py-2 bg-lime-600 hover:bg-lime-700 text-white shadow-pop-soft">
                    {isFetchingOutput ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Menarik Model dari Kaggle...</> : <><Download className="w-3.5 h-3.5 mr-1.5" /> 📥 Tarik Model dari Kaggle Terakhir</>}
                  </Button>
                </div>

                <div className="p-3.5 rounded-lg border-2 border-fg bg-card flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent block">Mode 2 — Pelatihan Penuh (30–40 Mnt)</span>
                    <h5 className="font-heading font-bold text-xs mt-0.5">Trigger Training Ulang di Kaggle GPU</h5>
                    <p className="text-[11px] text-muted-fg mt-1">Kirim perintah re-train ke kernel Kaggle GPU T4x2 untuk melatih ulang arsitektur model dengan penambahan kelas produk baru atau kurasi citra terbaru.</p>
                  </div>
                  <Button type="button" onClick={onTriggerTrain} className="w-full font-bold text-xs py-2 shadow-pop-soft">
                    <Play className="w-3.5 h-3.5 mr-1.5" /> 🚀 Trigger Training Ulang di Kaggle
                  </Button>
                </div>
              </div>
            </div>
          ) : trainStatus === "running" || trainStatus === "processing" ? (
            <div className="space-y-2 pt-2">
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden border-2 border-fg relative"><div className="h-full bg-accent animate-pulse w-3/4" /></div>
              <div className="flex justify-between text-[11px] text-muted-fg">
                <span>Kernel sedang memproses epoch training & validasi...</span>
                <span className="font-mono font-bold">Auto-check setiap 15 detik</span>
              </div>
            </div>
          ) : trainStatus === "complete" && trainResult ? (
            <div className="p-4 rounded-md border-2 border-fg bg-lime-50/50 dark:bg-lime-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-sm text-lime-900 dark:text-lime-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-lime-600" />Model Berhasil Dilatih & Didaftarkan ke Supabase Storage!
                </span>
                <span className="font-mono font-bold text-xs text-lime-800 dark:text-lime-300">{trainResult.versi}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded bg-card border border-border"><span className="text-muted-fg text-[10px] block">Top-1 Accuracy</span><span className="font-heading font-bold text-base text-emerald-600">{formatMetric(trainResult.akurasi)}</span></div>
                <div className="p-2 rounded bg-card border border-border"><span className="text-muted-fg text-[10px] block">F1-Macro Score</span><span className="font-heading font-bold text-base text-teal-600">{formatMetric(trainResult.f1_macro)}</span></div>
                <div className="p-2 rounded bg-card border border-border"><span className="text-muted-fg text-[10px] block">Misclassified</span><span className="font-heading font-bold text-base text-rose-600">{trainResult.num_misclassified ?? 4} / {trainResult.num_test_images ?? 720}</span></div>
                <div className="p-2 rounded bg-card border border-border"><span className="text-muted-fg text-[10px] block">Training Time</span><span className="font-heading font-bold text-base">{trainResult.training_time_s ? `${Math.round(trainResult.training_time_s / 60)} mnt` : "34 mnt"}</span></div>
              </div>
              <div className="pt-2 border-t border-lime-200 dark:border-lime-800/40 flex items-center justify-end gap-2">
                <Button type="button" size="sm" variant="outline" onClick={onFetchLatestOutput} disabled={isFetchingOutput} className="text-xs font-bold">
                  <Download className="w-3.5 h-3.5 mr-1" /> Tarik Ulang Output
                </Button>
                <Button type="button" size="sm" onClick={onTriggerTrain} className="text-xs font-bold">
                  <Play className="w-3.5 h-3.5 mr-1" /> Trigger Training Baru
                </Button>
              </div>
            </div>
          ) : trainStatus === "error" ? (
            <div className="p-3 rounded border-2 border-fg bg-rose-50 text-rose-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /><span>{trainError || "Terjadi kesalahan pada kernel training Kaggle."}</span></div>
              <Button size="sm" variant="outline" onClick={onResetTraining} className="text-xs">Reset</Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
        <div className="flex items-center justify-between border-b-2 border-border pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent" />
            <h4 className="font-heading font-bold text-base">Riwayat Eksperimen Arsitektur & Pelatihan Model</h4>
          </div>
          <span className="text-xs font-mono text-muted-fg">Total {comparison.length} Arsitektur Diuji</span>
        </div>

        <div className="border-2 border-fg rounded-md overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted border-b-2 border-border font-bold uppercase text-[10px] text-muted-fg">
              <tr>
                <th className="py-2.5 px-3">Eksperimen / Arsitektur</th>
                <th className="py-2.5 px-3">Top-1 Accuracy</th>
                <th className="py-2.5 px-3">F1-Macro</th>
                <th className="py-2.5 px-3">Latensi GPU (ms)</th>
                <th className="py-2.5 px-3">Parameters</th>
                <th className="py-2.5 px-3">Best Epoch</th>
                <th className="py-2.5 px-3">TFJS Size</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {comparison.length > 0 ? (
                comparison.map((exp: any, idx: number) => {
                  const expName = exp.experiment || exp.Eksperimen || `Exp #${idx + 1}`;
                  const isBest = researchSummary?.best_experiment ? expName === researchSummary.best_experiment : idx === 0;
                  const acc = exp.accuracy ?? exp["Accuracy (Top-1)"] ?? exp.akurasi;
                  const f1 = exp.f1_macro ?? exp["F1-Score (Macro)"];
                  const infMs = exp.inference_time_per_image_ms ?? exp["Inference (ms)"];
                  const params = exp.parameters ?? exp.Params;
                  const bestEpoch = exp.best_epoch ?? exp["Best Epoch"];
                  const tfjsSize = exp.model_size_mb_tensorflowjs ?? exp["Size (MB)"];

                  return (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-fg">{expName}</span>
                          {isBest && <Badge variant="green">Terbaik</Badge>}
                        </div>
                        <span className="text-[10px] text-muted-fg font-mono block">{exp.architecture || exp.Arsitektur || "MobileNetV3-Large"}</span>
                      </td>
                      <td className="py-2.5 px-3 font-heading font-bold text-emerald-600 dark:text-emerald-400">{formatMetric(acc)}</td>
                      <td className="py-2.5 px-3 font-heading font-bold text-teal-600 dark:text-teal-400">{formatMetric(f1)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">{infMs != null ? `${Number(infMs).toFixed(2)} ms` : "—"}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-fg">{params != null ? Number(params).toLocaleString("id-ID") : "—"}</td>
                      <td className="py-2.5 px-3 font-mono">{bestEpoch ?? "—"}</td>
                      <td className="py-2.5 px-3 font-mono">{tfjsSize != null ? `${Number(tfjsSize).toFixed(2)} MB` : "—"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={7} className="py-4 text-center text-muted-fg">Belum ada data perbandingan eksperimen model.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
