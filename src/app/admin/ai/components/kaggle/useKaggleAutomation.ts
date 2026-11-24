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

/** Hook state, polling, dan handler otomatisasi sync dataset serta training GPU Kaggle */
export function useKaggleAutomation({ onRefresh }: { onRefresh: () => void }) {
  const { toast } = useToast();

  const [trainStatus, setTrainStatus] = useState<
    "idle" | "starting" | "running" | "processing" | "complete" | "error"
  >("idle");
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText: string;
    variant: "danger" | "warning" | "primary";
    action: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [trainResult, setTrainResult] = useState<any>(null);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [kaggleUrl, setKaggleUrl] = useState<string>("");
  const [elapsed, setElapsed] = useState<number>(0);
  const [isFetchingOutput, setIsFetchingOutput] = useState<boolean>(false);

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

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const syncPollRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
        setKaggleUrl(res.kaggle_info.train_kaggle_url);
      }
    } catch {
      // Abaikan error transien saat mount awal
    } finally {
      setIsLoadingAuto(false);
    }
  }, []);

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

  const checkStatus = useCallback(async () => {
    try {
      const res = await aiService.getTrainingStatus(undefined, "admin");
      if (res.kaggle_url) setKaggleUrl(res.kaggle_url);
      if (res.status === "running" || res.status === "starting" || res.status === "processing") {
        setTrainStatus(res.status);
        if (pollRef.current) clearTimeout(pollRef.current);
        pollRef.current = setTimeout(checkStatus, 15000);
      } else if (res.status === "complete") {
        setTrainStatus("complete");
        setTrainResult(res);
        if (pollRef.current) clearTimeout(pollRef.current);
        onRefresh();
      } else if (res.status === "error") {
        setTrainStatus("error");
        setTrainError(res.error_message || "Kaggle kernel run error");
        if (pollRef.current) clearTimeout(pollRef.current);
      } else {
        setTrainStatus("idle");
      }
    } catch {
      // Tetap idle jika pengecekan awal gagal
    }
  }, [onRefresh]);

  useEffect(() => {
    checkStatus();
    loadAutomationState();
    checkDatasetSyncStatus();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
      if (syncPollRef.current) clearTimeout(syncPollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [checkStatus, loadAutomationState, checkDatasetSyncStatus]);

  useEffect(() => {
    if (trainStatus === "running" || trainStatus === "starting" || trainStatus === "processing") {
      if (!startTimeRef.current) startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      startTimeRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [trainStatus]);

  const handleTriggerTrain = () => {
    setConfirmDialog({
      title: "Mulai Pelatihan Model di Kaggle GPU?",
      message:
        "Mulai pipeline pelatihan otomatis di Kaggle Cloud? Akselerator GPU T4 x 2, Dataset Hugging Face Hub, estimasi waktu 30-45 menit, dan model TFJS akan diunggah ke Supabase Storage.",
      confirmText: "Mulai Training GPU",
      variant: "primary",
      action: async () => {
        setTrainStatus("starting");
        setTrainResult(null);
        setTrainError(null);
        setElapsed(0);
        startTimeRef.current = Date.now();
        try {
          const res = await aiService.triggerTraining("admin");
          if (res.kaggle_url) setKaggleUrl(res.kaggle_url);
          toast.success("Pipeline training berhasil dikirim ke Kaggle GPU!");
          pollRef.current = setTimeout(checkStatus, 15000);
        } catch (err: any) {
          setTrainStatus("error");
          setTrainError(err?.message || "Gagal memicu kernel Kaggle");
          toast.error(err?.message || "Gagal memicu kernel Kaggle");
        }
      },
    });
  };

  const handleResetTraining = () => {
    setConfirmDialog({
      title: "Reset Status Training?",
      message: "Reset status sesi training ke IDLE?",
      confirmText: "Ya, Reset",
      variant: "warning",
      action: async () => {
        try {
          await aiService.resetTraining("admin");
          setTrainStatus("idle");
          setTrainResult(null);
          setTrainError(null);
          setElapsed(0);
          toast.success("Status training di-reset.");
        } catch (err: any) {
          toast.error(err?.message || "Gagal reset training");
        }
      },
    });
  };

  const handleFetchLatestOutput = () => {
    setConfirmDialog({
      title: "Tarik Artefak Model Kaggle?",
      message:
        "Tarik artefak model TensorFlow.js (model.json, shards *.bin, class.json, metrics) dari run kernel Kaggle terakhir yang sudah selesai (~5-10 detik)?",
      confirmText: "Tarik Output",
      variant: "primary",
      action: async () => {
        setIsFetchingOutput(true);
        try {
          const res = await aiService.fetchLatestKaggleOutput(undefined, "admin");
          toast.success(`Model ${res.versi || ""} berhasil ditarik dari Kaggle dan didaftarkan!`);
          setTrainStatus("complete");
          setTrainResult(res);
          onRefresh();
        } catch (err: any) {
          toast.error(err?.message || "Gagal menarik output dari Kaggle");
        } finally {
          setIsFetchingOutput(false);
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
      if (res?.executed) {
        toast.success(res.message || "Training GPU otomatis dipicu!");
        checkStatus();
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

  return {
    trainStatus, confirmDialog, setConfirmDialog, confirmLoading, setConfirmLoading,
    trainResult, trainError, kaggleUrl, elapsed, isFetchingOutput,
    syncForm, setSyncForm, trainForm, setTrainForm, deltaMetrics, schedulerStatus,
    autoLogs, kaggleInfo, datasetSyncState, isLoadingAuto, isSavingSync, isSavingTrain,
    isTriggeringSync, isTriggeringAutoTrain, loadAutomationState, checkStatus,
    handleTriggerTrain, handleResetTraining, handleFetchLatestOutput,
    handleSaveSyncConfig, handleSaveTrainConfig, handleRunSyncNow,
    handleResetDatasetSync, handleRunTrainDeltaCheck, handleClearAutoLogs,
  };
}
