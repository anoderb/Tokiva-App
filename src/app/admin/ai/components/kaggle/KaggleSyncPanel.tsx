"use client";

import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AutomationDatasetSyncConfig,
  AutomationDeltaMetrics,
  AutomationSchedulerStatus,
} from "@/lib/services/ai.service";
import { formatWibTime, renderAutomationStatusBadge, shortCommit } from "./kaggle-helpers";
import { Calendar, CloudUpload, Download, ExternalLink, RefreshCw, RotateCcw, Save } from "lucide-react";

/** Panel 1: Sinkronisasi dataset Hugging Face ke Kaggle Dataset via CPU */
export function KaggleSyncPanel({
  syncStatus,
  kaggleDatasetUrl,
  deltaMetrics,
  syncForm,
  schedulerStatus,
  isTriggeringSync,
  isSavingSync,
  onChangeSyncForm,
  onRunSyncNow,
  onResetSync,
  onSaveSyncConfig,
}: {
  syncStatus: string;
  kaggleDatasetUrl?: string;
  deltaMetrics: AutomationDeltaMetrics | null;
  syncForm: AutomationDatasetSyncConfig;
  schedulerStatus: AutomationSchedulerStatus | null;
  isTriggeringSync: boolean;
  isSavingSync: boolean;
  onChangeSyncForm: React.Dispatch<React.SetStateAction<AutomationDatasetSyncConfig>>;
  onRunSyncNow: (force: boolean) => void;
  onResetSync: () => void;
  onSaveSyncConfig: () => void;
}) {
  return (
    <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h3 className="font-heading font-black text-base">Sync Dataset (HF → Kaggle Dataset)</h3>
            <Badge variant="blue">CPU Syncer</Badge>
          </div>
          <p className="text-xs text-muted-fg mt-0.5">Tarik commit terbaru Hugging Face ke Private Kaggle Dataset tanpa kuota GPU.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {kaggleDatasetUrl && (
            <a href={kaggleDatasetUrl} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded border-2 border-fg bg-muted hover:bg-muted/80 text-[11px] font-bold inline-flex items-center gap-1">
              Dataset <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {syncStatus !== "idle" && (
            <Button type="button" size="sm" variant="outline" onClick={onResetSync} className="text-xs font-bold">
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded border-2 border-fg bg-muted/20">
          <span className="text-[10px] font-bold uppercase text-muted-fg block">Status Notebook 1</span>
          <div className="mt-1 flex items-center gap-1.5">
            {syncStatus === "running" || syncStatus === "starting" || syncStatus === "processing" ? (
              <Badge variant="yellow"><RefreshCw className="w-3 h-3 inline mr-1 animate-spin" />{syncStatus.toUpperCase()}</Badge>
            ) : renderAutomationStatusBadge(syncStatus)}
          </div>
        </div>
        <div className="p-2.5 rounded border-2 border-fg bg-muted/20">
          <span className="text-[10px] font-bold uppercase text-muted-fg block">Antrean Supabase → HF</span>
          <span className="font-mono font-bold text-sm mt-0.5 block">{deltaMetrics?.pending_verified_supabase_samples ?? 0} foto siap push</span>
        </div>
        <div className="p-2.5 rounded border-2 border-fg bg-muted/20">
          <span className="text-[10px] font-bold uppercase text-muted-fg block">Commit HF HEAD vs Kaggle</span>
          <span className="font-mono font-bold text-xs mt-0.5 block">{shortCommit(deltaMetrics?.latest_hf_commit?.oid)} / {shortCommit(syncForm.last_synced_hf_commit)}</span>
        </div>
        <div className="p-2.5 rounded border-2 border-fg bg-muted/20">
          <span className="text-[10px] font-bold uppercase text-muted-fg block">Sync Terakhir</span>
          <span className="font-mono font-bold text-[11px] mt-0.5 block">
            {syncForm.last_num_classes != null && syncForm.last_num_images != null ? `${syncForm.last_num_classes} kelas / ${syncForm.last_num_images} img` : formatWibTime(syncForm.last_synced_at)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button type="button" onClick={() => onRunSyncNow(true)} disabled={isTriggeringSync || syncStatus === "running" || syncStatus === "processing"} className="text-xs font-bold shadow-pop-soft">
          {isTriggeringSync ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Mengirim...</> : <><Download className="w-3.5 h-3.5 mr-1.5" /> Tarik &amp; Perbarui Dataset Sekarang</>}
        </Button>
        <Button type="button" variant="outline" onClick={() => onRunSyncNow(false)} disabled={isTriggeringSync || syncStatus === "running" || syncStatus === "processing"} className="text-xs font-bold">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Cek Delta &amp; Sync
        </Button>
      </div>

      <div className="p-3.5 rounded-md border-2 border-fg bg-muted/30 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 font-bold cursor-pointer">
            <input type="checkbox" checked={syncForm.enabled} onChange={(e) => onChangeSyncForm((prev) => ({ ...prev, enabled: e.target.checked }))} className="w-4 h-4 accent-accent" />
            <Calendar className="w-3.5 h-3.5 text-accent" />
            <span>Aktifkan Cronjob Sync Otomatis (WIB)</span>
          </label>
          <Badge variant={schedulerStatus?.dataset_sync_scheduled ? "green" : "gray"}>{schedulerStatus?.dataset_sync_cron || "Nonaktif"}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-fg block mb-1">Mode Jadwal</label>
            <select value={syncForm.mode} onChange={(e) => onChangeSyncForm((prev) => ({ ...prev, mode: e.target.value as "daily" | "interval" }))} className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-semibold">
              <option value="daily">Jam Harian (WIB)</option>
              <option value="interval">Setiap N Jam</option>
            </select>
          </div>
          {syncForm.mode === "daily" ? (
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-fg block mb-1">Jam (0–23 WIB)</label>
              <input type="number" min={0} max={23} value={syncForm.hour} onChange={(e) => onChangeSyncForm((prev) => ({ ...prev, hour: Math.min(23, Math.max(0, Number(e.target.value) || 0)) }))} className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-mono font-bold" />
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-fg block mb-1">Interval (Jam)</label>
              <input type="number" min={1} max={24} value={syncForm.interval_hours} onChange={(e) => onChangeSyncForm((prev) => ({ ...prev, interval_hours: Math.min(24, Math.max(1, Number(e.target.value) || 1)) }))} className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-mono font-bold" />
            </div>
          )}
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-fg block mb-1">Menit (0–59)</label>
            <input type="number" min={0} max={59} value={syncForm.minute} onChange={(e) => onChangeSyncForm((prev) => ({ ...prev, minute: Math.min(59, Math.max(0, Number(e.target.value) || 0)) }))} className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-mono font-bold" />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-[11px]">
          <input type="checkbox" checked={syncForm.auto_sync_supabase_to_hf} onChange={(e) => onChangeSyncForm((prev) => ({ ...prev, auto_sync_supabase_to_hf: e.target.checked }))} className="w-3.5 h-3.5 accent-accent" />
          <span>Otomatis dorong foto terverifikasi Supabase → HF sebelum sync Kaggle</span>
        </label>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-fg">Cek terakhir: {formatWibTime(syncForm.last_checked_at)}</span>
          <Button type="button" size="sm" onClick={onSaveSyncConfig} disabled={isSavingSync} className="text-xs font-bold">
            <Save className="w-3.5 h-3.5 mr-1" />{isSavingSync ? "Menyimpan..." : "Simpan Jadwal Sync"}
          </Button>
        </div>
      </div>
    </div>
  );
}
