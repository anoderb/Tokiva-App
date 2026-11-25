"use client";

import type React from "react";
import { CameraPermissionOverlay } from "@/components/shared/camera-permission-overlay";
import type { CameraStatus } from "@/lib/utils/camera";
import type { ProdukSatuan } from "@/types/api";
import type { AiDetectionCandidate } from "./ai-vision-types";
import { Check, Clock, SwitchCamera, Upload, Zap } from "lucide-react";

interface AiVisionCameraPaneProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  camStatus: CameraStatus;
  camError: string | null;
  isCamDenied: boolean;
  videoDevicesCount: number;
  scanFlash: boolean;
  justScannedName: string | null;
  liveCandidate: AiDetectionCandidate | null;
  latencyMs: number;
  cooldownSec: number;
  highThreshold: number;
  alternativePicks: AiDetectionCandidate[];
  isAnalyzingManual: boolean;
  onRequestConsent: () => void;
  onSwitchCamera: () => void;
  onSelectCandidate: (
    cand: AiDetectionCandidate,
    unit: ProdukSatuan | "base",
    meta?: {
      isCorrection?: boolean;
      predictedKelasId?: string;
      predictedConfidence?: number;
      detectionMethod?: "softmax" | "embedding";
    }
  ) => void;
  onManualUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetCooldown: () => void;
}

/** Viewport kamera AI Vision dengan overlay deteksi, quick-pick kandidat sedang, & upload manual */
export function AiVisionCameraPane({
  videoRef,
  camStatus,
  camError,
  isCamDenied,
  videoDevicesCount,
  scanFlash,
  justScannedName,
  liveCandidate,
  latencyMs,
  cooldownSec,
  highThreshold,
  alternativePicks,
  isAnalyzingManual,
  onRequestConsent,
  onSwitchCamera,
  onSelectCandidate,
  onManualUpload,
  onResetCooldown,
}: AiVisionCameraPaneProps) {
  return (
    <div className="lg:col-span-7 flex flex-col gap-2.5">
      <div
        className={`relative bg-slate-950 rounded-lg overflow-hidden aspect-[4/3] flex items-center justify-center border-2 border-fg transition-all duration-200 ${scanFlash ? "ring-4 ring-emerald-400 border-emerald-500 scale-[1.01]" : ""
          }`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-200 ${camStatus === "active" ? "opacity-100" : "opacity-0"
            }`}
        />

        <CameraPermissionOverlay
          status={camStatus}
          errorMessage={camError}
          isPermissionDenied={isCamDenied}
          title="Izin Kamera Scanner AI"
          description="Tokiva memerlukan izin kamera untuk mendeteksi kemasan produk secara otomatis saat transaksi kasir."
          startingText="Menyalakan Kamera Scanner AI..."
          onRequestConsent={onRequestConsent}
          onRetry={onRequestConsent}
        />

        {camStatus === "active" && videoDevicesCount > 1 && (
          <button
            type="button"
            onClick={onSwitchCamera}
            className="absolute bottom-2.5 right-2.5 z-20 p-1.5 rounded-full border border-white/20 bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm cursor-pointer transition-colors"
            title="Ganti Kamera (Depan / Belakang)"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>
        )}

        {camStatus === "active" && (
          <div
            className={`absolute inset-7 border-2 border-dashed rounded-lg pointer-events-none transition-colors duration-200 flex flex-col justify-between p-3 ${scanFlash
              ? "border-emerald-400 bg-emerald-500/15"
              : cooldownSec > 0
                ? "border-amber-400/80 bg-amber-500/5"
                : "border-white/40"
              }`}
          >
            <div className="flex justify-between items-center text-[10px] font-mono text-white/70">
              <span className="bg-black/60 px-1.5 py-0.5 rounded">Scanning AI Aktif</span>
              {latencyMs > 0 && <span className="bg-black/60 px-1.5 py-0.5 rounded">⚡ {latencyMs} ms</span>}
            </div>

            <div className="text-center">
              {cooldownSec > 0 ? (
                <span className="text-[11px] font-bold bg-amber-900/90 text-amber-200 px-2.5 py-1 rounded-full border border-amber-400 shadow inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 animate-spin" /> Barang Sama ({cooldownSec}s)
                </span>
              ) : scanFlash ? (
                <span className="text-xs font-heading font-bold bg-emerald-600 text-white px-3 py-1 rounded-full shadow-pop-soft inline-flex items-center gap-1.5 animate-bounce">
                  <Check className="w-3.5 h-3.5" /> BEEP! +1 {justScannedName}
                </span>
              ) : (
                <span className="text-[10px] text-white/60 font-mono bg-black/60 px-2 py-0.5 rounded">
                  Arahkan kemasan produk ke kotak ini
                </span>
              )}
            </div>

            <div className="text-right">
              <span className="text-[9px] text-white/40 font-mono">Non-Stop Multi-Scan</span>
            </div>
          </div>
        )}

        {camStatus === "active" && liveCandidate && (
          <div className="absolute top-2 left-2 right-2 p-2 rounded-md bg-black/85 backdrop-blur-md border border-white/20 flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-2 truncate">
              <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${liveCandidate.detectionMethod === "embedding"
                  ? "bg-violet-400"
                  : liveCandidate.confidence >= highThreshold * 100
                      ? "bg-emerald-400 animate-ping"
                      : "bg-amber-400"
                }`}
              />
              <span className="font-bold truncate font-mono text-xs">{liveCandidate.product.nama}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {liveCandidate.detectionMethod === "embedding" && (
                <span className="px-1.5 py-0.5 rounded font-bold text-[9px] bg-violet-500/25 text-violet-300 border border-violet-400">
                  Embed Baru
                </span>
              )}
              <span
              className={`px-1.5 py-0.5 rounded font-bold font-mono text-[10px] border ${liveCandidate.detectionMethod === "embedding"
                  ? "bg-amber-500/20 text-amber-300 border-amber-400"
                  : liveCandidate.confidence >= highThreshold * 100
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                      : "bg-amber-500/20 text-amber-400 border-amber-500"
                }`}
              >
            {liveCandidate.confidence}%
          </span>
            </div>
    </div>
        )
}
    </div >

