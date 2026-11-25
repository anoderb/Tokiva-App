"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  Brain,
  RefreshCw,
  FolderKanban,
  CheckSquare,
  Zap,
  Activity,
  BarChart3,
  Rocket,
} from "lucide-react";

import { aiService } from "@/lib/services/ai.service";
import type { AIKelas, AIModel } from "@/types/api";

import { TabRingkasan } from "./components/TabRingkasan";
import { TabDatasetMaster } from "./components/TabDatasetMaster";
import { TabValidasiKurasi } from "./components/TabValidasiKurasi";
import { TabEksperimenKaggle } from "./components/TabEksperimenKaggle";
import { TabEvaluasiHeadToHead } from "./components/TabEvaluasiHeadToHead";
import { TabModelSandboxDeploy } from "./components/TabModelSandboxDeploy";
import { TabLogInferensi } from "./components/TabLogInferensi";

export type AdminAiTab =
  | "ringkasan"
  | "dataset"
  | "validasi"
  | "eksperimen"
  | "evaluasi"
  | "deploy"
  | "log";

const VALID_TABS: AdminAiTab[] = [
  "ringkasan",
  "dataset",
  "validasi",
  "eksperimen",
  "evaluasi",
  "deploy",
  "log",
];

function AdminAIManagementContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as AdminAiTab | null;

  const [activeTab, setActiveTab] = useState<AdminAiTab>(() =>
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "ringkasan"
  );

  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Real backend states
  const [models, setModels] = useState<AIModel[]>([]);
  const [kelasList, setKelasList] = useState<AIKelas[]>([]);
  const [totalSampel, setTotalSampel] = useState<number>(0);
  const [hfStats, setHfStats] = useState<any>(null);
  const [ringkasanAkurasi, setRingkasanAkurasi] = useState<any>(null);
  const [researchSummary, setResearchSummary] = useState<any>(null);
  const [selectedResearchRunId, setSelectedResearchRunId] = useState<string | null>(null);
  const selectedRunIdRef = useRef<string | null>(null);
  const [isSwitchingRun, setIsSwitchingRun] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    selectedRunIdRef.current = selectedResearchRunId;
  }, [selectedResearchRunId]);

  // Load summary/master data once (child tabs manage their own server-side pagination)
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        modelsRes,
        kelasRes,
        hfRes,
        akurasiRes,
        researchRes,
      ] = await Promise.all([
        aiService.getModels("admin").catch(() => []),
        aiService.getKelasList(undefined, "admin").catch(() => []),
        aiService.getStatsHuggingFace("admin").catch(() => null),
        aiService.getRingkasanAkurasi(undefined, "admin").catch(() => null),
        aiService.getResearchSummary("admin", selectedRunIdRef.current || undefined).catch(() => null),
      ]);

      const safeKelas = kelasRes || [];
      setModels(modelsRes || []);
      setKelasList(safeKelas);
      setHfStats(hfRes);
      setTotalSampel(
        hfRes?.total_sampel_terkumpul ??
        safeKelas.reduce((acc, k) => acc + Number(k.total_foto || 0), 0)
      );
      setRingkasanAkurasi(akurasiRes);
      setResearchSummary(researchRes);
      if (researchRes?.run_id && !selectedRunIdRef.current) {
        selectedRunIdRef.current = researchRes.run_id;
        setSelectedResearchRunId(researchRes.run_id);
      }
    } catch {
      toast.error("Gagal memuat beberapa data AI dari server");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSelectResearchRun = useCallback(
    async (runId: string) => {
      selectedRunIdRef.current = runId;
      setSelectedResearchRunId(runId);
      setIsSwitchingRun(true);
      try {
        const res = await aiService.getResearchSummary("admin", runId);
        setResearchSummary(res);
      } catch {
        toast.error("Gagal memuat data sesi training yang dipilih");
      } finally {
        setIsSwitchingRun(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const activeModel = models.find((m) => m.aktif) || models[0] || null;

  const tabs: Array<{ id: AdminAiTab; label: string; icon: any; count?: number | string }> = [
    { id: "ringkasan", label: "Ringkasan", icon: Brain },
    { id: "dataset", label: "Dataset Master", icon: FolderKanban, count: kelasList.length },
    { id: "validasi", label: "Validasi & Kurasi", icon: CheckSquare, count: hfStats?.total_menunggu_validasi ?? 0 },
    { id: "eksperimen", label: "Eksperimen & Kaggle", icon: Zap },
    { id: "evaluasi", label: "Evaluasi Model", icon: BarChart3 },
    { id: "deploy", label: "Model & Sandbox", icon: Rocket, count: models.length },
    { id: "log", label: "Log Inferensi", icon: Activity, count: ringkasanAkurasi?.total_deteksi ?? 0 },
  ];

  return (
    <AdminLayout title="Manajemen AI & MLOps Pipeline">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-admin animate-pulse" />
              <h2 className="font-heading font-black text-xl tracking-tight">
                Pusat Kendali Model TFJS &amp; Dataset Hugging Face
              </h2>
            </div>
            <p className="text-xs text-muted-fg max-w-3xl">
              Kelola siklus hidup MLOps Tokiva POS: pengumpulan dataset citra produk, validasi kualitas kurasi, sinkronisasi Hugging Face Hub, automated training pipeline Kaggle GPU T4x2, perbandingan riset head-to-head, hingga live deployment TensorFlow.js.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadAllData}
              disabled={loading}
              className="text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh Data
            </Button>
          </div>
        </div>

        {/* 7 Tab Navigation Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b-2 border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-md border-2 border-fg text-xs font-bold shrink-0 flex items-center gap-2 transition-all ${isActive
                    ? "bg-admin text-white shadow-pop-soft"
                    : "bg-card text-muted-fg hover:text-fg hover:bg-muted"
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${isActive
                        ? "bg-black/20 text-white border-black/30"
                        : "bg-muted text-muted-fg border-border"
                      }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        {loading && (
          <div className="p-4 rounded-md border-2 border-fg bg-muted/40 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-admin" />
            <span className="font-semibold">Menghubungkan ke backend dan memuat repositori AI...</span>
          </div>
        )}

        <div className="space-y-6">
          {activeTab === "ringkasan" && (
            <TabRingkasan
              models={models}
              activeModel={activeModel}
              kelasList={kelasList}
              totalSampel={totalSampel}
              hfStats={hfStats}
              onNavigateTab={(target) => setActiveTab(target as AdminAiTab)}
            />
          )}

          {activeTab === "dataset" && (
            <TabDatasetMaster
              kelasList={kelasList}
              totalSampel={totalSampel}
              hfStats={hfStats}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === "validasi" && (
            <TabValidasiKurasi
              kelasList={kelasList}
              sampelList={[]}
              totalSampel={totalSampel}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === "eksperimen" && (
            <TabEksperimenKaggle
              researchSummary={researchSummary}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === "evaluasi" && (
            <TabEvaluasiHeadToHead
              researchSummary={researchSummary}
              activeModel={activeModel}
              models={models}
              selectedRunId={selectedResearchRunId}
              onSelectRun={handleSelectResearchRun}
              isSwitchingRun={isSwitchingRun}
            />
          )}

          {activeTab === "deploy" && (
            <TabModelSandboxDeploy
              models={models}
              activeModel={activeModel}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === "log" && (
            <TabLogInferensi
              logs={[]}
              kelasList={kelasList}
              ringkasanAkurasi={ringkasanAkurasi}
              onRefresh={loadAllData}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default function AdminAIManagementPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-fg">Memuat Manajemen AI...</div>}>
      <AdminAIManagementContent />
    </Suspense>
  );
}
