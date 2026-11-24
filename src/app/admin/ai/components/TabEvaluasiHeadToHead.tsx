"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Target,
  Layers,
  Download,
  AlertTriangle,
  BarChart3,
  Cpu,
  Gauge,
  RefreshCw,
  CheckCircle2,
  History,
} from "lucide-react";
import type { AIModel } from "@/types/api";
import { downloadCsvFile } from "@/lib/utils/csv";
import { ApiError, fetchAuthorizedMediaBlobUrl } from "@/lib/api";
import { loadTfjs, loadCachedTfGraphModel, disposeTfModel } from "../hooks/useTfjsModel";

function formatMetric(val?: number | null, digits = 2): string {
  if (val == null || Number.isNaN(Number(val))) return "—";
  const num = Number(val);
  const pct = num <= 1 ? num * 100 : num;
  return `${pct.toFixed(digits)}%`;
}

function formatPpDiff(v1?: number | null, v2?: number | null): string {
  if (v1 == null || v2 == null) return "—";
  const p1 = v1 <= 1 ? v1 * 100 : v1;
  const p2 = v2 <= 1 ? v2 * 100 : v2;
  const diff = p1 - p2;
  if (Math.abs(diff) < 0.005) return "Seimbang (0.00%)";
  return diff > 0
    ? `+${diff.toFixed(2)}% keunggulan E1`
    : `+${Math.abs(diff).toFixed(2)}% keunggulan E2`;
}

function formatLatencyText(row: any): string {
  if (!row) return "—";
  const batchMs = row.inference_time_per_image_ms;
  const singleMs = row.inference_single_image_ms;
  const fps = row.fps;
  if (batchMs == null && singleMs == null) return "—";
  const mainMs = batchMs != null ? `${Number(batchMs).toFixed(2)} ms` : "—";
  const fpsTxt = fps != null ? ` (${Math.round(Number(fps))} FPS)` : "";
  const singleTxt =
    singleMs != null ? ` • single: ${Number(singleMs).toFixed(2)} ms` : "";
  return `${mainMs}${fpsTxt}${singleTxt}`;
}

function formatMisclassifiedText(row: any, fallbackTestCount: number): string {
  if (!row) return "—";
  const errCount = row.num_misclassified;
  const totalTest = row.num_test_images || fallbackTestCount;
  if (errCount == null || !totalTest) return "—";
  const pct = (Number(errCount) / Number(totalTest)) * 100;
  return `${errCount} dari ${totalTest} foto (${pct.toFixed(2)}%)`;
}

interface BrowserBenchResult {
  id: string;
  label: string;
  versi: string;
  arsitektur: string;
  aktif: boolean;
  backend: string;
  loadMs: number;
  meanMs: number;
  medianMs: number;
  p95Ms: number;
  fps: number;
  iterations: number;
  error?: string;
}

interface TabEvaluasiHeadToHeadProps {
  researchSummary: any;
  activeModel?: AIModel | null;
  models?: AIModel[];
  selectedRunId?: string | null;
  onSelectRun?: (runId: string) => void;
  isSwitchingRun?: boolean;
}