{
  alternativePicks.length > 0 && (
    <div className="p-2 rounded-md border-2 border-amber-500 bg-amber-50/90 dark:bg-amber-950/40 space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-600" /> Deteksi Sedang (Ketuk Cepat untuk Menambah):
        </span>
        <span className="text-[10px] font-mono text-muted-fg">1-Tap Add</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {alternativePicks.map((cand, i) => (
          <button
            key={cand.product.id || i}
            type="button"
            onClick={() =>
              onSelectCandidate(
                cand,
                "base",
                i > 0
                  ? {
                    isCorrection: true,
                    predictedKelasId: alternativePicks[0]?.kelasId,
                    predictedConfidence: alternativePicks[0]?.confidence,
                    detectionMethod: cand.detectionMethod,
                  }
                  : {
                    detectionMethod: cand.detectionMethod,
                  }
              )
            }
            className="p-1.5 rounded border border-fg bg-card hover:bg-accent hover:text-white transition-colors text-left flex flex-col justify-between text-[11px] font-bold truncate shadow-sm cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate block font-body">{cand.product.nama}</span>
              {cand.detectionMethod === "embedding" && (
                <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-violet-100 text-violet-800 border border-violet-400 shrink-0">
                  Baru
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-fg mt-0.5">
              <span className="text-accent font-bold">Rp{Number(cand.product.harga_jual).toLocaleString("id-ID")}</span>
              <span>{cand.confidence}%</span>
            </div>
          </button>
        ))}
      </div>
      </div>
    )
  }

<div className="flex items-center gap-2">
  <label className="flex-1 py-1.5 px-3 rounded-md border-2 border-fg bg-card hover:bg-muted font-heading font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_var(--shadow-color)]">
    <Upload className="w-3.5 h-3.5 text-accent" />
    <span>{isAnalyzingManual ? "Menganalisis..." : "Unggah Foto Pengganti"}</span>
    <input type="file" accept="image/*" onChange={onManualUpload} className="hidden" disabled={isAnalyzingManual} />
  </label>

  <button
    type="button"
    onClick={onResetCooldown}
    className="py-1.5 px-2.5 rounded-md border-2 border-fg bg-muted hover:bg-muted/80 text-xs font-bold text-muted-fg hover:text-fg"
    title="Reset cooldown sekarang"
  >
    Reset Sensor
  </button>
</div>
    </div >
  );
}
