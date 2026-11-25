import { api } from '../api';
import type { AIKelas, AIModel, AISampel, PaginatedResponse } from '@/types/api';

export interface AutomationDatasetSyncConfig {
  enabled: boolean;
  mode: 'daily' | 'interval';
  hour: number;
  minute: number;
  interval_hours: number;
  auto_sync_supabase_to_hf: boolean;
  last_checked_at?: string | null;
  last_synced_at?: string | null;
  last_synced_hf_commit?: string | null;
  last_dataset_action?: string | null;
  last_num_classes?: number | null;
  last_num_images?: number | null;
}

export interface AutomationTrainingConfig {
  enabled: boolean;
  mode: 'daily' | 'interval' | 'on_new_dataset';
  hour: number;
  minute: number;
  interval_hours: number;
  min_new_samples: number;
  auto_activate_if_better: boolean;
  last_checked_at?: string | null;
  last_triggered_at?: string | null;
  last_trained_hf_commit?: string | null;
  last_trained_sample_count?: number;
  last_registered_version?: string | null;
}

export interface AutomationLogEntry {
  id: string;
  timestamp: string;
  job: 'dataset_sync' | 'training' | 'system' | string;
  trigger: 'cron' | 'manual' | 'event' | 'poller' | 'external' | string;
  status: string;
  message: string;
  meta?: any;
}

export interface AutomationConfig {
  dataset_sync: AutomationDatasetSyncConfig;
  training: AutomationTrainingConfig;
  logs: AutomationLogEntry[];
  updated_at?: string | null;
}

export interface AutomationDeltaMetrics {
  pending_verified_supabase_samples: number;
  total_hf_samples: number;
  latest_hf_commit: { oid: string; title: string; date: string | null } | null;
  last_synced_hf_commit: string | null;
  last_trained_hf_commit: string | null;
  kaggle_dataset_exists: boolean;
  hf_commit_changed_for_kaggle: boolean;
  hf_commit_changed_for_training: boolean;
  has_hf_changes_for_kaggle: boolean;
  has_dataset_changes_for_training: boolean;
  new_samples_since_last_train: number;
  min_new_samples: number;
}

export interface AutomationSchedulerStatus {
  timezone: string;
  dataset_sync_scheduled: boolean;
  dataset_sync_cron: string | null;
  training_scheduled: boolean;
  training_cron: string | null;
  training_event_mode: boolean;
  sync_poller_active: boolean;
  train_poller_active: boolean;
}

export interface AutomationStateResponse {
  config: AutomationConfig;
  delta: AutomationDeltaMetrics;
  kaggle_info: {
    dataset_id: string;
    dataset_url: string;
    sync_kernel_id: string;
    sync_kaggle_url: string;
    train_kernel_id: string;
    train_kaggle_url: string;
  };
  scheduler: AutomationSchedulerStatus;
}

export interface DatasetSyncStatusResponse {
  status: 'idle' | 'starting' | 'running' | 'processing' | 'complete' | 'error';
  has_sync?: boolean;
  sync_id?: string;
  kernel_id: string;
  kaggle_url: string;
  dataset_id: string;
  dataset_url: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  result?: {
    action?: string;
    num_classes?: number;
    num_images?: number;
    kaggle_dataset_id?: string;
    [key: string]: any;
  };
  last_sync?: any;
}

