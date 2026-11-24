"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Upload,
  Camera,
  Video,
  VideoOff,
  UploadCloud,
  Zap,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
  SwitchCamera,
} from "lucide-react";
import { useTfjsModel, type InferenceOutput } from "../hooks/useTfjsModel";
import { playScannerBeep } from "@/lib/utils/audio";
import { CameraPermissionOverlay } from "@/components/shared/camera-permission-overlay";
import {
  acquireCameraStream,
  attachStreamToVideo,
  checkCameraConsentState,
  formatCameraError,
  listCameraDevices,
  markCameraConsentGranted,
  releaseCameraStream,
  resetCameraConsent,
  type CameraStatus,
} from "@/lib/utils/camera";
import type { AIModel } from "@/types/api";

interface TestingSandboxProps {
  model: AIModel | null;
  threshold?: number;
}

const COOLDOWN_SANDBOX_MS = 1800;

export function TestingSandbox({ model, threshold = 0.75 }: TestingSandboxProps) {
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [camStatus, setCamStatus] = useState<CameraStatus>("idle");
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isCamDenied, setIsCamDenied] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceIdx, setSelectedDeviceIdx] = useState(0);
  const [testImagePreview, setTestImagePreview] = useState<string | null>(null);
  const [inferenceResult, setInferenceResult] = useState<InferenceOutput | null>(null);
  const [isInferencing, setIsInferencing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const camSessionRef = useRef<number>(0);
  const videoDevicesRef = useRef<MediaDeviceInfo[]>([]);
  const selectedDeviceIdxRef = useRef<number>(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    selectedDeviceIdxRef.current = selectedDeviceIdx;
  }, [selectedDeviceIdx]);

  const lastScannedRef = useRef<{ label: string; time: number } | null>(null);
  const emptyFrameCountRef = useRef<number>(0);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
      }
    };
  }, []);

  const {
    model: tfModel,
    classes,
    loading: modelLoading,
    error: modelError,
    loadModel,
    predict,
  } = useTfjsModel();

  // Load model when target model changes (dengan toleransi mapping property backend)
  useEffect(() => {
    const targetModelUrl =
      model?.model_json_url ||
      (model as any)?.path_model_json ||
      (model as any)?.model_url;
    const targetClassUrl =
      model?.class_json_url ||
      (model as any)?.path_label ||
      (model as any)?.labels_url;

    if (targetModelUrl) {
      loadModel(targetModelUrl, targetClassUrl);
    }
  }, [model, loadModel]);

  const stopWebcam = useCallback(() => {
    camSessionRef.current += 1;
    releaseCameraStream(streamRef.current, videoRef.current);
    streamRef.current = null;
    setCamStatus("idle");
  }, []);

  // Clean webcam on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  const activateWebcamStream = useCallback(
    async (deviceIndex = selectedDeviceIdxRef.current, isUserGesture = false) => {
      const sessionId = ++camSessionRef.current;
      releaseCameraStream(streamRef.current, videoRef.current);
      streamRef.current = null;

      setWebcamError(null);
      setIsCamDenied(false);
      setCamStatus("starting");

      if (isUserGesture) {
        markCameraConsentGranted();
      }

      try {
        const targetDeviceId = videoDevicesRef.current[deviceIndex]?.deviceId;
        const stream = await acquireCameraStream({
          deviceId: targetDeviceId,
          facingMode: "environment",
          width: 640,
          height: 480,
        });

        if (sessionId !== camSessionRef.current || !videoRef.current) {
          releaseCameraStream(stream, null);
          return;
        }

        streamRef.current = stream;
        await attachStreamToVideo(videoRef.current, stream);

        if (sessionId !== camSessionRef.current) {
          releaseCameraStream(stream, videoRef.current);
          streamRef.current = null;
          return;
        }

        markCameraConsentGranted();
        const devices = await listCameraDevices();
        if (sessionId === camSessionRef.current) {
          videoDevicesRef.current = devices;
          setVideoDevices(devices);
          setCamStatus("active");
        }
      } catch (err: unknown) {
        if (sessionId !== camSessionRef.current) return;
        const { message, isPermissionDenied } = formatCameraError(err);
        if (isPermissionDenied) {
          resetCameraConsent();
        }
        setWebcamError(message);
        setIsCamDenied(isPermissionDenied);
        setCamStatus("error");
      }
    },
    []
  );

  const startWebcam = useCallback(async () => {
    const sessionId = ++camSessionRef.current;
    const consent = await checkCameraConsentState();
    if (sessionId !== camSessionRef.current) return;

    if (consent === "unsupported") {
      setWebcamError(
        "Browser tidak mendukung akses kamera atau halaman tidak dibuka melalui HTTPS / localhost."
      );
      setIsCamDenied(false);
      setCamStatus("error");
      return;
    }

    if (consent === "denied") {
      resetCameraConsent();
      setWebcamError(
        "Izin akses kamera ditolak oleh browser. Aktifkan izin kamera agar pemindaian dapat berjalan."
      );
      setIsCamDenied(true);
      setCamStatus("error");
      return;
    }

    if (consent === "needs_consent") {
      setCamStatus("needs_consent");
      return;
    }

    await activateWebcamStream(selectedDeviceIdxRef.current, false);
  }, [activateWebcamStream]);

  const handleSwitchCamera = useCallback(() => {
    if (videoDevicesRef.current.length <= 1) return;
    const nextIdx = (selectedDeviceIdxRef.current + 1) % videoDevicesRef.current.length;
    setSelectedDeviceIdx(nextIdx);
    selectedDeviceIdxRef.current = nextIdx;
    activateWebcamStream(nextIdx, true);
  }, [activateWebcamStream]);

  // Dedicated Reactive Inference Loop for Live Camera
  useEffect(() => {
    if (camStatus !== "active" || !tfModel || mode !== "camera") return;

    let isSubscribed = true;
    let timer: NodeJS.Timeout | null = null;

    const runLoop = async () => {
      if (!isSubscribed) return;

      const video = videoRef.current;
      if (
        video &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        try {
          setIsInferencing(true);
          const res = await predict(video, threshold);
          if (res && isSubscribed) {
            setInferenceResult(res);

            const now = Date.now();
            if (res.isDetected) {
              emptyFrameCountRef.current = 0;
              const last = lastScannedRef.current;
              const isSame = last?.label === res.topLabel;
              const elapsed = last ? now - last.time : 999999;

              if (!isSame || elapsed >= COOLDOWN_SANDBOX_MS) {
                lastScannedRef.current = { label: res.topLabel, time: now };
                playScannerBeep("success", isMuted);
                setScanFlash(true);
                if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
                flashTimerRef.current = setTimeout(() => {
                  flashTimerRef.current = null;
                  setScanFlash(false);
                }, 400);
              }
            } else if (res.topConfidence < 0.25) {
              emptyFrameCountRef.current += 1;
              if (emptyFrameCountRef.current >= 2) {
                lastScannedRef.current = null;
              }
            }
          }
        } catch (inferErr) {
          console.error("Kesalahan inferensi kamera:", inferErr);
        } finally {
          if (isSubscribed) setIsInferencing(false);
        }
      }

      if (isSubscribed) {
        timer = setTimeout(runLoop, 250);
      }
    };

    runLoop();

    return () => {
      isSubscribed = false;
      if (timer) clearTimeout(timer);
    };
  }, [camStatus, tfModel, mode, predict, threshold, isMuted]);

  const toggleWebcam = () => {
    if (camStatus === "active" || camStatus === "starting") {
      stopWebcam();
    } else {
      startWebcam();
    }
  };

  const handleModeChange = (newMode: "camera" | "upload") => {
    if (newMode === "upload") {
      stopWebcam();
    }
    setMode(newMode);
  };

  // Run inference on uploaded image
  const runImageInference = useCallback(
    async (imgElement: HTMLImageElement) => {
      if (!tfModel) return;
      setIsInferencing(true);
      try {
        const res = await predict(imgElement, threshold);
        if (res) {
          setInferenceResult(res);
          if (res.isDetected) {
            playScannerBeep("success", isMuted);
            setScanFlash(true);
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
            flashTimerRef.current = setTimeout(() => {
              flashTimerRef.current = null;
              setScanFlash(false);
            }, 400);
          }
        }
      } catch (err) {
        console.error("Gagal inferensi foto:", err);
      } finally {
        setIsInferencing(false);
      }
    },
    [tfModel, predict, threshold, isMuted]
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => {
      setIsInferencing(false);
      setWebcamError("Gagal membaca file gambar.");
    };
    reader.onload = () => {
      const b64 = reader.result as string;
      setTestImagePreview(b64);

      const img = new Image();
      img.onload = () => {
        runImageInference(img);
      };
      img.onerror = () => {
        setIsInferencing(false);
        setWebcamError("File gambar rusak atau tidak didukung oleh peramban.");
      };
      img.src = b64;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 sm:p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-border pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-bold text-base flex items-center gap-2">
              <Play className="w-4 h-4 text-accent" /> Realtime Testing Sandbox (TFJS Browser)
            </h3>
            {model ? (
              <Badge variant={model.aktif ? "green" : "purple"}>
                <FlaskConical className="w-3 h-3 inline mr-1" /> {model.versi}
              </Badge>
            ) : (
              <Badge variant="yellow">Pilih Model Terlebih Dahulu</Badge>
            )}
            {classes.length > 0 && (
              <Badge variant="gray" className="font-mono text-[10px]">
                {classes.length} Kelas Terdaftar
              </Badge>
            )}
          </div>
          <p className="text-muted-fg text-xs mt-1">
            Uji inferensi langsung pada browser menggunakan webcam live (loop 250ms) atau upload foto kemasan produk dengan feedback audio beep.
          </p>
        </div>

        {/* Mode Toggle & Audio Beep Button */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className={`px-2.5 py-1 text-xs font-bold rounded-md border-2 border-fg flex items-center gap-1.5 transition-colors ${
              isMuted
                ? "bg-rose-100 text-rose-800 border-rose-600 dark:bg-rose-950 dark:text-rose-200"
                : "bg-emerald-100 text-emerald-800 border-emerald-600 dark:bg-emerald-950 dark:text-emerald-200"
            }`}
            title={isMuted ? "Audio beep scanner dinonaktifkan" : "Audio beep scanner aktif"}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-600" /> Beep Mati
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> Beep Aktif
              </>
            )}
          </button>

          <div className="flex items-center gap-1 p-1 bg-muted rounded-md border-2 border-fg shrink-0">
            <button
              type="button"
              onClick={() => handleModeChange("camera")}
              className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${
                mode === "camera" ? "bg-accent text-accent-fg shadow-sm" : "text-muted-fg hover:text-fg"
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Kamera Live
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("upload")}
              className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${
                mode === "upload" ? "bg-accent text-accent-fg shadow-sm" : "text-muted-fg hover:text-fg"
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Upload Foto
            </button>
          </div>
        </div>
      </div>

      {/* Model Loading / Error Notice */}
      {modelLoading && (
        <div className="p-2.5 rounded-md border-2 border-fg bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Memuat arsitektur model TFJS dan sinkronisasi class labels...</span>
        </div>
      )}
      {modelError && (
        <div className="p-2.5 rounded-md border-2 border-fg bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{modelError}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Viewport */}
        <div className="lg:col-span-7 space-y-2">
          <div
            className={`relative aspect-video rounded-md bg-slate-950 border-2 border-fg overflow-hidden flex items-center justify-center transition-all ${
              scanFlash ? "ring-4 ring-emerald-400 border-emerald-500" : ""
            }`}
          >
            {mode === "camera" ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-opacity duration-200 ${
                    camStatus === "active" ? "opacity-100" : "opacity-0"
                  }`}
                />
                {camStatus === "idle" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <VideoOff className="w-10 h-10 mx-auto text-slate-500" />
                    <p className="text-xs">
                      Kamera tidak aktif. Klik tombol di bawah untuk mulai scanning produk.
                    </p>
                  </div>
                ) : (
                  <CameraPermissionOverlay
                    status={camStatus}
                    errorMessage={webcamError}
                    isPermissionDenied={isCamDenied}
                    title="Izin Kamera Testing Sandbox"
                    description="Tokiva memerlukan izin kamera untuk menguji deteksi produk secara langsung di Sandbox AI."
                    startingText="Menyalakan Kamera Sandbox..."
                    onRequestConsent={() => activateWebcamStream(selectedDeviceIdxRef.current, true)}
                    onRetry={() => activateWebcamStream(selectedDeviceIdxRef.current, true)}
                  />
                )}
              </>
            ) : (
              <>
                {testImagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    ref={imgRef}
                    src={testImagePreview}
                    alt="Uji Kemasan"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <label className="cursor-pointer text-center p-6 space-y-2 text-slate-400 hover:text-slate-200">
                    <UploadCloud className="w-10 h-10 mx-auto text-accent" />
                    <p className="text-xs font-bold text-slate-200">Pilih foto kemasan produk untuk uji inferensi</p>
                    <p className="text-[10px] text-slate-500 font-mono">JPG, PNG, WEBP (Maks 5MB)</p>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                )}
              </>
            )}

            {/* Tombol Ganti Kamera jika > 1 kamera */}
            {mode === "camera" && camStatus === "active" && videoDevices.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="absolute bottom-2.5 right-2.5 z-20 p-1.5 rounded-full border border-white/20 bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm cursor-pointer transition-colors"
                title="Ganti Kamera (Depan / Belakang)"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}

            {/* Target Reticle / Scanner Overlay when camera is active */}
            {mode === "camera" && camStatus === "active" && (
              <div
                className={`absolute inset-8 border-2 border-dashed rounded-lg pointer-events-none flex items-center justify-center transition-colors ${
                  scanFlash
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-white/30"
                }`}
              >
                <span className="text-[11px] text-white/60 font-mono bg-black/50 px-2 py-0.5 rounded">
                  Arahkan kemasan produk ke kotak ini
                </span>
              </div>
            )}

            {/* Live Banner Overlay */}
            {inferenceResult && (
              <div className="absolute top-2 left-2 right-2 p-2 rounded bg-black/85 backdrop-blur-sm border-2 border-fg flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      inferenceResult.isDetected ? "bg-emerald-400 animate-ping" : "bg-amber-400"
                    }`}
                  />
                  <span className="font-bold truncate font-mono uppercase">
                    {inferenceResult.topLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[11px] text-slate-400">{inferenceResult.ms} ms</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold font-mono text-[11px] border ${
                      inferenceResult.isDetected
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                        : "bg-amber-500/20 text-amber-400 border-amber-500"
                    }`}
                  >
                    {(inferenceResult.topConfidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {mode === "camera" ? (
            <Button
              type="button"
              onClick={toggleWebcam}
              variant={camStatus === "active" || camStatus === "starting" ? "outline" : "primary"}
              className="w-full font-bold"
            >
              {camStatus === "active" || camStatus === "starting" ? (
                <>
                  <VideoOff className="w-4 h-4 mr-1.5" /> Stop Scanning Kamera
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-1.5" /> Mulai Scanning Kamera Live
                </>
              )}
            </Button>
          ) : (
            testImagePreview && (
              <div className="flex items-center gap-2">
                <label className="flex-1 text-center py-2 px-3 border-2 border-fg rounded-md bg-muted hover:bg-muted/80 text-xs font-bold cursor-pointer transition-colors">
                  Ganti Foto Pengujian
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (imgRef.current) runImageInference(imgRef.current);
                  }}
                  disabled={isInferencing}
                  className="font-bold text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isInferencing ? "animate-spin" : ""}`} /> Uji Ulang
                </Button>
              </div>
            )
          )}
        </div>

        {/* Right Output Panel */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div className="p-3 rounded-md border-2 border-fg bg-card space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-fg">
                Top-3 Prediksi Inferensi
              </span>
              <span className="text-[10px] font-mono text-muted-fg flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                Latensi: {inferenceResult ? `${inferenceResult.ms} ms` : "—"}
              </span>
            </div>

            {inferenceResult && inferenceResult.predictions.length > 0 ? (
              <div className="space-y-2.5">
                {inferenceResult.predictions.slice(0, 3).map((pred, idx) => {
                  const pct = Math.round(pred.score * 100);
                  const isTop = idx === 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`font-semibold truncate max-w-[180px] font-mono ${
                            isTop ? "font-bold text-fg" : "text-muted-fg"
                          }`}
                        >
                          {idx + 1}. {pred.label}
                        </span>
                        <span className="font-mono font-bold text-xs">{pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden border border-border">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isTop
                              ? pct >= Math.round(threshold * 100)
                                ? "bg-emerald-500"
                                : pct >= 25
                                ? "bg-amber-500"
                                : "bg-rose-500"
                              : "bg-slate-400"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-fg text-xs space-y-1">
                <Sparkles className="w-6 h-6 mx-auto text-slate-400" />
                <p>Belum ada hasil prediksi.</p>
                <p className="text-[10px]">
                  {camStatus === "active"
                    ? "Arahkan kemasan produk ke kamera..."
                    : "Aktifkan kamera live atau unggah foto untuk melihat inferensi."}
                </p>
              </div>
            )}

            {/* Threshold Status */}
            {inferenceResult && (
              <div
                className={`p-2 rounded border-2 text-xs flex items-center gap-2 ${
                  inferenceResult.isDetected
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-800 dark:text-emerald-300"
                    : "bg-amber-50 dark:bg-amber-950/20 border-amber-500 text-amber-800 dark:text-amber-300"
                }`}
              >
                {inferenceResult.isDetected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <div>
                      <span className="font-bold block">Terdeteksi (High Confidence)</span>
                      <span className="text-[10px] text-muted-fg">
                        Probabilitas ≥ {Math.round(threshold * 100)}% (Otomatis masuk ke keranjang kasir + BEEP).
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <div>
                      <span className="font-bold block">Perlu Konfirmasi Kasir (Medium Confidence)</span>
                      <span className="text-[10px] text-muted-fg">
                        Probabilitas &lt; {Math.round(threshold * 100)}% (Kasir memilih dari Top-3 kandidat).
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Model Info Footer */}
          <div className="p-2.5 rounded-md border-2 border-fg bg-muted/30 text-[11px] font-mono space-y-1">
            <div className="flex items-center justify-between text-muted-fg">
              <span>Arsitektur:</span>
              <span className="font-bold text-fg">{model?.nama_model || model?.arsitektur || "MobileNetV3-Large"}</span>
            </div>
            <div className="flex items-center justify-between text-muted-fg">
              <span>Status TFJS:</span>
              <span className={tfModel ? "text-emerald-600 font-bold" : "text-amber-600"}>
                {tfModel ? "Model Siap Digunakan" : modelLoading ? "Memuat..." : "Belum Dimuat"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
