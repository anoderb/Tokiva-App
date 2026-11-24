"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CameraPermissionOverlay } from "@/components/shared/camera-permission-overlay";
import {
  acquireCameraStream,
  attachStreamToVideo,
  checkCameraConsentState,
  formatCameraError,
  markCameraConsentGranted,
  releaseCameraStream,
  resetCameraConsent,
  type CameraStatus,
} from "@/lib/utils/camera";
import { useToast } from "@/components/ui/toast";
import {
  CloudUpload,
  Video,
  Camera,
  Check,
  Trash2,
  X,
  Star,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export interface DatasetPhotoItem {
  name: string;
  base64: string;
  sudut: string;
}

export type DatasetAcqMode = "files" | "video" | "camera_burst";

const DEFAULT_SUDUT_OPTIONS = [
  "Depan (Front)",
  "Belakang (Back)",
  "Samping Kiri (Left)",
  "Samping Kanan (Right)",
  "Atas (Top)",
  "Bawah (Bottom)",
  "Sudut Miring 45°",
  "360° Keliling",
];

async function extractVideoFrames(file: File, numFrames = 12): Promise<DatasetPhotoItem[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    let aborted = false;
    const cleanup = () => {
      aborted = true;
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
    };

    const metaTimer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Waktu pemuatan metadata video habis. Coba file MP4/WebM lain."));
    }, 15_000);

    video.onloadedmetadata = async () => {
      window.clearTimeout(metaTimer);
      try {
        const rawDuration = video.duration;
        const duration =
          Number.isFinite(rawDuration) && rawDuration > 0.2 ? rawDuration : 5;
        const step = duration / (numFrames + 1);
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        const extracted: DatasetPhotoItem[] = [];

        for (let i = 1; i <= numFrames; i++) {
          if (aborted) break;
          await new Promise<void>((res) => {
            let done = false;
            const finishSeek = (captureFrame: boolean) => {
              if (done) return;
              done = true;
              window.clearTimeout(seekTimer);
              video.onseeked = null;
              if (captureFrame && ctx) {
                ctx.drawImage(video, 0, 0, 640, 480);
                extracted.push({
                  name: `frame_${Date.now()}_${i}.jpg`,
                  base64: canvas.toDataURL("image/jpeg", 0.85),
                  sudut: "360° Keliling",
                });
              }
              res();
            };

            const seekTimer = window.setTimeout(() => finishSeek(false), 2500);
            video.onseeked = () => finishSeek(true);
            video.onerror = () => finishSeek(false);
            video.currentTime = Math.min(Math.max(0.05, duration - 0.05), i * step);
          });
        }
        cleanup();
        if (extracted.length === 0) {
          reject(new Error("Tidak ada frame yang berhasil diekstrak dari video."));
          return;
        }
        resolve(extracted);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      window.clearTimeout(metaTimer);
      cleanup();
      reject(new Error("Video tidak dapat diproses oleh browser."));
    };
  });
}

interface DatasetPhotoStudioProps {
  active: boolean;
  items: DatasetPhotoItem[];
  onChangeItems: (
    updater: DatasetPhotoItem[] | ((prev: DatasetPhotoItem[]) => DatasetPhotoItem[])
  ) => void;
  title?: string;
  subtitle?: string;
  defaultSudut?: string;
  sudutOptions?: string[];
  videoFrameCount?: number;
  burstIntervalMs?: number;
  requiredHint?: boolean;
  allowCoverSelect?: boolean;
  coverBase64?: string | null;
  onSelectCover?: (base64: string) => void;
  onRemoveItem?: (index: number) => void;
  onClearAll?: () => void;
}