export const aiService = {
  // Kasir & Owner Model Aktif
  getModelAktifKasir(): Promise<AIModel> {
    return api.get<AIModel>('/kasir/ai/model-aktif');
  },

  catatLogInferensi(
    payload: {
      versi_model?: string;
      prediksi_kelas_id: string;
      skor_yakin: number;
      diterima_kasir?: boolean;
      produk_id_asli?: string | null;
      butuh_koreksi?: boolean;
      foto_cuplikan?: string | null;
    },
    prefix: 'kasir' | 'owner' | 'admin' = 'kasir'
  ): Promise<any> {
    return api.post(`/${prefix}/ai/log-inferensi`, payload);
  },

  // Owner / Admin AI Management — Models & Threshold
  getModels(prefix: 'owner' | 'admin' = 'admin'): Promise<AIModel[]> {
    return api.get<AIModel[]>(`/${prefix}/ai/model`);
  },

  getModelAktif(prefix: 'owner' | 'admin' = 'owner'): Promise<AIModel> {
    return api.get<AIModel>(`/${prefix}/ai/model/aktif`);
  },

  activateModel(
    versi: string,
    prefix: 'owner' | 'admin' = 'admin',
    versi_override?: string
  ): Promise<AIModel> {
    return api.post<AIModel>(`/${prefix}/ai/model/${encodeURIComponent(versi)}/aktifkan`, {
      versi_override: versi_override || undefined,
    });
  },

  syncStorageModel(
    versi = 'v1.2.20260912',
    aktif = true,
    prefix: 'owner' | 'admin' = 'admin'
  ): Promise<AIModel> {
    return api.post<AIModel>(`/${prefix}/ai/model/sync`, { versi, aktif });
  },

  registerManualModel(
    payload: {
      versi: string;
      nama_model?: string;
      arsitektur?: string;
      akurasi_top1?: number;
      f1_score?: number;
      ukuran_model_mb?: number;
      jml_kelas?: number;
      latensi_ms?: number;
      path_model_json?: string;
      path_bobot_bin?: string;
      path_label?: string;
    },
    prefix: 'owner' | 'admin' = 'admin'
  ): Promise<AIModel> {
    return api.post<AIModel>(`/${prefix}/ai/model/register`, payload);
  },

  deleteModel(idOrVersi: string, prefix: 'owner' | 'admin' = 'admin'): Promise<any> {
    return api.delete(`/${prefix}/ai/model/${encodeURIComponent(idOrVersi)}`);
  },

  getThresholdConfig(prefix: 'owner' | 'admin' = 'admin'): Promise<{
    high_threshold: number;
    medium_threshold: number;
    auto_add_high_confidence: boolean;
    show_top3_candidates: boolean;
    fallback_barcode_on_low: boolean;
    updated_at: string;
  }> {
    return api.get(`/${prefix}/ai/threshold`);
  },

  updateThresholdConfig(
    payload: {
      high_threshold?: number;
      medium_threshold?: number;
      auto_add_high_confidence?: boolean;
      show_top3_candidates?: boolean;
      fallback_barcode_on_low?: boolean;
    },
    prefix: 'owner' | 'admin' = 'admin'
  ): Promise<any> {
    return api.put(`/${prefix}/ai/threshold`, payload);
  },

  // Automated Training Pipeline (Kaggle GPU) & Research Metrics
  triggerTraining(prefix: 'owner' | 'admin' = 'admin'): Promise<{
    training_id: string;
    kernel_id: string;
    status: string;
    kaggle_url: string;
    started_at: string;
    stdout?: string;
  }> {
    return api.post(`/${prefix}/ai/train`, {});
  },

  getTrainingStatus(
    id?: string,
    prefix: 'owner' | 'admin' = 'admin'
  ): Promise<{
    status: 'idle' | 'starting' | 'running' | 'processing' | 'complete' | 'error';
    has_training: boolean;
    training_id?: string;
    kernel_id: string;
    kaggle_url: string;
    started_at?: string;
    completed_at?: string;
    error_message?: string;
    versi?: string;
    nama_model?: string;
    arsitektur?: string;
    akurasi?: number;
    f1_macro?: number;
    num_classes?: number;
    num_misclassified?: number;
    num_test_images?: number;
    best_epoch?: number;
    training_time_s?: number;
    inference_ms?: number;
    error_summary?: any[];
  }> {
    return api.get(`/${prefix}/ai/train/status`, id ? { id } : undefined);
  },

  getTrainingHistory(prefix: 'owner' | 'admin' = 'admin'): Promise<{
    current: any;
    runs: any[];
    experiments: any[];
  }> {
    return api.get(`/${prefix}/ai/train/history`);
  },

  resetTraining(prefix: 'owner' | 'admin' = 'admin'): Promise<any> {
    return api.post(`/${prefix}/ai/train/reset`, {});
  },

  fetchLatestKaggleOutput(
    versi?: string,
    prefix: 'owner' | 'admin' = 'admin'
  ): Promise<any> {
    return api.post(`/${prefix}/ai/train/fetch-output`, { versi });
  },

  getResearchSummary(
    prefix: 'owner' | 'admin' = 'admin',
    runId?: string
  ): Promise<{
    run_id?: string;
    run_label?: string;
    available_runs?: Array<{
      run_id: string;
      label: string;
      generated_at?: string;
      num_classes?: number | null;
      best_experiment?: string | null;
    }>;
    kernel_id: string;
    kaggle_url: string;
    hf_repo: string;
    num_classes?: number;
    best_experiment?: string | null;
    dataset_split: { train: number; val: number; test: number; total: number };
    summary: any;
    comparison: any[];
    experiments_detail: {
      E1_MobileNetV3: {
        history: any[];
        error_summary: any[];
        classification_report: any[];
        misclassified: any[];
      };
      E2_MobileNetV3_CBAM: {
        history: any[];
        error_summary: any[];
        classification_report: any[];
        misclassified: any[];
      };
    };
  }> {
    return api.get(`/${prefix}/ai/research-summary`, runId ? { run_id: runId } : undefined);
  },

  // Kaggle Dataset Syncer (CPU) & Dual Cronjob Automation
  triggerDatasetSync(prefix: 'owner' | 'admin' = 'admin'): Promise<any> {
    return api.post(`/${prefix}/ai/kaggle/sync-dataset`, {});
  },

  getDatasetSyncStatus(prefix: 'owner' | 'admin' = 'admin'): Promise<DatasetSyncStatusResponse> {
    return api.get<DatasetSyncStatusResponse>(`/${prefix}/ai/kaggle/sync-dataset/status`);
  },

  resetDatasetSync(prefix: 'owner' | 'admin' = 'admin'): Promise<any> {
    return api.post(`/${prefix}/ai/kaggle/sync-dataset/reset`, {});
  },

  getAutomationConfig(prefix: 'owner' | 'admin' = 'admin'): Promise<AutomationStateResponse> {
    return api.get<AutomationStateResponse>(`/${prefix}/ai/automation/config`);
  },

  updateAutomationConfig(
    payload: {
      dataset_sync?: Partial<AutomationDatasetSyncConfig>;
      training?: Partial<AutomationTrainingConfig>;
    },
    prefix: 'owner' | 'admin' = 'admin'
  ): Promise<any> {
    return api.put(`/${prefix}/ai/automation/config`, payload);
  },

  runSyncNow(force = false, prefix: 'owner' | 'admin' = 'admin'): Promise<any> {
    return api.post(`/${prefix}/ai/automation/run-sync-now`, { force });
  },

  runTrainNow(force = false, prefix: 'owner' | 'admin' = 'admin'): Promise<any> {
    return api.post(`/${prefix}/ai/automation/run-train-now`, { force });
  },

  clearAutomationLogs(prefix: 'owner' | 'admin' = 'admin'): Promise<any> {
    return api.delete(`/${prefix}/ai/automation/logs`);
  },

  // Kelas AI & Kuota Dataset
  async getKelasList(
    params?: { search?: string; status?: string; kategori?: string; limit?: number; page?: number; aktif?: boolean },
    prefix: 'owner' | 'admin' | 'kasir' = 'owner'
  ): Promise<AIKelas[]> {
    const res = await api.get<any>(`/${prefix}/ai/kelas`, params);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.items)) return res.items;
    return [];
  },

  getDetailKelas(id: string, prefix: 'owner' | 'admin' = 'owner'): Promise<AIKelas & { samples?: AISampel[] }> {
    return api.get(`/${prefix}/ai/kelas/${id}`);
  },

  createKelas(
    payload: {
      nama: string;
      kode_kelas?: string;
      kategori?: string;
      barcode?: string;
      target_foto?: number;
      buat_produk_master?: boolean;
    },
    prefix: 'owner' | 'admin' = 'admin'
  ): Promise<AIKelas & { produk_master_status?: 'created' | 'linked' }> {
    return api.post<AIKelas & { produk_master_status?: 'created' | 'linked' }>(`/${prefix}/ai/kelas`, payload);
  },

  updateKelas(
    id: string,
    payload: {
      nama?: string;
      kode_kelas?: string;
      kategori?: string;
      barcode?: string;
      target_foto?: number;
      status?: string;
    },
    prefix: 'owner' | 'admin' = 'admin'
  ): Promise<AIKelas> {
    return api.put<AIKelas>(`/${prefix}/ai/kelas/${id}`, payload);
  },

  updateTargetKelas(
    id: string,
    target_foto: number,
    prefix: 'owner' | 'admin' = 'admin'
  ): Promise<AIKelas> {
    return api.put<AIKelas>(`/${prefix}/ai/kelas/${id}/target`, { target_foto });
  },

  deleteKelas(id: string, prefix: 'owner' | 'admin' = 'admin'): Promise<any> {
    return api.delete(`/${prefix}/ai/kelas/${id}`);
  },

  getUnmappedProduk(prefix: 'owner' | 'admin' = 'admin'): Promise<any[]> {
    return api.get(`/${prefix}/ai/unmapped-produk`);
  },

  mapProdukKeKelas(
    payload: {
      produk_id: string;
      kelas_id?: string;
      buat_kelas_baru?: boolean;
      nama_kelas?: string;
      kategori?: string;
      barcode?: string;
    },
    prefix: 'owner' | 'admin' = 'admin'
  ): Promise<any> {
    return api.post(`/${prefix}/ai/map-produk`, payload);
  },

  // Sampel Citra & Burst Upload
  uploadBurstSampel(
    payload: {
      kelas_id?: string;
      kode_kelas?: string;
      nama_kelas?: string;
      gambar_list?: string[];
      sudut?: string;
      sudut_ambil?: string;
      sumber?: string;
      terverifikasi?: boolean;
      fotos?: Array<string | { base64: string; sudut_ambil?: string; nama_file?: string }>;
    },
    prefix: 'kasir' | 'owner' | 'admin' = 'owner'
  ): Promise<{ berhasil_diunggah: number; jumlah_berhasil: number; sampel: AISampel[] }> {
    return api.post(`/${prefix}/ai/sampel/burst`, payload);
  },

  getSampelList(
    params?: {
      kelas_id?: string;
      status?: 'menunggu' | 'diterima' | 'ditolak';
      terverifikasi?: boolean;
      sumber?: string;
      lokasi_simpan?: 'supabase' | 'huggingface';
      limit?: number;
      page?: number;
    },
    prefix: 'owner' | 'admin' = 'admin'
  ): Promise<PaginatedResponse<AISampel>> {
    return api.get<PaginatedResponse<AISampel>>(`/${prefix}/ai/sampel`, params);
  },

  verifikasiSampel(
    payload: {
      sampel_ids: string[];
      status?: 'diterima' | 'ditolak';
      terverifikasi?: boolean;
      alasan_tolak?: string;
    },
    prefix: 'owner' | 'admin' = 'admin'
  ): Promise<any> {
    return api.post(`/${prefix}/ai/sampel/verifikasi`, payload);
  },

  deleteSampelBatch(sampel_ids: string[], prefix: 'owner' | 'admin' = 'admin'): Promise<any> {
    return api.post(`/${prefix}/ai/sampel/hapus-batch`, { sampel_ids });
  },

  ubahKelasSampel(
    sampel_ids: string[],
    kelas_id: string,
    prefix: 'owner' | 'admin' = 'admin'
  ): Promise<any> {
    return api.put(`/${prefix}/ai/sampel/ubah-kelas`, { sampel_ids, kelas_id });
  },

  // Hugging Face Hub Sync
  syncHuggingFace(
    payload?: { kelas_id?: string; batch_limit?: number; limit?: number; sync_all?: boolean },
    prefix: 'owner' | 'admin' = 'admin'
  ): Promise<any> {
    return api.post(`/${prefix}/ai/sync-huggingface`, {
      kelas_id: payload?.kelas_id,
      batch_limit: payload?.batch_limit ?? payload?.limit ?? 50,
      sync_all: payload?.sync_all ?? false,
    });
  },

  getStatsHuggingFace(prefix: 'owner' | 'admin' = 'admin'): Promise<any> {
    return api.get(`/${prefix}/ai/stats-huggingface`);
  },

  // Log Inferensi & Ringkasan Akurasi
  getLogInferensi(
    params?: {
      butuh_koreksi?: boolean;
      versi_model?: string;
      limit?: number;
      page?: number;
    },
    prefix: 'owner' | 'admin' = 'owner'
  ): Promise<PaginatedResponse<any>> {
    return api.get(`/${prefix}/ai/log-inferensi`, params);
  },

  getRingkasanAkurasi(
    params?: { versi_model?: string },
    prefix: 'owner' | 'admin' = 'owner'
  ): Promise<{
    versi_model: string;
    total_deteksi: number;
    diterima_kasir: number;
    butuh_koreksi: number;
    akurasi_lapangan_persen: number;
  }> {
    return api.get(`/${prefix}/ai/ringkasan-akurasi`, params);
  },

  jadikanDataLatihDariLog(
    logId: string,
    kelas_id?: string,
    prefix: 'owner' | 'admin' = 'admin',
    terverifikasi = true
  ): Promise<any> {
    return api.post(`/${prefix}/ai/log-inferensi/${logId}/jadikan-sampel`, {
      kelas_id: kelas_id || undefined,
      terverifikasi,
    });
  },
};
