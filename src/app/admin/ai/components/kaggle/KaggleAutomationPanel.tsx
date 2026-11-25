"use client";

import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AutomationDeltaMetrics,
  AutomationSchedulerStatus,
  AutomationTrainingConfig,
} from "@/lib/services/ai.service";
import { shortCommit } from "./kaggle-helpers";
import { Clock, Cpu, RefreshCw, Save } from "lucide-react";

/** Panel 2: Otomatisasi jadwal pelatihan model GPU & gate delta sampel */
export function KaggleAutomationPanel({
  trainForm,
  trainStatus,
  deltaMetrics,
  schedulerStatus,
  isTriggeringAutoTrain,
  isSavingTrain,
  onChangeTrainForm,
  onRunTrainDeltaCheck,
  onSaveTrainConfig,
}: {
  trainForm: AutomationTrainingConfig;
  trainStatus: string;
  deltaMetrics: AutomationDeltaMetrics | null;
  schedulerStatus: AutomationSchedulerStatus | null;
  isTriggeringAutoTrain: boolean;
  isSavingTrain: boolean;
  onChangeTrainForm: React.Dispatch<React.SetStateAction<AutomationTrainingConfig>>;
  onRunTrainDeltaCheck: (force: boolean) => void;
  onSaveTrainConfig: () => void;
}) {
  return (
    <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-admin" />
            <h3 className="font-heading font-black text-base">Otomatisasi Training GPU (Cron &amp; Event)</h3>
            <Badge variant="purple">Smart Delta</Badge>
          </div>
          <p className="text-xs text-muted-fg mt-0.5">Hemat kuota GPU T4x2: hanya melatih ulang jika terdapat dataset/sampel baru.</p>
        </div>
        <Badge variant={schedulerStatus?.training_event_mode || schedulerStatus?.training_scheduled ? "green" : "gray"}>
          {schedulerStatus?.training_event_mode ? "ON_NEW_DATASET" : schedulerStatus?.training_cron || "Nonaktif"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded border-2 border-fg bg-muted/20">
          <span className="text-[10px] font-bold uppercase text-muted-fg block">Tambahan Sampel Baru</span>
          <span className="font-mono font-bold text-sm mt-0.5 block">+{deltaMetrics?.new_samples_since_last_train ?? 0} foto (min {trainForm.min_new_samples})</span>
        </div>
        <div className="p-2.5 rounded border-2 border-fg bg-muted/20">
          <span className="text-[10px] font-bold uppercase text-muted-fg block">Total Sampel di HF</span>
          <span className="font-mono font-bold text-sm mt-0.5 block">{deltaMetrics?.total_hf_samples ?? 0} citra terverifikasi</span>
        </div>
        <div className="p-2.5 rounded border-2 border-fg bg-muted/20">
          <span className="text-[10px] font-bold uppercase text-muted-fg block">Commit Trained Terakhir</span>
          <span className="font-mono font-bold text-xs mt-0.5 block">{shortCommit(trainForm.last_trained_hf_commit)}</span>
        </div>
        <div className="p-2.5 rounded border-2 border-fg bg-muted/20">
          <span className="text-[10px] font-bold uppercase text-muted-fg block">Model Terdaftar Terakhir</span>
          <span className="font-mono font-bold text-xs mt-0.5 block truncate">{trainForm.last_registered_version || "Belum ada"}</span>
        </div>
      </div>

      <div className="p-3.5 rounded-md border-2 border-fg bg-muted/30 space-y-3 text-xs">
        <label className="flex items-center gap-2 font-bold cursor-pointer">
          <input type="checkbox" checked={trainForm.enabled} onChange={(e) => onChangeTrainForm((prev) => ({ ...prev, enabled: e.target.checked }))} className="w-4 h-4 accent-admin" />
          <Clock className="w-3.5 h-3.5 text-admin" />
          <span>Aktifkan Pelatihan Otomatis GPU T4x2</span>
        </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-fg block mb-1">Target Track</label>
              <select
                value={trainForm.target_track || "v1"}
                onChange={(e) => onChangeTrainForm((prev) => ({ ...prev, target_track: e.target.value as "v1" | "v2" }))}
                className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-bold"
              >
                <option value="v1">v1 — Classic (Softmax)</option>
                <option value="v2">v2 — Hybrid (Embedding)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-fg block mb-1">Pemicu Otomatis</label>
              <select
                value={trainForm.mode}
                onChange={(e) => onChangeTrainForm((prev) => ({ ...prev, mode: e.target.value as "daily" | "interval" | "on_new_dataset" }))}
                className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-semibold"
              >
                <option value="on_new_dataset">Otomatis Setelah Dataset Baru Disinkron</option>
                <option value="daily">Jam Harian (WIB)</option>
                <option value="interval">Setiap N Jam</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-fg block mb-1">Min. Sampel Baru (Delta Gate)</label>
              <input
                type="number"
                min={0}
                max={10000}
                value={trainForm.min_new_samples}
                onChange={(e) => onChangeTrainForm((prev) => ({ ...prev, min_new_samples: Math.max(0, Number(e.target.value) || 0) }))}
                className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-mono font-bold"
              />
            </div>
          </div>

          {(trainForm.mode === "daily" || trainForm.mode === "interval") && (
            <div className="grid grid-cols-2 gap-2">
              {trainForm.mode === "daily" ? (
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-fg block mb-1">Jam (0–23 WIB)</label>
                  <input type="number" min={0} max={23} value={trainForm.hour} onChange={(e) => onChangeTrainForm((prev) => ({ ...prev, hour: Math.min(23, Math.max(0, Number(e.target.value) || 0)) }))} className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-mono font-bold" />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-fg block mb-1">Interval (Jam)</label>
                  <input type="number" min={1} max={24} value={trainForm.interval_hours} onChange={(e) => onChangeTrainForm((prev) => ({ ...prev, interval_hours: Math.min(24, Math.max(1, Number(e.target.value) || 1)) }))} className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-mono font-bold" />
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-fg block mb-1">Menit (0–59)</label>
                <input type="number" min={0} max={59} value={trainForm.minute} onChange={(e) => onChangeTrainForm((prev) => ({ ...prev, minute: Math.min(59, Math.max(0, Number(e.target.value) || 0)) }))} className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-mono font-bold" />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer text-[11px]">
            <input type="checkbox" checked={trainForm.auto_activate_if_better} onChange={(e) => onChangeTrainForm((prev) => ({ ...prev, auto_activate_if_better: e.target.checked }))} className="w-3.5 h-3.5 accent-admin" />
            <span>Auto-aktifkan model baru ke POS jika akurasi &ge; model aktif saat ini</span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button type="button" size="sm" variant="outline" onClick={() => onRunTrainDeltaCheck(false)} disabled={isTriggeringAutoTrain || trainStatus === "running" || trainStatus === "processing"} className="text-xs font-bold">
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isTriggeringAutoTrain ? "animate-spin" : ""}`} />
              Uji Cek Delta Training
            </Button>
            <Button type="button" size="sm" variant="admin" onClick={onSaveTrainConfig} disabled={isSavingTrain} className="text-xs font-bold">
              <Save className="w-3.5 h-3.5 mr-1" />{isSavingTrain ? "Menyimpan..." : "Simpan Jadwal Training"}
            </Button>
          </div>
        </div>
      </div>
      );
}
