"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Layers,
  Database,
  Cpu,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  Activity,
  HardDrive,
  GitBranch,
} from "lucide-react";
import type { AIKelas, AIModel, AISampel } from "@/types/api";

function formatMetric(val?: number | null): string {
  if (val == null || Number.isNaN(Number(val))) return "—";
  const num = Number(val);
  const pct = num <= 1 ? num * 100 : num;
  return `${pct.toFixed(1)}%`;
}

interface TabRingkasanProps {
  models: AIModel[];
  activeModel: AIModel | null;
  kelasList: AIKelas[];
  totalSampel: number;
  sampelList?: AISampel[];
  hfStats: any;
  onNavigateTab: (tab: string) => void;
}

export function TabRingkasan({
  models,
  activeModel,
  kelasList,
  totalSampel,
  hfStats,
  onNavigateTab,
}: TabRingkasanProps) {
  // Counts
  const totalHfSynced = hfStats?.total_tersinkron_hf ?? hfStats?.total_synced ?? kelasList.reduce((acc, k) => acc + (k.jml_hf || k.foto_tersinkron_hf || 0), 0);
  const totalVerified = hfStats?.total_terverifikasi ?? totalHfSynced;
  const totalPendingValidation = hfStats?.total_menunggu_validasi ?? Math.max(0, totalSampel - totalVerified);
  const verifiedPct = totalSampel > 0 ? (totalVerified === totalSampel ? "100" : ((totalVerified / totalSampel) * 100).toFixed(1)) : "0";
  const readyClassCount = kelasList.filter(
    (k) => k.status === "Siap Training" || (k.total_foto || 0) >= (k.target_foto || 100)
  ).length;

  const steps = [
    { id: "dataset", label: "1. Akuisisi Data", desc: "Kamera burst & video 360", tab: "dataset" },
    { id: "validasi", label: "2. Validasi Kualitas", desc: "Kurasi & koreksi kasir", tab: "validasi" },
    { id: "dataset-hf", label: "3. Sync Hugging Face", desc: hfStats?.repo_hf ? `Hub ${hfStats.repo_hf}` : "Private Hugging Face Hub", tab: "dataset" },
    { id: "eksperimen", label: "4. Kaggle GPU T4x2", desc: "Automated training pipeline", tab: "eksperimen" },
    { id: "evaluasi", label: "5. Evaluasi Head-to-Head", desc: "MobileNetV3 vs +CBAM", tab: "evaluasi" },
    { id: "deploy", label: "6. Deploy & Testing TFJS", desc: "Sandbox live & 3-tier threshold", tab: "deploy" },
    { id: "log", label: "7. POS Monitoring", desc: "Audit log inferensi kasir", tab: "log" },
  ];

  return (
    <div className="space-y-6">
      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-4 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-fg uppercase tracking-wider">Total Dataset Citra</span>
            <div className="w-8 h-8 rounded-md bg-admin/20 border-2 border-fg flex items-center justify-center text-admin">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="font-heading font-black text-2xl">{totalSampel.toLocaleString("id-ID")}</h3>
            <p className="text-[11px] text-muted-fg">
              {totalHfSynced.toLocaleString("id-ID")} tersinkron Hugging Face Hub
            </p>
          </div>
          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
            <span className="text-muted-fg">Validasi:</span>
            <span className="font-bold text-lime-600 dark:text-lime-400">
              {totalVerified.toLocaleString("id-ID")} Foto ({verifiedPct}%)
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-4 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-fg uppercase tracking-wider">Kelas Produk AI</span>
            <div className="w-8 h-8 rounded-md bg-lime-100 border-2 border-fg flex items-center justify-center text-lime-800">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="font-heading font-black text-2xl">{kelasList.length}</h3>
            <p className="text-[11px] text-muted-fg">
              Kelas aktif klasifikasi kemasan ritel
            </p>
          </div>
          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
            <span className="text-muted-fg">Siap Training:</span>
            <span className="font-bold text-admin">
              {readyClassCount} / {kelasList.length} Kelas
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-4 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-fg uppercase tracking-wider">Model Terdaftar</span>
            <div className="w-8 h-8 rounded-md bg-amber-100 border-2 border-fg flex items-center justify-center text-amber-800">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="font-heading font-black text-2xl">{models.length}</h3>
            <p className="text-[11px] text-muted-fg">
              Baseline & Proposed CBAM Attention
            </p>
          </div>
          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
            <span className="text-muted-fg">Format:</span>
            <span className="font-bold font-mono text-[10px]">TFJS GraphModel (224x224)</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-4 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-fg uppercase tracking-wider">Model Aktif POS</span>
            <div className="w-8 h-8 rounded-md bg-emerald-100 border-2 border-fg flex items-center justify-center text-emerald-800">
              <Brain className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="font-heading font-black text-lg truncate">
              {activeModel ? activeModel.versi : "Belum Ada"}
            </h3>
            <p className="text-[11px] text-muted-fg truncate">
              {activeModel?.arsitektur || "MobileNetV3"}
            </p>
          </div>
          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
            <span className="text-muted-fg">Top-1 Val:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formatMetric(activeModel?.akurasi_top1)} (Latensi {activeModel?.latensi_ms != null ? `${activeModel.latensi_ms.toFixed(1)}ms` : "—"})
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Dataset Status & Active Model */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dataset Breakdown */}
        <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
          <div className="flex items-center justify-between border-b-2 border-border pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-admin" />
              <h4 className="font-heading font-bold text-base">Status Komposisi Dataset</h4>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigateTab("dataset")}
              className="text-xs font-bold"
            >
              Kelola Dataset <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            {/* Progress item 1 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-500" /> Terverifikasi Masuk Dataset
                </span>
                <span className="font-mono font-bold">{totalVerified.toLocaleString("id-ID")} foto</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-lime-500"
                  style={{ width: `${totalSampel > 0 ? (totalVerified / totalSampel) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Progress item 2 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Tersinkron ke Hugging Face Hub
                </span>
                <span className="font-mono font-bold">{totalHfSynced.toLocaleString("id-ID")} foto</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-sky-500"
                  style={{ width: `${totalSampel > 0 ? (totalHfSynced / totalSampel) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Progress item 3 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Menunggu Validasi & Kurasi
                </span>
                <span className="font-mono font-bold">{totalPendingValidation.toLocaleString("id-ID")} foto</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${totalSampel > 0 ? (totalPendingValidation / totalSampel) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-md border-2 border-fg bg-muted/30 text-xs text-muted-fg space-y-1">
            <span className="font-bold text-fg block">Hugging Face Repository Dataset:</span>
            <span className="font-mono text-[11px] block text-admin font-bold">
              {hfStats?.repo_hf || "Belum dikonfigurasi (.env)"} (Private Storage)
            </span>
            <span className="text-[11px] block">
              Dataset di-split otomatis menjadi 70% Train, 15% Val, dan 15% Test saat pipeline training Kaggle berjalan.
            </span>
          </div>
        </div>

        {/* Model Live Info */}
        <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
          <div className="flex items-center justify-between border-b-2 border-border pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-admin" />
              <h4 className="font-heading font-bold text-base">Model Produksi Aktif</h4>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigateTab("deploy")}
              className="text-xs font-bold"
            >
              Registri Model <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {activeModel ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-md border-2 border-fg bg-muted/20 flex items-center justify-between">
                <div>
                  <h5 className="font-heading font-bold text-sm">{activeModel.nama_model || activeModel.arsitektur}</h5>
                  <p className="font-mono text-muted-fg text-[11px]">{activeModel.versi}</p>
                </div>
                <Badge variant="green">● LIVE AKTIF</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded border border-border bg-card">
                  <span className="text-muted-fg text-[10px] uppercase font-bold block">Top-1 Accuracy</span>
                  <span className="font-heading font-bold text-base text-emerald-600 dark:text-emerald-400">
                    {formatMetric(activeModel.akurasi_top1)}
                  </span>
                </div>
                <div className="p-2 rounded border border-border bg-card">
                  <span className="text-muted-fg text-[10px] uppercase font-bold block">Latensi TFJS</span>
                  <span className="font-heading font-bold text-base text-amber-600 dark:text-amber-400">
                    {activeModel.latensi_ms != null ? `${activeModel.latensi_ms.toFixed(1)} ms` : "—"}
                  </span>
                </div>
                <div className="p-2 rounded border border-border bg-card">
                  <span className="text-muted-fg text-[10px] uppercase font-bold block">Jumlah Kelas</span>
                  <span className="font-heading font-bold text-base">
                    {activeModel.jml_kelas ? `${activeModel.jml_kelas} Kelas` : "—"}
                  </span>
                </div>
                <div className="p-2 rounded border border-border bg-card">
                  <span className="text-muted-fg text-[10px] uppercase font-bold block">Ukuran Model</span>
                  <span className="font-heading font-bold text-base">
                    {activeModel.ukuran_mb || activeModel.ukuran_model_mb ? `${activeModel.ukuran_mb || activeModel.ukuran_model_mb} MB` : "—"}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-muted-fg font-mono truncate">
                Storage: {activeModel.model_json_url}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-muted-fg space-y-2">
              <p className="text-xs">Belum ada model aktif di production.</p>
              <Button size="sm" variant="admin" onClick={() => onNavigateTab("deploy")}>
                Pilih Model untuk Diaktifkan
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 7-Step Pipeline Workflow Stepper */}
      <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-3">
        <div className="flex items-center gap-2 border-b-2 border-border pb-2">
          <Sparkles className="w-5 h-5 text-admin" />
          <h4 className="font-heading font-bold text-base">Alur Kerja MLOps Tokiva AI (7-Step Lifecycle)</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {steps.map((st, idx) => (
            <button
              key={st.id}
              type="button"
              onClick={() => onNavigateTab(st.tab)}
              className="p-2.5 rounded-md border-2 border-fg bg-card hover:bg-muted text-left transition-all hover:scale-[1.02] flex flex-col justify-between group"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-admin block">
                  Tahap {idx + 1}
                </span>
                <h5 className="font-bold text-xs mt-0.5 group-hover:text-admin transition-colors">
                  {st.label.replace(/^\d+\.\s*/, "")}
                </h5>
                <p className="text-[10px] text-muted-fg mt-1 leading-tight">{st.desc}</p>
              </div>
              <div className="mt-2 text-right">
                <span className="text-[10px] font-bold text-muted-fg group-hover:text-fg inline-flex items-center gap-1">
                  Buka <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

