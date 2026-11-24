"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  Scan,
  Sparkles,
  SwitchCamera,
  Zap,
} from "lucide-react";
import { playScannerBeep } from "@/lib/utils/audio";
import { CameraPermissionOverlay } from "@/components/shared/camera-permission-overlay";
import {
  acquireCameraStream,
  checkCameraConsentState,
  formatCameraError,
  listCameraDevices,
  markCameraConsentGranted,
  releaseCameraStream,
  resetCameraConsent,
  type CameraStatus,
} from "@/lib/utils/camera";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

export function BarcodeScannerModal({
  open,
  onClose,
  onScan,
  quickShortcuts = [],
}: {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  quickShortcuts?: Array<{ label: string; code: string }>;
}) {
  const [manualCode, setManualCode] = useState("");
  const [camStatus, setCamStatus] = useState<CameraStatus>("idle");
  const [camError, setCamError] = useState<string | null>(null);
  const [isCamDenied, setIsCamDenied] = useState(false);
  const [detectedBadge, setDetectedBadge] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const [torchActive, setTorchActive] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanningRef = useRef(false);
  const scanSessionRef = useRef(0);
  const videoDevicesRef = useRef<MediaDeviceInfo[]>([]);
  const selectedDeviceIndexRef = useRef(0);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    selectedDeviceIndexRef.current = selectedDeviceIndex;
  }, [selectedDeviceIndex]);

  // Stop camera tracks and reader controls
  const stopScanner = useCallback(() => {
    scanSessionRef.current += 1;
    isScanningRef.current = false;
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch {
        // ignore
      }
      controlsRef.current = null;
    }
    releaseCameraStream(streamRef.current, videoRef.current);
    streamRef.current = null;
    setTorchActive(false);
    setTorchSupported(false);
  }, []);

  // Initialize and start camera scanning
  const startScanner = useCallback(
    async (deviceIndex: number = selectedDeviceIndexRef.current, isUserGesture = false) => {
      stopScanner();
      if (!videoRef.current) return;

      const sessionId = ++scanSessionRef.current;
      setCamStatus("starting");
      setCamError(null);
      setIsCamDenied(false);
      setDetectedBadge(null);
      isScanningRef.current = true;

      if (isUserGesture) {
        markCameraConsentGranted();
      }

      try {
        const targetDeviceId = videoDevicesRef.current[deviceIndex]?.deviceId;
        const stream = await acquireCameraStream({
          deviceId: targetDeviceId,
          facingMode: "environment",
          width: 1280,
          height: 720,
        });

        if (!isScanningRef.current || sessionId !== scanSessionRef.current || !videoRef.current) {
          releaseCameraStream(stream, null);
          return;
        }

        streamRef.current = stream;
        markCameraConsentGranted();

        // Enumerate devices after permission granted so labels & deviceIds are complete
        const devices = await listCameraDevices();
        if (isScanningRef.current && sessionId === scanSessionRef.current) {
          videoDevicesRef.current = devices;
          setVideoDevices(devices);
        }

        // Check torch compatibility
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = videoTrack.getCapabilities
            ? (videoTrack.getCapabilities() as any)
            : null;
          if (capabilities && "torch" in capabilities) {
            setTorchSupported(true);
          }
        }

        // Configure hints for ZXing
        const hints = new Map<DecodeHintType, any>();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.QR_CODE,
        ]);

        const codeReader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 150,
          delayBetweenScanSuccess: 500,
          tryPlayVideoTimeout: 4000,
        });

        // Attach stream and decode directly from stream into videoRef
        const controls = await codeReader.decodeFromStream(
          stream,
          videoRef.current,
          (result, _error, ctrls) => {
            if (!isScanningRef.current || sessionId !== scanSessionRef.current) return;
            if (result) {
              const raw = result.getText()?.trim();
              if (raw) {
                isScanningRef.current = false;
                playScannerBeep("success");
                setDetectedBadge(raw);
                try {
                  ctrls.stop();
                } catch {
                  // ignore
                }
                if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
                scanTimerRef.current = setTimeout(() => {
                  scanTimerRef.current = null;
                  onScanRef.current(raw);
                  onCloseRef.current();
                }, 400);
              }
            }
          }
        );

        if (!isScanningRef.current || sessionId !== scanSessionRef.current) {
          try {
            controls.stop();
          } catch {
            // ignore
          }
          releaseCameraStream(stream, videoRef.current);
          streamRef.current = null;
          return;
        }

        controlsRef.current = controls;
        setCamStatus("active");
      } catch (err: unknown) {
        if (!isScanningRef.current || sessionId !== scanSessionRef.current) return;
        const { message, isPermissionDenied } = formatCameraError(err);
        if (isPermissionDenied) {
          resetCameraConsent();
        }
        setCamError(message);
        setIsCamDenied(isPermissionDenied);
        setCamStatus("error");
      }
    },
    [stopScanner]
  );

  // Handle open/close cycle
  useEffect(() => {
    if (!open) {
      stopScanner();
      setCamStatus("idle");
      return;
    }

    let cancelled = false;
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    setManualCode("");
    setDetectedBadge(null);

    const initScanner = async () => {
      const consent = await checkCameraConsentState();
      if (cancelled) return;

      if (consent === "unsupported") {
        setCamError(
          "Browser tidak mendukung akses kamera atau halaman tidak dibuka melalui HTTPS / localhost."
        );
        setIsCamDenied(false);
        setCamStatus("error");
        return;
      }

      if (consent === "denied") {
        resetCameraConsent();
        setCamError(
          "Izin akses kamera ditolak oleh browser. Aktifkan izin kamera agar pemindai dapat berjalan."
        );
        setIsCamDenied(true);
        setCamStatus("error");
        return;
      }

      if (consent === "needs_consent") {
        setCamStatus("needs_consent");
        return;
      }

      await startScanner(selectedDeviceIndexRef.current, false);
    };

    initScanner();

    return () => {
      cancelled = true;
      window.clearTimeout(focusTimer);
      stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  // Handle toggle flashlight/torch
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchActive;
      await (track as any).applyConstraints({
        advanced: [{ torch: next }],
      });
      setTorchActive(next);
    } catch (err) {
      console.warn("Torch toggle failed:", err);
    }
  };

  // Handle camera switch (flip)
  const handleSwitchCamera = () => {
    if (videoDevicesRef.current.length <= 1) return;
    const nextIdx = (selectedDeviceIndexRef.current + 1) % videoDevicesRef.current.length;
    setSelectedDeviceIndex(nextIdx);
    selectedDeviceIndexRef.current = nextIdx;
    startScanner(nextIdx, true);
  };

  const handleSubmit = (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    stopScanner();
    playScannerBeep("success");
    onScan(clean);
    setManualCode("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Pemindai Barcode Produk" className="max-w-md">
      <div className="flex flex-col gap-3 text-xs font-body">
        <p className="text-muted-fg text-[11px]">
          Gunakan barcode scanner USB / Bluetooth, arahkan kamera ke barcode kemasan, atau masukkan kode EAN-13 secara manual.
        </p>

        {/* Camera / Scanner Viewport */}
        <div className="relative bg-slate-950 rounded-lg overflow-hidden aspect-[4/3] flex items-center justify-center border-2 border-fg shadow-pop-soft">
          {/* Always rendered video element to eliminate race condition */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              camStatus === "active" ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Camera Consent, Loading, & Error Overlay */}
          <CameraPermissionOverlay
            status={camStatus}
            errorMessage={camError}
            isPermissionDenied={isCamDenied}
            title="Izin Kamera Pemindai Barcode"
            description="Tokiva membutuhkan izin kamera untuk memindai kode barcode/QR pada kemasan produk secara langsung."
            startingText="Menyiapkan Kamera Pemindai..."
            onRequestConsent={() => startScanner(selectedDeviceIndexRef.current, true)}
            onRetry={() => startScanner(selectedDeviceIndexRef.current, true)}
          />

          {/* Active Overlay: Reticle Box & Scanner Animation */}
          {camStatus === "active" && (
            <>
              {/* Green Target Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-36 border-2 border-emerald-400/90 rounded-lg flex flex-col items-center justify-center bg-black/15 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  {/* Animated laser beam */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-[bounce_2s_infinite]" />
                  <Scan className="w-8 h-8 text-emerald-400 opacity-70 mb-1" />
                  <span className="text-[10px] font-bold bg-black/75 px-2 py-0.5 rounded text-white tracking-wide border border-emerald-500/30">
                    Posisikan Barcode di Area Ini
                  </span>
                </div>
              </div>

              {/* Camera Controls (Flip / Torch) */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
                {torchSupported && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className={`p-1.5 rounded-full border backdrop-blur-sm cursor-pointer transition-colors ${
                      torchActive
                        ? "bg-amber-400 text-black border-amber-300"
                        : "bg-black/60 text-white border-white/20 hover:bg-black/80"
                    }`}
                    title={torchActive ? "Matikan Lampu Senter" : "Nyalakan Lampu Senter"}
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                )}

                {videoDevices.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="p-1.5 rounded-full border border-white/20 bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm cursor-pointer transition-colors"
                    title="Ganti Kamera (Depan / Belakang)"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status pill */}
              <div className="absolute bottom-2 left-2 z-20 pointer-events-none">
                <div className="flex items-center gap-1.5 bg-black/75 border border-white/10 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Kamera Aktif · EAN-13 / QR / 1D</span>
                </div>
              </div>
            </>
          )}

          {/* Success Badge Overlay */}
          {detectedBadge && (
            <div className="absolute inset-0 bg-emerald-600/90 flex flex-col items-center justify-center text-white font-bold p-4 text-center z-30 animate-in fade-in duration-200">
              <Sparkles className="w-10 h-10 mb-1 animate-bounce" />
              <span className="text-base font-heading tracking-wide">BEEP! Barcode Terbaca</span>
              <span className="font-mono text-sm bg-black/60 px-3 py-1 rounded-md mt-1.5 border border-white/30 shadow">
                {detectedBadge}
              </span>
            </div>
          )}
        </div>

        {/* Manual / USB Scanner Input */}
        <div>
          <label className="block font-bold text-fg mb-1">Input Kode Barcode (USB / Manual):</label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ketik atau scan kode barcode lalu tekan Enter..."
              className="flex-1 px-3 py-2 bg-card border-2 border-border rounded text-xs outline-none focus:border-accent font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit(manualCode);
                }
              }}
            />
            <Button size="sm" onClick={() => handleSubmit(manualCode)}>
              Cari
            </Button>
          </div>
        </div>

        {/* Dynamic Shortcuts from Store Catalog */}
        {quickShortcuts.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
            <span className="text-muted-fg">Produk Cepat:</span>
            {quickShortcuts.map((sc, idx) => (
              <span key={sc.code} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSubmit(sc.code)}
                  className="text-accent underline font-mono cursor-pointer hover:opacity-80"
                >
                  {sc.label}
                </button>
                {idx < quickShortcuts.length - 1 && <span className="text-muted-fg">·</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