export function TabEvaluasiHeadToHead({
  researchSummary,
  activeModel,
  models = [],
  selectedRunId,
  onSelectRun,
  isSwitchingRun = false,
}: TabEvaluasiHeadToHeadProps) {
  const { toast } = useToast();
  const [selectedExp, setSelectedExp] = useState<"E1_MobileNetV3" | "E2_MobileNetV3_CBAM">(
    "E1_MobileNetV3"
  );
  const [plotType, setPlotType] = useState<"confusion_matrix" | "training_history">(
    "confusion_matrix"
  );

  // Fase C: Browser Real-Time TFJS Benchmark State
  const [benchIterations, setBenchIterations] = useState<number>(30);
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [benchResults, setBenchResults] = useState<BrowserBenchResult[]>([]);
  const [tfBackendName, setTfBackendName] = useState<string>("");

  const comparison: any[] = researchSummary?.comparison || [];
  const availableRuns: Array<{ run_id: string; label: string }> =
    researchSummary?.available_runs || [];
  const activeRunId = selectedRunId || researchSummary?.run_id || "default";
  const hasResearchOutput = availableRuns.length > 0 || comparison.length > 0;

  const [plotBlobUrl, setPlotBlobUrl] = useState<string | null>(null);
  const [plotLoading, setPlotLoading] = useState<boolean>(false);
  const [plotError, setPlotError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasResearchOutput) {
      setPlotBlobUrl(null);
      setPlotLoading(false);
      setPlotError(
        "Plot visualisasi belum tersedia di server. Klik 'Tarik Output Kaggle' pada tab Eksperimen Kaggle untuk mengunduh plot riset."
      );
      return;
    }

    const controller = new AbortController();
    let activeObjectUrl: string | null = null;
    let cancelled = false;

    setPlotLoading(true);
    setPlotError(null);
    setPlotBlobUrl(null);

    const plotUrl = `/api/media/research-plot?exp=${selectedExp}&type=${plotType}&run_id=${encodeURIComponent(activeRunId)}`;
    fetchAuthorizedMediaBlobUrl(plotUrl, controller.signal)
      .then((objectUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        activeObjectUrl = objectUrl;
        setPlotBlobUrl(objectUrl);
      })
      .catch((err: any) => {
        if (err?.name === "AbortError" || cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setPlotError(
            "Plot visualisasi belum tersedia di server (unduh output training Kaggle terlebih dahulu)."
          );
        } else {
          setPlotError(err?.message || "Gagal memuat visualisasi plot riset.");
        }
      })
      .finally(() => {
        if (!cancelled) setPlotLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
    };
  }, [selectedExp, plotType, activeRunId, hasResearchOutput]);

  const e1 =
    comparison.find((c) => c.experiment === "E1_MobileNetV3") || comparison[0] || null;
  const e2 =
    comparison.find((c) => c.experiment === "E2_MobileNetV3_CBAM") || comparison[1] || null;

  const expDetail = researchSummary?.experiments_detail?.[selectedExp] || {
    history: [],
    error_summary: [],
    classification_report: [],
    misclassified: [],
  };

  const perClassReport: any[] = (expDetail.classification_report || []).filter(
    (r: any) =>
      r.class_name &&
      !["accuracy", "macro avg", "weighted avg", "micro avg"].includes(
        String(r.class_name).toLowerCase()
      )
  );

  const totalClasses =
    perClassReport.length || researchSummary?.num_classes || researchSummary?.summary?.num_classes || 0;
  const testPartitionTotal =
    e1?.num_test_images ||
    e2?.num_test_images ||
    researchSummary?.dataset_split?.test ||
    perClassReport.reduce((acc, r) => acc + (Number(r.support) || 0), 0) ||
    0;

  const bestExpName =
    researchSummary?.best_experiment ||
    (e1 && e2
      ? Number(e2.accuracy ?? 0) > Number(e1.accuracy ?? 0)
        ? "E2_MobileNetV3_CBAM"
        : "E1_MobileNetV3"
      : e1?.experiment || "E1_MobileNetV3");

  const activeArsLower = String(activeModel?.arsitektur || "").toLowerCase();
  const isActiveMatchesBest = Boolean(
    activeModel &&
      ((bestExpName.includes("CBAM") && activeArsLower.includes("cbam")) ||
        (!bestExpName.includes("CBAM") && !activeArsLower.includes("cbam")))
  );

  // Dynamic diffs for Matrix
  const latencyDiffText = (() => {
    const l1 = e1?.inference_time_per_image_ms;
    const l2 = e2?.inference_time_per_image_ms;
    if (l1 == null || l2 == null) return "—";
    const diff = Number(l2) - Number(l1);
    if (Math.abs(diff) < 0.01) return "Setara";
    return diff > 0
      ? `E1 ${diff.toFixed(2)} ms lebih cepat`
      : `E2 ${Math.abs(diff).toFixed(2)} ms lebih cepat`;
  })();

  const paramDiffText = (() => {
    const p1 = e1?.parameters;
    const p2 = e2?.parameters;
    if (p1 == null || p2 == null) return "—";
    const diff = Number(p2) - Number(p1);
    const pct = p1 > 0 ? (Math.abs(diff) / Number(p1)) * 100 : 0;
    if (diff === 0) return "Sama";
    return diff > 0
      ? `+${diff.toLocaleString("id-ID")} param (+${pct.toFixed(1)}%) pada E2`
      : `+${Math.abs(diff).toLocaleString("id-ID")} param (+${pct.toFixed(1)}%) pada E1`;
  })();

  const sizeDiffText = (() => {
    const s1 = e1?.model_size_mb_tensorflowjs;
    const s2 = e2?.model_size_mb_tensorflowjs;
    if (s1 == null || s2 == null) return "—";
    const diff = Number(s2) - Number(s1);
    if (Math.abs(diff) < 0.01) return "Sama";
    return diff > 0
      ? `E1 lebih hemat ${diff.toFixed(2)} MB`
      : `E2 lebih hemat ${Math.abs(diff).toFixed(2)} MB`;
  })();

  const misclassifiedDiffText = (() => {
    const m1 = e1?.num_misclassified;
    const m2 = e2?.num_misclassified;
    if (m1 == null || m2 == null) return "—";
    const diff = Number(m2) - Number(m1);
    if (diff === 0) return "Jumlah salah prediksi sama";
    return diff > 0
      ? `E1 lebih akurat ${diff} sampel`
      : `E2 lebih akurat ${Math.abs(diff)} sampel`;
  })();

  const dynamicConclusion = (() => {
    if (!e1 || !e2) {
      return "Menunggu data perbandingan lengkap E1_MobileNetV3 dan E2_MobileNetV3_CBAM dari sesi training Kaggle.";
    }
    const acc1 = formatMetric(e1.accuracy);
    const acc2 = formatMetric(e2.accuracy);
    const f1_1 = formatMetric(e1.f1_macro);
    const f1_2 = formatMetric(e2.f1_macro);
    const ms1 = e1.inference_time_per_image_ms != null ? `${Number(e1.inference_time_per_image_ms).toFixed(2)} ms` : "—";
    const ms2 = e2.inference_time_per_image_ms != null ? `${Number(e2.inference_time_per_image_ms).toFixed(2)} ms` : "—";

    const e1BetterAcc = Number(e1.accuracy ?? 0) >= Number(e2.accuracy ?? 0);
    return e1BetterAcc
      ? `Model E1 (MobileNetV3-Large Baseline) mencapai akurasi Top-1 ${acc1} dan F1-Macro ${f1_1} dengan latensi GPU ${ms1}, mengungguli E2 (+CBAM: akurasi ${acc2}, F1-Macro ${f1_2}, latensi ${ms2}) pada dataset ${totalClasses || "produk"} kelas.`
      : `Model E2 (MobileNetV3-Large + CBAM Attention) mencapai akurasi Top-1 ${acc2} dan F1-Macro ${f1_2} (latensi GPU ${ms2}), mengungguli E1 Baseline (akurasi ${acc1}, F1-Macro ${f1_1}, latensi ${ms1}) pada dataset ${totalClasses || "produk"} kelas.`;
  })();

  // Export CSV
  const handleExportCsv = () => {
    if (perClassReport.length === 0) {
      toast.error("Data classification report tidak tersedia untuk diekspor");
      return;
    }

    const headers = ["class_name", "precision", "recall", "f1_score", "support"];
    const rows = perClassReport.map((r: any) => [
      r.class_name,
      r.precision ?? "",
      r.recall ?? "",
      r.f1_score ?? r["f1-score"] ?? "",
      r.support ?? "",
    ]);

    downloadCsvFile(
      `classification_report_${selectedExp}_${activeRunId}.csv`,
      headers,
      rows
    );
    toast.success("Laporan classification report berhasil diunduh!");
  };

  // Fase C: Jalankan Benchmark Nyata TFJS di Browser
  const handleRunBrowserBenchmark = async () => {
    const candidatesRaw = models.filter((m) => Boolean(m.model_json_url));
    if (candidatesRaw.length === 0 && activeModel?.model_json_url) {
      candidatesRaw.push(activeModel);
    }

    if (candidatesRaw.length === 0) {
      toast.error("Belum ada model TFJS terdaftar yang memiliki URL model.json untuk di-benchmark.");
      return;
    }

    // Prioritaskan pasangan E1 Baseline + E2 CBAM terbaru + model aktif bila berbeda
    const latestE1 = candidatesRaw.find(
      (m) => !String(m.arsitektur || "").toLowerCase().includes("cbam")
    );
    const latestE2 = candidatesRaw.find((m) =>
      String(m.arsitektur || "").toLowerCase().includes("cbam")
    );
    const targets: AIModel[] = [];
    if (latestE1) targets.push(latestE1);
    if (latestE2 && !targets.some((t) => t.id === latestE2.id)) targets.push(latestE2);
    if (activeModel?.model_json_url && !targets.some((t) => t.id === activeModel.id)) {
      targets.unshift(activeModel);
    }
    if (targets.length === 0) {
      targets.push(...candidatesRaw.slice(0, 2));
    }

    setIsBenchmarking(true);
    setBenchResults([]);

    try {
      const tf = await loadTfjs();
      const backend = tf.getBackend() || "unknown";
      setTfBackendName(backend);

      const results: BrowserBenchResult[] = [];

      for (const m of targets) {
        const modelUrl = m.model_json_url!;
        const isCbam = String(m.arsitektur || "").toLowerCase().includes("cbam");
        const label = isCbam ? "E2 (MobileNetV3 + CBAM)" : "E1 (MobileNetV3 Baseline)";

        let loadedModel: any = null;
        let loadMs = 0;

        try {
          const loadStart = performance.now();
          loadedModel = await loadCachedTfGraphModel(modelUrl);
          loadMs = performance.now() - loadStart;

          const syntheticInput = tf.randomUniform([1, 224, 224, 3], 0, 255, "float32");

          // Warmup 5x
          for (let w = 0; w < 5; w++) {
            const outRaw = loadedModel.predict(syntheticInput);
            const outTensor = Array.isArray(outRaw) ? outRaw[0] : outRaw;
            await outTensor.data();
            if (Array.isArray(outRaw)) {
              outRaw.forEach((t: any) => t?.dispose?.());
            } else {
              outTensor?.dispose?.();
            }
          }

          // Timed single-image iterations
          const latencies: number[] = [];
          for (let i = 0; i < benchIterations; i++) {
            const t0 = performance.now();
            const outRaw = loadedModel.predict(syntheticInput);
            const outTensor = Array.isArray(outRaw) ? outRaw[0] : outRaw;
            await outTensor.data();
            latencies.push(performance.now() - t0);
            if (Array.isArray(outRaw)) {
              outRaw.forEach((t: any) => t?.dispose?.());
            } else {
              outTensor?.dispose?.();
            }
          }

          syntheticInput.dispose();

          const sorted = [...latencies].sort((a, b) => a - b);
          const meanMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
          const medianMs = sorted[Math.floor(sorted.length / 2)] || meanMs;
          const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
          const p95Ms = sorted[p95Idx] || meanMs;
          const fps = meanMs > 0 ? 1000 / meanMs : 0;

          results.push({
            id: m.id,
            label,
            versi: m.versi,
            arsitektur: m.arsitektur,
            aktif: Boolean(m.aktif),
            backend,
            loadMs,
            meanMs,
            medianMs,
            p95Ms,
            fps,
            iterations: benchIterations,
          });
        } catch (err: any) {
          results.push({
            id: m.id,
            label,
            versi: m.versi,
            arsitektur: m.arsitektur,
            aktif: Boolean(m.aktif),
            backend,
            loadMs,
            meanMs: 0,
            medianMs: 0,
            p95Ms: 0,
            fps: 0,
            iterations: benchIterations,
            error: err?.message || "Gagal benchmark model",
          });
        } finally {
          disposeTfModel(loadedModel);
        }
      }

      setBenchResults(results);
      toast.success(`Benchmark TFJS peramban (${backend.toUpperCase()}) selesai!`);
    } catch (err: any) {
      toast.error(err?.message || "Gagal menginisialisasi TensorFlow.js di browser");
    } finally {
      setIsBenchmarking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner + Status Model Aktif POS vs Sesi Training */}
      <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">📈</span>
              <h3 className="font-heading font-black text-lg">
                Evaluasi Riset &amp; Matriks Head-to-Head Model
              </h3>
              <Badge variant="purple">Skripsi Research Report</Badge>
            </div>
            <p className="text-xs text-muted-fg">
              Perbandingan model Baseline (MobileNetV3-Large) vs Proposed (MobileNetV3-Large + CBAM)
              {totalClasses > 0 ? ` pada ${totalClasses} kelas produk ritel Tokiva.` : "."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs font-bold shrink-0"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Ekspor Laporan CSV
          </Button>
        </div>

        {/* Status Strip: Model Aktif Kasir POS vs Sumber Data Evaluasi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t-2 border-border text-xs">
          <div className="p-3 rounded-md border-2 border-fg bg-muted/20 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-fg block">
                Model Aktif Dipakai Kasir POS
              </span>
              {activeModel ? (
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="font-mono font-bold text-fg">{activeModel.versi}</span>
                  <span className="text-[11px] text-muted-fg">({activeModel.arsitektur})</span>
                  <Badge variant="green">● LIVE AKTIF</Badge>
                </div>
              ) : (
                <span className="text-muted-fg mt-0.5 block">Belum ada model aktif di POS</span>
              )}
            </div>
            {activeModel && (
              <Badge variant={isActiveMatchesBest ? "green" : "yellow"}>
                {isActiveMatchesBest ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 inline mr-1" /> Sesuai Terbaik Riset
                  </>
                ) : (
                  "Beda Varian Riset"
                )}
              </Badge>
            )}
          </div>

          <div className="p-3 rounded-md border-2 border-fg bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase text-muted-fg flex items-center gap-1">
                <History className="w-3 h-3" /> Sumber Data Evaluasi (Hasil Training Kaggle)
              </span>
              <span className="font-semibold text-[11px] text-fg block truncate mt-0.5">
                {researchSummary?.run_label || "Sesi Training Terbaru"}
              </span>
            </div>
            {availableRuns.length > 0 && onSelectRun && (
              <select
                value={activeRunId}
                disabled={isSwitchingRun}
                onChange={(e) => onSelectRun(e.target.value)}
                className="px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-semibold shrink-0"
              >
                {availableRuns.map((run) => (
                  <option key={run.run_id} value={run.run_id}>
                    {run.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* 2. Side-by-Side Comparison Matrix (Sinkron Paper Skripsi — Tanpa AUC & Tanpa Hardcode) */}
      <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
        <div className="flex items-center justify-between gap-2 border-b-2 border-border pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent" />
            <h4 className="font-heading font-bold text-base">
              Matriks Perbandingan Head-to-Head (E1 Baseline vs E2 CBAM)
            </h4>
          </div>
          <span className="text-[11px] font-mono text-muted-fg">
            Metrik Bab II &amp; III Skripsi
          </span>
        </div>

        <div className="border-2 border-fg rounded-md overflow-hidden bg-card">
          <table className="w-full text-left text-xs font-body">
            <thead className="bg-muted border-b-2 border-border font-bold uppercase text-[10px] text-muted-fg">
              <tr>
                <th className="py-2.5 px-3">Metrik Evaluasi Ilmiah</th>
                <th className="py-2.5 px-3 bg-lime-50/50 dark:bg-lime-950/20 text-lime-900 dark:text-lime-200">
                  E1: MobileNetV3 (Baseline) {bestExpName === "E1_MobileNetV3" ? "🏆" : ""}
                </th>
                <th className="py-2.5 px-3 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200">
                  E2: MobileNetV3 + CBAM (Proposed){" "}
                  {bestExpName === "E2_MobileNetV3_CBAM" ? "🏆" : ""}
                </th>
                <th className="py-2.5 px-3">Selisih &amp; Analisis</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              <tr>
                <td className="py-2.5 px-3 font-semibold">Top-1 Accuracy</td>
                <td className="py-2.5 px-3 font-heading font-bold text-emerald-600 bg-lime-50/30 dark:bg-lime-950/10 text-sm">
                  {formatMetric(e1?.accuracy)}
                </td>
                <td className="py-2.5 px-3 font-heading font-bold text-teal-600 bg-purple-50/30 dark:bg-purple-950/10 text-sm">
                  {formatMetric(e2?.accuracy)}
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-muted-fg">
                  {formatPpDiff(e1?.accuracy, e2?.accuracy)}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-semibold">Macro Precision</td>
                <td className="py-2.5 px-3 font-mono font-bold bg-lime-50/30 dark:bg-lime-950/10">
                  {formatMetric(e1?.precision_macro)}
                </td>
                <td className="py-2.5 px-3 font-mono font-bold bg-purple-50/30 dark:bg-purple-950/10">
                  {formatMetric(e2?.precision_macro)}
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-muted-fg">
                  {formatPpDiff(e1?.precision_macro, e2?.precision_macro)}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-semibold">Macro Recall</td>
                <td className="py-2.5 px-3 font-mono font-bold bg-lime-50/30 dark:bg-lime-950/10">
                  {formatMetric(e1?.recall_macro)}
                </td>
                <td className="py-2.5 px-3 font-mono font-bold bg-purple-50/30 dark:bg-purple-950/10">
                  {formatMetric(e2?.recall_macro)}
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-muted-fg">
                  {formatPpDiff(e1?.recall_macro, e2?.recall_macro)}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-semibold">Macro F1-Score</td>
                <td className="py-2.5 px-3 font-heading font-bold text-emerald-600 bg-lime-50/30 dark:bg-lime-950/10">
                  {formatMetric(e1?.f1_macro)}
                </td>
                <td className="py-2.5 px-3 font-heading font-bold text-teal-600 bg-purple-50/30 dark:bg-purple-950/10">
                  {formatMetric(e2?.f1_macro)}
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-muted-fg">
                  {formatPpDiff(e1?.f1_macro, e2?.f1_macro)}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-semibold">Inference Latency (Kaggle GPU / Keras)</td>
                <td className="py-2.5 px-3 font-mono font-bold text-amber-600 bg-lime-50/30 dark:bg-lime-950/10">
                  {formatLatencyText(e1)}
                </td>
                <td className="py-2.5 px-3 font-mono font-bold text-amber-600 bg-purple-50/30 dark:bg-purple-950/10">
                  {formatLatencyText(e2)}
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-muted-fg">
                  {latencyDiffText}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-semibold">Total Parameter Model</td>
                <td className="py-2.5 px-3 font-mono bg-lime-50/30 dark:bg-lime-950/10">
                  {e1?.parameters != null ? `${Number(e1.parameters).toLocaleString("id-ID")} parameter` : "—"}
                </td>
                <td className="py-2.5 px-3 font-mono bg-purple-50/30 dark:bg-purple-950/10">
                  {e2?.parameters != null ? `${Number(e2.parameters).toLocaleString("id-ID")} parameter` : "—"}
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-muted-fg">
                  {paramDiffText}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-semibold">Ukuran Bundel TFJS</td>
                <td className="py-2.5 px-3 font-mono bg-lime-50/30 dark:bg-lime-950/10">
                  {e1?.model_size_mb_tensorflowjs != null
                    ? `${Number(e1.model_size_mb_tensorflowjs).toFixed(2)} MB`
                    : "—"}
                </td>
                <td className="py-2.5 px-3 font-mono bg-purple-50/30 dark:bg-purple-950/10">
                  {e2?.model_size_mb_tensorflowjs != null
                    ? `${Number(e2.model_size_mb_tensorflowjs).toFixed(2)} MB`
                    : "—"}
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-muted-fg">
                  {sizeDiffText}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-semibold">Misclassified Samples</td>
                <td className="py-2.5 px-3 font-mono font-bold text-rose-600 bg-lime-50/30 dark:bg-lime-950/10">
                  {formatMisclassifiedText(e1, testPartitionTotal)}
                </td>
                <td className="py-2.5 px-3 font-mono font-bold text-rose-600 bg-purple-50/30 dark:bg-purple-950/10">
                  {formatMisclassifiedText(e2, testPartitionTotal)}
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-muted-fg">
                  {misclassifiedDiffText}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2b. Fase C: Benchmark Latensi Nyata Peramban (TensorFlow.js Client-Side) */}
      <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-border pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Gauge className="w-5 h-5 text-accent" />
              <h4 className="font-heading font-bold text-base">
                Benchmark Latensi Nyata Peramban (TensorFlow.js Client-Side)
              </h4>
              {tfBackendName && <Badge variant="blue">Backend: {tfBackendName.toUpperCase()}</Badge>}
            </div>
            <p className="text-xs text-muted-fg mt-0.5">
              Mengukur waktu inferensi 1 citra (224×224×3) secara langsung di browser perangkat ini
              menggunakan <code className="font-mono">@tensorflow/tfjs</code> untuk kebutuhan data uji Bab IV skripsi.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={benchIterations}
              onChange={(e) => setBenchIterations(Number(e.target.value) || 30)}
              disabled={isBenchmarking}
              className="px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-bold"
            >
              <option value={30}>30 iterasi (+5 warmup)</option>
              <option value={50}>50 iterasi (+5 warmup)</option>
              <option value={100}>100 iterasi (+5 warmup)</option>
            </select>

            <Button
              type="button"
              size="sm"
              onClick={handleRunBrowserBenchmark}
              disabled={isBenchmarking}
              className="text-xs font-bold shadow-pop-soft"
            >
              {isBenchmarking ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Menguji Browser...
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5 mr-1.5" /> Jalankan Benchmark Browser
                </>
              )}
            </Button>
          </div>
        </div>

        {benchResults.length > 0 ? (
          <div className="border-2 border-fg rounded-md overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted border-b-2 border-border font-bold uppercase text-[10px] text-muted-fg">
                <tr>
                  <th className="py-2 px-3">Model Terdaftar</th>
                  <th className="py-2 px-3">Versi</th>
                  <th className="py-2 px-3">Load Time</th>
                  <th className="py-2 px-3">Rata-Rata (ms/img)</th>
                  <th className="py-2 px-3">Median / P95</th>
                  <th className="py-2 px-3">Throughput (FPS)</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border">
                {benchResults.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/25">
                    <td className="py-2 px-3 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span>{b.label}</span>
                        {b.aktif && <Badge variant="green">POS Aktif</Badge>}
                      </div>
                      <span className="text-[10px] text-muted-fg block">{b.arsitektur}</span>
                    </td>
                    <td className="py-2 px-3 font-mono">{b.versi}</td>
                    {b.error ? (
                      <td colSpan={4} className="py-2 px-3 text-rose-600 font-semibold">
                        Error: {b.error}
                      </td>
                    ) : (
                      <>
                        <td className="py-2 px-3 font-mono">{Math.round(b.loadMs)} ms</td>
                        <td className="py-2 px-3 font-heading font-bold text-amber-600">
                          {b.meanMs.toFixed(2)} ms
                        </td>
                        <td className="py-2 px-3 font-mono text-muted-fg">
                          {b.medianMs.toFixed(2)} / {b.p95Ms.toFixed(2)} ms
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-600">
                          {b.fps.toFixed(1)} FPS
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-fg">
            Klik <strong>Jalankan Benchmark Browser</strong> untuk mengukur latensi nyata TFJS di browser pada perangkat saat ini.
          </p>
        )}
      </div>

      {/* 3. Visual Plots & Confusion Matrix Viewer */}
      <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-border pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h4 className="font-heading font-bold text-base">
              Visualisasi Riset &amp; Kurva Pelatihan Kaggle
            </h4>
          </div>

          {/* Toggle Experiment & Plot Type */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-muted p-1 rounded border border-border">
              <span className="text-[10px] font-bold text-muted-fg uppercase px-1">Eksperimen:</span>
              <button
                type="button"
                onClick={() => setSelectedExp("E1_MobileNetV3")}
                className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                  selectedExp === "E1_MobileNetV3" ? "bg-accent text-accent-fg" : "text-muted-fg hover:text-fg"
                }`}
              >
                E1 MobileNetV3
              </button>
              <button
                type="button"
                onClick={() => setSelectedExp("E2_MobileNetV3_CBAM")}
                className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                  selectedExp === "E2_MobileNetV3_CBAM" ? "bg-accent text-accent-fg" : "text-muted-fg hover:text-fg"
                }`}
              >
                E2 + CBAM Attention
              </button>
            </div>

            <div className="flex items-center gap-1 bg-muted p-1 rounded border border-border">
              <button
                type="button"
                onClick={() => setPlotType("confusion_matrix")}
                className={`px-2.5 py-0.5 rounded font-bold text-[11px] ${
                  plotType === "confusion_matrix" ? "bg-accent text-accent-fg" : "text-muted-fg hover:text-fg"
                }`}
              >
                Confusion Matrix
              </button>
              <button
                type="button"
                onClick={() => setPlotType("training_history")}
                className={`px-2.5 py-0.5 rounded font-bold text-[11px] ${
                  plotType === "training_history" ? "bg-accent text-accent-fg" : "text-muted-fg hover:text-fg"
                }`}
              >
                Kurva Epoch
              </button>
            </div>
          </div>
        </div>

        {/* Plot Image Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 p-3 rounded-md border-2 border-fg bg-slate-950 flex items-center justify-center min-h-[360px]">
            {plotLoading ? (
              <div className="text-slate-300 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-accent" />
                <span>Memuat plot riset...</span>
              </div>
            ) : plotBlobUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={plotBlobUrl}
                alt={`${selectedExp} ${plotType}`}
                className="max-h-[500px] w-auto object-contain rounded"
              />
            ) : (
              <div className="text-slate-400 text-xs text-center max-w-sm space-y-2 p-4">
                <AlertTriangle className="w-6 h-6 mx-auto text-amber-400" />
                <p>{plotError || "Visualisasi plot riset belum tersedia."}</p>
              </div>
            )}
          </div>

          {/* Right: Error summary / Confusion analysis */}
          <div className="lg:col-span-4 space-y-3">
            <div className="p-3.5 rounded-md border-2 border-fg bg-card space-y-2.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Analisis Pasangan Tertukar (Error Summary)</span>
              </div>
              <p className="text-[11px] text-muted-fg leading-relaxed">
                Sampel test citra kemasan yang mengalami salah klasifikasi pada {selectedExp}:
              </p>

              {expDetail.error_summary && expDetail.error_summary.length > 0 ? (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {expDetail.error_summary.map((err: any, idx: number) => {
                    const trueName = err.true_label || err.true_class || "—";
                    const predName = err.most_confused_with || err.predicted_class || "—";
                    const errCount = err.total_errors ?? err.count ?? 0;
                    const avgConf = err.avg_confidence;
                    return (
                      <div
                        key={idx}
                        className="p-2 rounded border border-border bg-muted/30 text-xs space-y-0.5"
                      >
                        <div className="flex justify-between items-center gap-2 font-bold">
                          <span className="text-fg font-mono text-[11px] truncate" title={trueName}>
                            {trueName}
                          </span>
                          <span className="text-rose-600 font-mono shrink-0">{errCount}x tertukar</span>
                        </div>
                        <p className="text-[10px] text-muted-fg">
                          Diprediksi salah sebagai:{" "}
                          <strong className="text-rose-500 font-mono">{predName}</strong>
                          {avgConf != null && (
                            <span className="ml-1 font-mono text-muted-fg">
                              ({(Number(avgConf) * 100).toFixed(1)}% conf)
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-muted-fg bg-muted rounded">
                  Tidak ada kesalahan klasifikasi yang terdeteksi.
                </div>
              )}
            </div>

            <div className="p-3 rounded-md border-2 border-fg bg-muted/20 text-xs text-muted-fg space-y-1">
              <span className="font-bold text-fg block">Kesimpulan Riset:</span>
              <p className="text-[11px] leading-relaxed">{dynamicConclusion}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Per-Class Classification Report Table */}
      <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
        <div className="flex items-center justify-between border-b-2 border-border pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            <h4 className="font-heading font-bold text-base">
              Laporan Evaluasi Per-Kelas Produk ({totalClasses} Kelas — {selectedExp})
            </h4>
          </div>
          <span className="text-xs font-mono text-muted-fg">
            Test Partition: {testPartitionTotal} Citra
          </span>
        </div>

        <div className="border-2 border-fg rounded-md overflow-hidden bg-card max-h-[400px] overflow-y-auto">
          <table className="w-full text-left text-xs font-body">
            <thead className="bg-muted border-b-2 border-border font-bold uppercase text-[10px] text-muted-fg sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Label Kelas Produk</th>
                <th className="py-2.5 px-3">Precision</th>
                <th className="py-2.5 px-3">Recall</th>
                <th className="py-2.5 px-3">F1-Score</th>
                <th className="py-2.5 px-3 text-center">Support (Test)</th>
                <th className="py-2.5 px-3">Status Performa</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {perClassReport.length > 0 ? (
                perClassReport.map((cls: any, idx: number) => {
                  const f1 = cls.f1_score ?? cls["f1-score"] ?? 0;
                  const isPerfect = Number(f1) >= 0.999;
                  return (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-2 px-3 font-semibold font-mono text-xs">
                        {cls.class_name || cls.Class || `Class ${idx}`}
                      </td>
                      <td className="py-2 px-3 font-mono">{formatMetric(cls.precision)}</td>
                      <td className="py-2 px-3 font-mono">{formatMetric(cls.recall)}</td>
                      <td className="py-2 px-3 font-heading font-bold text-emerald-600">
                        {formatMetric(f1)}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">{cls.support ?? "—"}</td>
                      <td className="py-2 px-3">
                        {isPerfect ? (
                          <Badge variant="green">100% Sempurna</Badge>
                        ) : Number(f1) >= 0.9 ? (
                          <Badge variant="yellow">&gt; 90% Akurat</Badge>
                        ) : (
                          <Badge variant="red">Perlu Kurasi</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-fg">
                    Data classification report belum tersedia untuk sesi training ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
