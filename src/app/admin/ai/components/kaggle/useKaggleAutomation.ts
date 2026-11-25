import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import {
  aiService,
  type AutomationDatasetSyncConfig,
  type AutomationDeltaMetrics,
  type AutomationLogEntry,
  type AutomationSchedulerStatus,
  type AutomationTrainingConfig,
  type DatasetSyncStatusResponse,
} from "@/lib/services/ai.service";
import { DEFAULT_SYNC_FORM, DEFAULT_TRAIN_FORM } from "./kaggle-helpers";

export type TrainingTrack = "v1" | "v2";
export type TrainingExecStatus = "idle" | "starting" | "running" | "processing" | "complete" | "error";

interface TrackRunState {
  status: TrainingExecStatus;
  result: any;
  error: string | null;
  kaggleUrl: string;
  elapsed: number;
  isFetchingOutput: boolean;
}

const initialTrackState = (): TrackRunState => ({
  status: "idle",
  result: null,
  error: null,
  kaggleUrl: "",
  elapsed: 0,
  isFetchingOutput: false,
});

/** Hook state, polling, dan handler otomatisasi sync dataset serta training GPU Kaggle (Dual-Track v1/v2) */
export function useKaggleAutomation({ onRefresh }: { onRefresh: () => void }) {
  const { toast } = useToast();

  const [selectedTrack, setSelectedTrack] = useState<TrainingTrack>("v1");
  const [trackStates, setTrackStates] = useState<Record<TrainingTrack, TrackRunState>>({
    v1: initialTrackState(),
    v2: initialTrackState(),
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText: string;
    variant: "danger" | "warning" | "primary";
    action: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [syncForm, setSyncForm] = useState<AutomationDatasetSyncConfig>(DEFAULT_SYNC_FORM);
  const [trainForm, setTrainForm] = useState<AutomationTrainingConfig>(DEFAULT_TRAIN_FORM);
  const [deltaMetrics, setDeltaMetrics] = useState<AutomationDeltaMetrics | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<AutomationSchedulerStatus | null>(null);
  const [autoLogs, setAutoLogs] = useState<AutomationLogEntry[]>([]);
  const [kaggleInfo, setKaggleInfo] = useState<any>(null);
  const [datasetSyncState, setDatasetSyncState] = useState<DatasetSyncStatusResponse | null>(null);
  const [isLoadingAuto, setIsLoadingAuto] = useState<boolean>(false);
  const [isSavingSync, setIsSavingSync] = useState<boolean>(false);
  const [isSavingTrain, setIsSavingTrain] = useState<boolean>(false);
  const [isTriggeringSync, setIsTriggeringSync] = useState<boolean>(false);
  const [isTriggeringAutoTrain, setIsTriggeringAutoTrain] = useState<boolean>(false);

  const pollRefs = useRef<Record<TrainingTrack, NodeJS.Timeout | null>>({ v1: null, v2: null });
  const syncPollRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRefs = useRef<Record<TrainingTrack, number | null>>({ v1: null, v2: null });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateTrack = useCallback((track: TrainingTrack, patch: Partial<TrackRunState>) => {
    setTrackStates((prev) => ({
      ...prev,
      [track]: { ...prev[track], ...patch },
    }));
  }, []);

  const loadAutomationState = useCallback(async () => {
    setIsLoadingAuto(true);
    try {
      const res = await aiService.getAutomationConfig("admin");
      if (res?.config) {
        setSyncForm(res.config.dataset_sync);
        setTrainForm(res.config.training);
        setAutoLogs(res.config.logs || []);
      }
      setDeltaMetrics(res?.delta || null);
      setSchedulerStatus(res?.scheduler || null);
      setKaggleInfo(res?.kaggle_info || null);
      if (res?.kaggle_info?.train_kaggle_url) {
        updateTrack("v1", { kaggleUrl: res.kaggle_info.train_kaggle_url });
      }
      if (res?.kaggle_info?.train_kaggle_url_v2) {
        updateTrack("v2", { kaggleUrl: res.kaggle_info.train_kaggle_url_v2 });
      }
    } catch {
      // Abaikan error transien saat mount awal
    } finally {
      setIsLoadingAuto(false);
    }
}, [updateTrack]);

const checkDatasetSyncStatus = useCallback(async () => {
  try {
    const res = await aiService.getDatasetSyncStatus("admin");
    setDatasetSyncState(res);
    if (res.status === "running" || res.status === "starting" || res.status === "processing") {
      if (syncPollRef.current) clearTimeout(syncPollRef.current);
      syncPollRef.current = setTimeout(checkDatasetSyncStatus, 15000);
    } else {
      if (syncPollRef.current) clearTimeout(syncPollRef.current);
      if (res.status === "complete") loadAutomationState();
    }
  } catch {
    // Pertahankan state terakhir jika terjadi gangguan jaringan
  }
}, [loadAutomationState]);

      const checkStatusForTrack = useCallback(
        async (track: TrainingTrack) => {
          try {
            const res = await aiService.getTrainingStatus(undefined, "admin", track);
            if (res.kaggle_url) updateTrack(track, { kaggleUrl: res.kaggle_url });
            if (res.status === "running" || res.status === "starting" || res.status === "processing") {
              if (!startTimeRefs.current[track]) startTimeRefs.current[track] = Date.now();
              updateTrack(track, { status: res.status });
              if (pollRefs.current[track]) clearTimeout(pollRefs.current[track]!);
              pollRefs.current[track] = setTimeout(() => checkStatusForTrack(track), 15000);
            } else if (res.status === "complete") {
              startTimeRefs.current[track] = null;
              updateTrack(track, { status: "complete", result: res });
              if (pollRefs.current[track]) clearTimeout(pollRefs.current[track]!);
              onRefresh();
            } else if (res.status === "error") {
              startTimeRefs.current[track] = null;
              updateTrack(track, { status: "error", error: res.error_message || "Kaggle kernel run error" });
              if (pollRefs.current[track]) clearTimeout(pollRefs.current[track]!);
            } else {
              startTimeRefs.current[track] = null;
              updateTrack(track, { status: "idle" });
            }
          } catch {
            // Tetap idle jika pengecekan awal gagal
          }
    },
[onRefresh, updateTrack]
  );

const checkStatus = useCallback(
  (track: TrainingTrack = selectedTrack) => checkStatusForTrack(track),
  [checkStatusForTrack, selectedTrack]
);

useEffect(() => {
  checkStatusForTrack("v1");
  checkStatusForTrack("v2");
  loadAutomationState();
  checkDatasetSyncStatus();
  return () => {
    if (pollRefs.current.v1) clearTimeout(pollRefs.current.v1);
    if (pollRefs.current.v2) clearTimeout(pollRefs.current.v2);
    if (syncPollRef.current) clearTimeout(syncPollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  };
  }, [checkStatusForTrack, loadAutomationState, checkDatasetSyncStatus]);

useEffect(() => {
    const anyActive = (["v1", "v2"] as TrainingTrack[]).some((t) =>
      ["running", "starting", "processing"].includes(trackStates[t].status)
    );
    if (anyActive) {
      timerRef.current = setInterval(() => {
        setTrackStates((prev) => {
          const next = { ...prev };
          for (const t of ["v1", "v2"] as TrainingTrack[]) {
            if (["running", "starting", "processing"].includes(next[t].status) && startTimeRefs.current[t]) {
              next[t] = { ...next[t], elapsed: Math.floor((Date.now() - startTimeRefs.current[t]!) / 1000) };
            }
          }
          return next;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [trackStates.v1.status, trackStates.v2.status]);

  const handleTriggerTrain = (track: TrainingTrack = selectedTrack) => {
    const label = track === "v2" ? "Track v2 — Hybrid Embedding (Dual-Output)" : "Track v1 — Classic (Softmax)";
    setConfirmDialog({
      title: `Mulai Pelatihan ${label} di Kaggle GPU?`,
      message:
        `Mulai pipeline pelatihan untuk ${label} pada cluster Kaggle Cloud? Akselerator GPU T4 x 2, Dataset Hugging Face Hub, estimasi waktu 30-45 menit.`,
      confirmText: `Mulai Training ${track.toUpperCase()}`,
      variant: "primary",
      action: async () => {
        startTimeRefs.current[track] = Date.now();
        updateTrack(track, { status: "starting", result: null, error: null, elapsed: 0 });
        try {
          const res = await aiService.triggerTraining("admin", track);
          if (res.kaggle_url) updateTrack(track, { kaggleUrl: res.kaggle_url });
          toast.success(`Pipeline training ${track.toUpperCase()} berhasil dikirim ke Kaggle GPU!`);
          pollRefs.current[track] = setTimeout(() => checkStatusForTrack(track), 15000);
        } catch (err: any) {
          startTimeRefs.current[track] = null;
          updateTrack(track, { status: "error", error: err?.message || "Gagal memicu kernel Kaggle" });
          toast.error(err?.message || "Gagal memicu kernel Kaggle");
        }
      },
    });
};

  const handleResetTraining = (track: TrainingTrack = selectedTrack) => {
    setConfirmDialog({
      title: `Reset Status Training ${track.toUpperCase()}?`,
      message: `Reset status sesi training track ${track.toUpperCase()} ke IDLE?`,
      confirmText: "Ya, Reset",
      variant: "warning",
      action: async () => {
        try {
          await aiService.resetTraining("admin", track);
          startTimeRefs.current[track] = null;
          updateTrack(track, { status: "idle", result: null, error: null, elapsed: 0 });
          toast.success(`Status training ${track.toUpperCase()} di-reset.`);
        } catch (err: any) {
          toast.error(err?.message || "Gagal reset training");
        }
      },
    });
  };

    const handleFetchLatestOutput = (track: TrainingTrack = selectedTrack) => {
      setConfirmDialog({
        title: `Tarik Artefak Model Kaggle (${track.toUpperCase()})?`,
        message:
        `Tarik artefak model TensorFlow.js (${track === "v2" ? "Dual-Output Softmax + Embedding" : "Classic Softmax"}) dari run kernel Kaggle ${track.toUpperCase()} terakhir yang sudah selesai?`,
        confirmText: `Tarik Output ${track.toUpperCase()}`,
        variant: "primary",
        action: async () => {
          updateTrack(track, { isFetchingOutput: true });
          try {
            const res = await aiService.fetchLatestKaggleOutput(undefined, "admin", track);
            toast.success(`Model ${res.versi || ""} berhasil ditarik dari Kaggle (${track.toUpperCase()}) dan didaftarkan!`);
            updateTrack(track, { status: "complete", result: res, isFetchingOutput: false });
            onRefresh();
          } catch (err: any) {
            updateTrack(track, { isFetchingOutput: false });
            toast.error(err?.message || "Gagal menarik output dari Kaggle");
          }
        },
    });
  };

  const handleSaveSyncConfig = async () => {
    setIsSavingSync(true);
    try {
      const res = await aiService.updateAutomationConfig({ dataset_sync: syncForm }, "admin");
      if (res?.config) {
        setSyncForm(res.config.dataset_sync);
        setAutoLogs(res.config.logs || []);
      }
      if (res?.scheduler) setSchedulerStatus(res.scheduler);
      if (res?.delta) setDeltaMetrics(res.delta);
      toast.success(
        res?.cloud_synced
          ? "Jadwal sync dataset disimpan & ter-backup ke Supabase Storage."
          : "Jadwal sync dataset disimpan secara lokal & cron diperbarui."
      );
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan konfigurasi sync dataset");
    } finally {
      setIsSavingSync(false);
    }
  };

  const handleSaveTrainConfig = async () => {
    setIsSavingTrain(true);
    try {
      const res = await aiService.updateAutomationConfig({ training: trainForm }, "admin");
      if (res?.config) {
        setTrainForm(res.config.training);
        setAutoLogs(res.config.logs || []);
      }
      if (res?.scheduler) setSchedulerStatus(res.scheduler);
      if (res?.delta) setDeltaMetrics(res.delta);
      toast.success(
        res?.cloud_synced
          ? "Jadwal training otomatis disimpan & ter-backup ke Supabase Storage."
          : "Jadwal training otomatis disimpan & cron diperbarui."
      );
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan konfigurasi training");
    } finally {
      setIsSavingTrain(false);
    }
  };

  const executeSyncNow = async (force: boolean) => {
    setIsTriggeringSync(true);
    try {
      const res = await aiService.runSyncNow(force, "admin");
      if (res?.executed) {
        toast.success(res.message || "Notebook CPU Syncer berhasil dipicu!");
        checkDatasetSyncStatus();
      } else {
        toast.info(res?.message || "Sinkronisasi dilewati (tidak ada data baru).");
      }
      loadAutomationState();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menjalankan sync dataset");
    } finally {
      setIsTriggeringSync(false);
    }
  };

  const handleRunSyncNow = (force: boolean) => {
    if (force) {
      setConfirmDialog({
        title: "Sinkronisasi Dataset Paksa ke Kaggle?",
        message: `Tarik dataset terbaru dari Hugging Face (${kaggleInfo?.hf_repo || "env"}) ke Private Kaggle Dataset (${kaggleInfo?.dataset_id || "env"}) via Notebook CPU?`,
        confirmText: "Jalankan Sync Paksa",
        variant: "primary",
        action: () => executeSyncNow(true),
      });
      return;
    }
    void executeSyncNow(false);
  };

  const handleResetDatasetSync = () => {
    setConfirmDialog({
      title: "Reset Status Sinkronisasi Dataset?",
      message: "Reset status sinkronisasi dataset Kaggle ke IDLE?",
      confirmText: "Ya, Reset",
      variant: "warning",
      action: async () => {
        try {
          await aiService.resetDatasetSync("admin");
          await checkDatasetSyncStatus();
          toast.success("Status sinkronisasi dataset di-reset.");
        } catch (err: any) {
          toast.error(err?.message || "Gagal reset status sinkronisasi");
        }
      },
    });
  };

  const handleRunTrainDeltaCheck = async (force = false) => {
    setIsTriggeringAutoTrain(true);
    try {
      const res = await aiService.runTrainNow(force, "admin");
      const tgt = (trainForm.target_track || "v1") as TrainingTrack;
      if (res?.executed) {
        toast.success(res.message || "Training GPU otomatis dipicu!");
        checkStatusForTrack(tgt);
      } else {
        toast.info(res?.message || "Training dilewati karena belum memenuhi ambang data baru.");
      }
      loadAutomationState();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menjalankan pengecekan training");
    } finally {
      setIsTriggeringAutoTrain(false);
    }
  };

  const handleClearAutoLogs = () => {
    setConfirmDialog({
      title: "Bersihkan Riwayat Log Otomatisasi?",
      message: "Bersihkan seluruh riwayat log otomatisasi & cronjob?",
      confirmText: "Ya, Bersihkan",
      variant: "danger",
      action: async () => {
        try {
          await aiService.clearAutomationLogs("admin");
          setAutoLogs([]);
          toast.success("Riwayat log otomatisasi dibersihkan.");
        } catch (err: any) {
          toast.error(err?.message || "Gagal membersihkan log");
        }
      },
    });
  };

  const activeTrackState = trackStates[selectedTrack];
  const otherTrack: TrainingTrack = selectedTrack === "v1" ? "v2" : "v1";
  const otherTrackRunning = ["running", "starting", "processing"].includes(trackStates[otherTrack].status);

  return {
    selectedTrack, setSelectedTrack, trackStates, otherTrack, otherTrackRunning,
    trainStatus: activeTrackState.status,
    trainResult: activeTrackState.result,
    trainError: activeTrackState.error,
    kaggleUrl: activeTrackState.kaggleUrl,
    elapsed: activeTrackState.elapsed,
    isFetchingOutput: activeTrackState.isFetchingOutput,
    confirmDialog, setConfirmDialog, confirmLoading, setConfirmLoading,
    syncForm, setSyncForm, trainForm, setTrainForm, deltaMetrics, schedulerStatus,
    autoLogs, kaggleInfo, datasetSyncState, isLoadingAuto, isSavingSync, isSavingTrain,
    isTriggeringSync, isTriggeringAutoTrain, loadAutomationState, checkStatus,
    handleTriggerTrain, handleResetTraining, handleFetchLatestOutput,
    handleSaveSyncConfig, handleSaveTrainConfig, handleRunSyncNow,
    handleResetDatasetSync, handleRunTrainDeltaCheck, handleClearAutoLogs,
  };
}
