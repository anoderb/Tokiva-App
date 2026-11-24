"use client";

import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, RefreshCw, Sparkles, Volume2, VolumeX } from "lucide-react";
import type { AiDetectionCandidate, AiVisionModalProps, SessionScanItem } from "./ai-vision/ai-vision-types";
import { useAiVisionScanner } from "./ai-vision/useAiVisionScanner";
import { AiVisionCameraPane } from "./ai-vision/AiVisionCameraPane";
import { AiVisionSessionCart } from "./ai-vision/AiVisionSessionCart";

export type { AiDetectionCandidate, SessionScanItem };

export function AiVisionModal({
  open,
  onClose,
  products,
  onSelectProduct,
  onUpdateCartQty,
  cart = [],
}: AiVisionModalProps) {
  const vm = useAiVisionScanner({ open, products, onSelectProduct, onUpdateCartQty, cart });

  return (
      <Modal open={open} onClose={onClose} title="Scanner Kamera AI (Kontinu Multi-Item)" className="max-w-4xl">
        <canvas ref={vm.canvasRef} className="hidden" />

        <div className="flex flex-col gap-3 font-body text-xs">
          <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-muted border-2 border-border text-[11px]">
            <div className="flex items-center gap-2 truncate">
              <Sparkles className="w-4 h-4 text-accent shrink-0" />
              <span className="text-muted-fg font-medium">Model:</span>
              <span className="font-mono font-bold text-fg">{vm.modelMeta?.versi || "v1.2.20260912"}</span>
              <span className="text-muted-fg hidden sm:inline">·</span>
              <span className="text-muted-fg font-mono hidden sm:inline">
                Threshold High: {Math.round(vm.highThreshold * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => vm.setIsMuted((prev) => !prev)}
                className={`px-2 py-1 rounded border-2 border-fg text-[11px] font-bold flex items-center gap-1 transition-colors ${vm.isMuted
                    ? "bg-rose-100 text-rose-800 border-rose-600 dark:bg-rose-950 dark:text-rose-200"
                    : "bg-emerald-100 text-emerald-800 border-emerald-600 dark:bg-emerald-950 dark:text-emerald-200"
                  }`}
                title={vm.isMuted ? "Suara beep dimatikan" : "Suara beep scanner aktif"}
              >
                  {
                    vm.isMuted ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-rose-600" /> Beep Mati
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> Beep Aktif
                      </>
                    )
                  }
            </button>

                {
                  vm.loadingModel ? (
                    <Badge variant="yellow" className="text-[10px]">
                      <RefreshCw className="w-3 h-3 animate-spin mr-1 inline" /> Memuat
                    </Badge>
                  ) : vm.modelReady ? (
                    <Badge variant="green" className="text-[10px]">● Scanner Siap</Badge>
                  ) : (
                    <Badge variant="gray" className="text-[10px]">Offline</Badge>
                  )
                }
          </div>
          </div>

            {
              vm.errorMsg && (
                <div className="p-2.5 rounded-md border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{vm.errorMsg}</span>
                </div>
              )
            }

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <AiVisionCameraPane
                  videoRef={vm.videoRef}
                  camStatus={vm.camStatus}
                  camError={vm.camError}
                  isCamDenied={vm.isCamDenied}
                  videoDevicesCount={vm.videoDevices.length}
                  scanFlash={vm.scanFlash}
                  justScannedName={vm.justScannedName}
                  liveCandidate={vm.liveCandidate}
                  latencyMs={vm.latencyMs}
                  cooldownSec={vm.cooldownSec}
                  highThreshold={vm.highThreshold}
                  alternativePicks={vm.alternativePicks}
                  isAnalyzingManual={vm.isAnalyzingManual}
                  onRequestConsent={() => vm.activateCamera(vm.selectedDeviceIdxRef.current, true)}
                  onSwitchCamera={vm.handleSwitchCamera}
                  onSelectCandidate={(cand, unit, meta) =>
                    vm.triggerSuccessfulScan(cand.product, cand.confidence, cand.classLabel, cand.kelasId, unit, meta)
                  }
                  onManualUpload={vm.handleManualUpload}
                  onResetCooldown={vm.resetCooldown}
                />

            <AiVisionSessionCart
              sessionScans={vm.sessionScans}
              products={products}
              correctingItem={vm.correctingItem}
              correctionSearch={vm.correctionSearch}
              onStartCorrection={(item) => {
                vm.setCorrectingItem(item);
                vm.setCorrectionSearch("");
              }}
              onCancelCorrection={() => vm.setCorrectingItem(null)}
              onChangeCorrectionSearch={vm.setCorrectionSearch}
              onApplyCorrection={vm.handleApplyCorrection}
              onIncrementItem={vm.handleIncrementItem}
              onDecrementItem={vm.handleDecrementItem}
              onClose={onClose}
            />
          </div>
        </div>
      </Modal>
      );
}