export function DatasetPhotoStudio({
  active,
  items,
  onChangeItems,
  title = "Bahan Latih AI Vision (Foto Produk Multi-Sudut)",
  subtitle = "Kumpulkan sampel foto kemasan produk dari galeri, video 360°, atau kamera burst.",
  defaultSudut = "Depan (Front)",
  sudutOptions = DEFAULT_SUDUT_OPTIONS,
  videoFrameCount = 12,
  burstIntervalMs = 1200,
  requiredHint = false,
  allowCoverSelect = false,
  coverBase64 = null,
  onSelectCover,
  onRemoveItem,
  onClearAll,
}: DatasetPhotoStudioProps) {
  const { toast } = useToast();

  const [acqMode, setAcqMode] = useState<DatasetAcqMode>("files");
  const [selectedSudut, setSelectedSudut] = useState<string>(defaultSudut);
  const [isExtractingVideo, setIsExtractingVideo] = useState<boolean>(false);

  const [camStatus, setCamStatus] = useState<CameraStatus>("idle");
  const [camError, setCamError] = useState<string | null>(null);
  const [isCamDenied, setIsCamDenied] = useState<boolean>(false);
  const [isAutoBursting, setIsAutoBursting] = useState<boolean>(false);

  const camVideoRef = useRef<HTMLVideoElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const camSessionRef = useRef<number>(0);
  const burstIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapCamPhotoRef = useRef<() => void>(() => {});

  const stopBurstCam = useCallback(() => {
    camSessionRef.current += 1;
    if (burstIntervalRef.current) {
      clearInterval(burstIntervalRef.current);
      burstIntervalRef.current = null;
    }
    setIsAutoBursting(false);
    releaseCameraStream(camStreamRef.current, camVideoRef.current);
    camStreamRef.current = null;
    setCamStatus("idle");
  }, []);

  const startBurstCam = useCallback(
    async (isUserGesture = false) => {
      const sessionId = ++camSessionRef.current;
      releaseCameraStream(camStreamRef.current, camVideoRef.current);
      camStreamRef.current = null;

      setCamError(null);
      setIsCamDenied(false);
      setCamStatus("starting");

      if (isUserGesture) {
        markCameraConsentGranted();
      }

      try {
        const stream = await acquireCameraStream({
          facingMode: "environment",
          width: 1280,
          height: 720,
        });

        if (sessionId !== camSessionRef.current || !camVideoRef.current) {
          releaseCameraStream(stream, null);
          return;
        }

        camStreamRef.current = stream;
        await attachStreamToVideo(camVideoRef.current, stream);

        if (sessionId !== camSessionRef.current) {
          releaseCameraStream(stream, camVideoRef.current);
          camStreamRef.current = null;
          return;
        }

        markCameraConsentGranted();
        setCamStatus("active");
        toast.info("Kamera aktif. Posisikan produk lalu ambil foto.");
      } catch (err: unknown) {
        if (sessionId !== camSessionRef.current) return;
        const { message, isPermissionDenied } = formatCameraError(err);
        if (isPermissionDenied) {
          resetCameraConsent();
        }
        setCamError(message);
        setIsCamDenied(isPermissionDenied);
        setCamStatus("error");
        toast.error(message);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (!active || acqMode !== "camera_burst") {
      stopBurstCam();
      return;
    }

    let cancelled = false;
    const sessionId = ++camSessionRef.current;

    const initBurstCam = async () => {
      const consent = await checkCameraConsentState();
      if (cancelled || sessionId !== camSessionRef.current) return;

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
          "Izin akses kamera ditolak oleh browser. Aktifkan izin kamera agar Mode Burst dapat berjalan."
        );
        setIsCamDenied(true);
        setCamStatus("error");
        return;
      }

      if (consent === "needs_consent") {
        setCamStatus("needs_consent");
        return;
      }

      await startBurstCam(false);
    };

    initBurstCam();

    return () => {
      cancelled = true;
      stopBurstCam();
    };
  }, [active, acqMode, startBurstCam, stopBurstCam]);

  useEffect(() => {
    if (!active) {
      setAcqMode("files");
    }
  }, [active]);

  const snapCamPhoto = useCallback(() => {
    if (!camVideoRef.current) return;
    const video = camVideoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    let targetW = video.videoWidth;
    let targetH = video.videoHeight;
    const maxDim = 640;
    if (targetW > maxDim || targetH > maxDim) {
      if (targetW >= targetH) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
    }
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, targetW, targetH);
    const base64 = canvas.toDataURL("image/jpeg", 0.85);

    onChangeItems((prev) => [
      ...prev,
      {
        name: `snap_${Date.now()}_${prev.length + 1}.jpg`,
        base64,
        sudut: selectedSudut,
      },
    ]);

    if (allowCoverSelect && !coverBase64 && onSelectCover) {
      onSelectCover(base64);
    }

    toast.success(`Foto sudut "${selectedSudut}" tersimpan!`);
  }, [selectedSudut, onChangeItems, allowCoverSelect, coverBase64, onSelectCover, toast]);

  useEffect(() => {
    snapCamPhotoRef.current = snapCamPhoto;
  }, [snapCamPhoto]);

  const toggleAutoBurst = () => {
    if (isAutoBursting) {
      if (burstIntervalRef.current) {
        clearInterval(burstIntervalRef.current);
        burstIntervalRef.current = null;
      }
      setIsAutoBursting(false);
      toast.info("Auto Burst dihentikan.");
    } else {
      setIsAutoBursting(true);
      snapCamPhotoRef.current();
      burstIntervalRef.current = setInterval(() => {
        snapCamPhotoRef.current();
      }, burstIntervalMs);
      toast.info(
        `Auto Burst aktif (1 frame / ${(burstIntervalMs / 1000).toFixed(1)} dtk). Putar produk perlahan.`
      );
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("File harus berupa video (MP4, WebM, MOV)");
      return;
    }

    setIsExtractingVideo(true);
    try {
      toast.info(`Menganalisis video dan mengekstrak ${videoFrameCount} frame...`);
      const frames = await extractVideoFrames(file, videoFrameCount);
      onChangeItems((prev) => [...prev, ...frames]);
      if (allowCoverSelect && !coverBase64 && frames.length > 0 && onSelectCover) {
        onSelectCover(frames[0].base64);
      }
      toast.success(`Sukses mengekstrak ${frames.length} frame citra dari video 360°!`);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memproses video");
    } finally {
      setIsExtractingVideo(false);
    }
  };

  const handleMultiFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0) return;

    const { compressImageFileToBase64 } = await import("@/lib/utils/image");
    const newItems: DatasetPhotoItem[] = [];
    for (const f of files) {
      if (!f.type.startsWith("image/")) continue;
      try {
        const base64 = await compressImageFileToBase64(f, { maxDim: 640, quality: 0.85 });
        newItems.push({
          name: f.name,
          base64,
          sudut: selectedSudut,
        });
      } catch {}
    }

    if (newItems.length > 0) {
      onChangeItems((prev) => [...prev, ...newItems]);
      if (allowCoverSelect && !coverBase64 && onSelectCover) {
        onSelectCover(newItems[0].base64);
      }
      toast.success(`${newItems.length} foto ditambahkan ke antrean.`);
    }
  };

  const handleRemove = (index: number) => {
    if (onRemoveItem) {
      onRemoveItem(index);
      return;
    }
    onChangeItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClear = () => {
    if (onClearAll) {
      onClearAll();
      return;
    }
    onChangeItems([]);
  };

  return (
    <div className="space-y-3">
      {/* Studio Header & Angle Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="font-heading font-bold text-xs block text-fg">{title}</span>
          <span className="text-[10px] text-muted-fg font-medium">{subtitle}</span>
        </div>
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <label className="text-[11px] font-bold text-muted-fg whitespace-nowrap">Sudut:</label>
          <select
            value={selectedSudut}
            onChange={(e) => setSelectedSudut(e.target.value)}
            className="px-2 py-1 text-xs border-2 border-fg rounded bg-card font-bold cursor-pointer"
          >
            {sudutOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3 Acquisition Mode Tabs */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => {
            setAcqMode("files");
            stopBurstCam();
          }}
          className={`py-2 px-2.5 rounded-lg border-2 border-fg font-heading font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            acqMode === "files"
              ? "bg-accent text-accent-fg shadow-pop-soft"
              : "bg-card hover:bg-muted text-fg"
          }`}
        >
          <CloudUpload className="w-4 h-4 shrink-0" />
          <span className="truncate">1. File Galeri</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAcqMode("video");
            stopBurstCam();
          }}
          className={`py-2 px-2.5 rounded-lg border-2 border-fg font-heading font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            acqMode === "video"
              ? "bg-accent text-accent-fg shadow-pop-soft"
              : "bg-card hover:bg-muted text-fg"
          }`}
        >
          <Video className="w-4 h-4 shrink-0" />
          <span className="truncate">2. Video 360°</span>
        </button>

        <button
          type="button"
          onClick={() => setAcqMode("camera_burst")}
          className={`py-2 px-2.5 rounded-lg border-2 border-fg font-heading font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            acqMode === "camera_burst"
              ? "bg-accent text-accent-fg shadow-pop-soft"
              : "bg-card hover:bg-muted text-fg"
          }`}
        >
          <Camera className="w-4 h-4 shrink-0" />
          <span className="truncate">3. Mode Burst Live</span>
        </button>
      </div>

      {/* Mode 1: File Galeri */}
      {acqMode === "files" && (
        <label className="border-2 border-dashed border-fg/50 hover:border-fg rounded-lg p-4 bg-muted/30 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/60 transition-all">
          <CloudUpload className="w-7 h-7 text-accent mb-1" />
          <span className="font-bold text-xs">
            Pilih Foto Produk dari Perangkat (Bisa Multi-File)
          </span>
          <span className="text-[11px] text-muted-fg mt-0.5">
            Format: JPG, PNG, WEBP. Sudut otomatis ditandai:{" "}
            <strong className="text-fg">{selectedSudut}</strong>
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleMultiFilesUpload}
            className="hidden"
          />
        </label>
      )}

      {/* Mode 2: Video 360 */}
      {acqMode === "video" && (
        <div className="space-y-2">
          <label
            className={`border-2 border-dashed border-fg/50 hover:border-fg rounded-lg p-4 bg-muted/30 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/60 transition-all ${
              isExtractingVideo ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            {isExtractingVideo ? (
              <Loader2 className="w-7 h-7 text-accent animate-spin mb-1" />
            ) : (
              <Video className="w-7 h-7 text-accent mb-1" />
            )}
            <span className="font-bold text-xs">
              {isExtractingVideo
                ? `Sedang Mengekstrak ${videoFrameCount} Frame Citra dari Video...`
                : "Unggah Video 360° Putaran Produk (Maks 15 Detik)"}
            </span>
            <span className="text-[11px] text-muted-fg mt-0.5">
              Sistem otomatis mengekstrak {videoFrameCount} frame citra secara merata sepanjang video.
            </span>
            <input
              type="file"
              accept="video/*"
              disabled={isExtractingVideo}
              onChange={handleVideoUpload}
              className="hidden"
            />
          </label>
          <div className="flex items-center gap-2 text-[10px] text-muted-fg bg-muted px-2 py-1 rounded border border-border">
            <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>
              Tip: Letakkan produk di atas meja putar atau putari produk 360° secara stabil selama 5–15 detik.
            </span>
          </div>
        </div>
      )}

      {/* Mode 3: Camera Burst Live */}
      {acqMode === "camera_burst" && (
        <div className="space-y-2 p-2 rounded-lg bg-muted/40 border border-border">
          <div className="relative min-h-[220px] rounded overflow-hidden border-2 border-fg bg-slate-950 flex justify-center items-center">
            <video
              ref={camVideoRef}
              playsInline
              muted
              autoPlay
              className={`w-full max-h-56 object-contain transition-opacity duration-200 ${
                camStatus === "active" ? "opacity-100" : "opacity-0"
              }`}
            />
            <CameraPermissionOverlay
              status={camStatus}
              errorMessage={camError}
              isPermissionDenied={isCamDenied}
              title="Izin Kamera Mode Burst Produk"
              description="Tokiva membutuhkan akses kamera untuk mengambil sampel foto kemasan produk dari berbagai sudut secara langsung."
              startingText="Menyalakan Kamera Burst..."
              onRequestConsent={() => startBurstCam(true)}
              onRetry={() => startBurstCam(true)}
            />
            {camStatus === "active" && isAutoBursting && (
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[10px] animate-pulse flex items-center gap-1 z-10">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                BURST AKTIF ({(burstIntervalMs / 1000).toFixed(1)} dtk/frame)
              </div>
            )}
          </div>

          {camStatus === "active" && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Button type="button" size="sm" onClick={snapCamPhoto} icon={Camera}>
                Ambil 1 Foto ({selectedSudut})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isAutoBursting ? "danger" : "outline"}
                onClick={toggleAutoBurst}
              >
                {isAutoBursting
                  ? "Hentikan Auto-Burst"
                  : `Mulai Auto-Burst (${(burstIntervalMs / 1000).toFixed(1)} dtk)`}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  stopBurstCam();
                  setAcqMode("files");
                }}
              >
                Matikan Kamera
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Preview Strip / Grid */}
      <div className="space-y-2 pt-1 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-heading font-bold text-xs">
              Citra Dataset ({items.length} Frame Terkumpul)
            </span>
            {items.length > 0 ? (
              <Badge variant="green" className="text-[10px]">
                <Check className="w-3 h-3 mr-0.5 inline" /> Siap Unggah
              </Badge>
            ) : requiredHint ? (
              <Badge variant="yellow" className="text-[10px]">
                Wajib Minimal 1
              </Badge>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <>
                {allowCoverSelect && (
                  <span className="text-[10px] text-muted-fg hidden sm:inline">
                    Klik bintang{" "}
                    <Star className="w-3 h-3 inline text-amber-500 fill-amber-400" /> untuk jadikan
                    Sampul
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus Semua</span>
                </button>
              </>
            )}
          </div>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1.5 border-2 border-border rounded-lg bg-card">
            {items.map((f, i) => {
              const isCover = allowCoverSelect && coverBase64 === f.base64;
              return (
                <div
                  key={i}
                  className={`group relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                    isCover ? "border-amber-500 ring-2 ring-amber-400" : "border-fg/40 hover:border-fg"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.base64} alt={f.name || `Frame ${i + 1}`} className="w-full h-full object-cover" />

                  {allowCoverSelect && onSelectCover && (
                    <button
                      type="button"
                      onClick={() => onSelectCover(f.base64)}
                      title={isCover ? "Sampul Utama Katalog" : "Jadikan Sampul Utama"}
                      className={`absolute top-1 left-1 p-0.5 rounded transition-all cursor-pointer ${
                        isCover
                          ? "bg-amber-400 text-black shadow"
                          : "bg-black/60 text-white hover:text-amber-400 opacity-80 group-hover:opacity-100"
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isCover ? "fill-black" : ""}`} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemove(i)}
                    title="Hapus citra ini"
                    className="absolute top-1 right-1 p-0.5 rounded bg-red-600 text-white hover:bg-red-700 opacity-80 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  <div className="absolute bottom-0 inset-x-0 bg-black/75 px-1 py-0.5 text-[9px] text-white truncate text-center font-mono">
                    {f.sudut}
                  </div>
                </div>
              );
            })}
          </div>
        ) : requiredHint ? (
          <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Belum ada foto dataset. Ambil beberapa foto dari galeri/kamera atau unggah video 360°
              produk agar model AI dapat mengenali produk ini saat transaksi POS kasir.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
