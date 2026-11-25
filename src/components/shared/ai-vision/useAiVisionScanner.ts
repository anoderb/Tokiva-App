import { useState, useEffect, useRef, useCallback } from "react";
import { aiService } from "@/lib/services/ai.service";
import { playScannerBeep } from "@/lib/utils/audio";
import {
  loadTfjs,
  loadCachedTfGraphModel,
  disposeTfModel,
  parseClassLabels,
} from "@/app/admin/ai/hooks/useTfjsModel";
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
import type { AIKelas, AIKelasEmbedding, AIModel, Produk, ProdukSatuan } from "@/types/api";
import {
  COOLDOWN_SAME_ITEM_MS,
  type AiDetectionCandidate,
  type AiVisionModalProps,
  type SessionScanItem,
} from "./ai-vision-types";
import { runVisionPrediction } from "./ai-vision-matcher";

/** Hook manajemen model TFJS, izin & stream kamera, loop deteksi kontinu, dan sesi keranjang AI */
export function useAiVisionScanner({
  open,
  products,
  onSelectProduct,
  onUpdateCartQty,
  cart = [],
}: Omit<AiVisionModalProps, "onClose">) {
  const [modelMeta, setModelMeta] = useState<AIModel | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  const [camStatus, setCamStatus] = useState<CameraStatus>("idle");
  const [camError, setCamError] = useState<string | null>(null);
  const [isCamDenied, setIsCamDenied] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);
  const [justScannedName, setJustScannedName] = useState<string | null>(null);
  const [liveCandidate, setLiveCandidate] = useState<AiDetectionCandidate | null>(null);
  const [latencyMs, setLatencyMs] = useState(0);
  const [cooldownSec, setCooldownSec] = useState(0);

  const [sessionScans, setSessionScans] = useState<SessionScanItem[]>([]);
  const [alternativePicks, setAlternativePicks] = useState<AiDetectionCandidate[]>([]);
  const [correctingItem, setCorrectingItem] = useState<SessionScanItem | null>(null);
  const [correctionSearch, setCorrectionSearch] = useState("");
  const [isAnalyzingManual, setIsAnalyzingManual] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const camSessionRef = useRef<number>(0);
  const videoDevicesRef = useRef<MediaDeviceInfo[]>([]);
  const selectedDeviceIdxRef = useRef<number>(0);
  const tfModelRef = useRef<any>(null);
  const tfModuleRef = useRef<any>(null);
  const labelsRef = useRef<string[]>([]);
  const modelMetaRef = useRef<AIModel | null>(null);
  const kelasListRef = useRef<AIKelas[]>([]);
  const storeEmbeddingsRef = useRef<AIKelasEmbedding[]>([]);
  const classCentroidsRef = useRef<Record<string, { centroid: number[]; mean_sim?: number; min_sim?: number }> | null>(null);
  const productsRef = useRef<Produk[]>(products);
  const isMutedRef = useRef<boolean>(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoopRunningRef = useRef<boolean>(false);
  const onSelectProductRef = useRef(onSelectProduct);

  const lastScannedIdRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const emptyFrameCountRef = useRef<number>(0);
  const consecutiveHitsRef = useRef<{ id: string; count: number }>({ id: "", count: 0 });

  useEffect(() => {
    productsRef.current = products;
  }, [products]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);
  useEffect(() => {
    onSelectProductRef.current = onSelectProduct;
  }, [onSelectProduct]);

  useEffect(() => {
    return () => {
      disposeTfModel(tfModelRef.current);
      tfModelRef.current = null;
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
      }
    };
  }, []);

  const highThreshold = (modelMeta?.threshold_config?.high_threshold ?? 75) / 100;
  const mediumThreshold = (modelMeta?.threshold_config?.medium_threshold ?? 25) / 100;

  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    setSessionScans([]);
    setLiveCandidate(null);
    setAlternativePicks([]);
    setCorrectingItem(null);
    setCorrectionSearch("");
    setCooldownSec(0);
    setJustScannedName(null);
    lastScannedIdRef.current = null;
    lastScannedTimeRef.current = 0;
    emptyFrameCountRef.current = 0;
    consecutiveHitsRef.current = { id: "", count: 0 };
    storeEmbeddingsRef.current = [];
    classCentroidsRef.current = null;

    let isMounted = true;
    setLoadingModel(true);

    Promise.all([
      aiService.getModelAktifKasir().catch(() => null),
      aiService.getKelasList(undefined, "kasir").catch(() => []),
    ])
      .then(async ([meta, kList]) => {
        if (!isMounted) return;
        if (meta) {
          modelMetaRef.current = meta;
          setModelMeta(meta);
          const rawLabels: string[] =
            Array.isArray(meta.labels) && meta.labels.length > 0
              ? meta.labels
              : Array.isArray((meta as any).daftar_kelas)
                ? (meta as any).daftar_kelas
                : [];
          labelsRef.current = rawLabels;

          // Muat prototipe embedding toko & centroids model jika aktif model v2 Hybrid
          const isHybridEnabled =
            Boolean(meta.mendukung_embedding) &&
            meta.threshold_config?.enable_hybrid_embedding !== false;
          if (isHybridEnabled) {
            void aiService
              .getStoreEmbeddings("kasir", meta.versi)
              .then((embs) => {
                if (isMounted) storeEmbeddingsRef.current = embs || [];
              })
              .catch(() => {
                if (isMounted) storeEmbeddingsRef.current = [];
              });
            if (meta.path_centroids) {
              void fetch(meta.path_centroids)
                .then((r) => (r.ok ? r.json() : null))
                .then((centJson) => {
                    const centMap =
                      centJson &&
                        typeof centJson === "object" &&
                        "classes" in centJson &&
                        centJson.classes &&
                        typeof centJson.classes === "object"
                        ? centJson.classes
                        : centJson;
                    if (isMounted && centMap && typeof centMap === "object") {
                      classCentroidsRef.current = centMap;
                    }
                  })
                .catch(() => {
                  if (isMounted) classCentroidsRef.current = null;
                });
            }
          }

          const modelUrl = meta.model_json_url || (meta as any).path_model_json || (meta as any).model_url;
          if (modelUrl) {
            try {
              const tf = await loadTfjs();
              tfModuleRef.current = tf;
              const loadedModel = await loadCachedTfGraphModel(modelUrl, "tokiva-kasir-model");
              if (!isMounted) {
                disposeTfModel(loadedModel);
                return;
              }
              if (tfModelRef.current && tfModelRef.current !== loadedModel) {
                disposeTfModel(tfModelRef.current);
              }
              tfModelRef.current = loadedModel;

              if (labelsRef.current.length === 0) {
                const classUrl =
                  meta.class_json_url ||
                  (meta as any).path_label ||
                  modelUrl.replace(/model\.json(\?.*)?$/, "class.json$1");
                const res = await fetch(classUrl);
                if (res.ok) labelsRef.current = parseClassLabels(await res.json());
              }
              if (isMounted && tfModelRef.current) setModelReady(true);
            } catch (loadErr: unknown) {
              console.error("Gagal load TFJS:", loadErr);
              setModelReady(Boolean(tfModelRef.current));
              setErrorMsg("Gagal memuat model visual TFJS di browser.");
            }
          }
        }
        if (kList) kelasListRef.current = kList;
      })
      .finally(() => {
        if (isMounted) setLoadingModel(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open]);

  const stopCamera = useCallback(() => {
    camSessionRef.current += 1;
    releaseCameraStream(streamRef.current, videoRef.current);
    streamRef.current = null;
    setCamStatus("idle");
  }, []);

  const activateCamera = useCallback(async (deviceIndex = selectedDeviceIdxRef.current, isUserGesture = false) => {
    const sessionId = ++camSessionRef.current;
    releaseCameraStream(streamRef.current, videoRef.current);
    streamRef.current = null;
    setCamError(null);
    setIsCamDenied(false);
    setCamStatus("starting");
    if (isUserGesture) markCameraConsentGranted();

    try {
      const targetDeviceId = videoDevicesRef.current[deviceIndex]?.deviceId;
      const stream = await acquireCameraStream({ deviceId: targetDeviceId, facingMode: "environment", width: 640, height: 480 });
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
      if (isPermissionDenied) resetCameraConsent();
      setCamError(message);
      setIsCamDenied(isPermissionDenied);
      setCamStatus("error");
    }
  }, []);

  const handleSwitchCamera = useCallback(() => {
    if (videoDevicesRef.current.length <= 1) return;
    const nextIdx = (selectedDeviceIdxRef.current + 1) % videoDevicesRef.current.length;
    selectedDeviceIdxRef.current = nextIdx;
    activateCamera(nextIdx, true);
  }, [activateCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }
    let cancelled = false;
    const sessionId = ++camSessionRef.current;
    const initCamera = async () => {
      const consent = await checkCameraConsentState();
      if (cancelled || sessionId !== camSessionRef.current) return;
      if (consent === "unsupported") {
        setCamError("Browser tidak mendukung akses kamera atau halaman tidak dibuka melalui HTTPS / localhost.");
        setIsCamDenied(false);
        setCamStatus("error");
        return;
      }
      if (consent === "denied") {
        resetCameraConsent();
        setCamError("Izin akses kamera ditolak oleh browser. Aktifkan izin kamera agar pemindaian dapat berjalan.");
        setIsCamDenied(true);
        setCamStatus("error");
        return;
      }
      if (consent === "needs_consent") {
        setCamStatus("needs_consent");
        return;
      }
      await activateCamera(selectedDeviceIdxRef.current, false);
    };
    initCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, activateCamera, stopCamera]);

  const captureCameraSnapshot = useCallback((): string | null => {
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement("canvas");
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const minDim = Math.min(video.videoWidth, video.videoHeight);
          const sx = (video.videoWidth - minDim) / 2;
          const sy = (video.videoHeight - minDim) / 2;
          ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, 224, 224);
          return canvas.toDataURL("image/jpeg", 0.75);
        }
      }
    } catch (snapErr) {
      console.warn("Gagal membuat snapshot cuplikan:", snapErr);
    }
    return null;
  }, []);

  const triggerSuccessfulScan = useCallback(
    (
      product: Produk,
      confidence: number,
      classLabel: string,
      kelasId?: string,
      targetUnit: ProdukSatuan | "base" = "base",
      correctionMeta?: {
        predictedKelasId?: string;
        predictedConfidence?: number;
        isCorrection?: boolean;
        snapshotOverride?: string | null;
        skipLog?: boolean;
        detectionMethod?: "softmax" | "embedding";
      }
    ) => {
      playScannerBeep("success", isMutedRef.current);
      setScanFlash(true);
      setJustScannedName(product.nama);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => {
        flashTimerRef.current = null;
        setScanFlash(false);
      }, 500);

      onSelectProductRef.current(product, targetUnit, "ai_kamera");
      const snapshotDataUrl = correctionMeta?.snapshotOverride !== undefined ? correctionMeta.snapshotOverride : captureCameraSnapshot();
      const resolvedKelasId = kelasId || product.ai_kelas_id || (product as any).ai_kelas?.id || undefined;
      const unitName = targetUnit === "base" ? product.satuan_dasar : targetUnit.nama_satuan;
      const unitPrice = targetUnit === "base" ? Number(product.harga_jual) : Number(targetUnit.harga_jual);
      const cartItemId = `${product.id}-${unitName}`;

      setSessionScans((prev) => {
        const existingIdx = prev.findIndex((s) => s.cartItemId === cartItemId);
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            qty: updated[existingIdx].qty + 1,
            confidence,
            kelasId: resolvedKelasId,
            snapshot: snapshotDataUrl || updated[existingIdx].snapshot,
            scannedAt: new Date(),
          };
          return updated;
        }
        return [
          { cartItemId, product, unit: targetUnit, unitName, unitPrice, qty: 1, confidence, classLabel, kelasId: resolvedKelasId, snapshot: snapshotDataUrl, scannedAt: new Date() },
          ...prev,
        ];
      });

      if (correctionMeta?.skipLog) return;
      const isCorrection = Boolean(correctionMeta?.isCorrection);
      const loggedKelasId = isCorrection ? correctionMeta?.predictedKelasId || resolvedKelasId : resolvedKelasId;
      const rawScore = isCorrection ? correctionMeta?.predictedConfidence ?? confidence : confidence;
      if (loggedKelasId) {
        const normalizedConfidence = rawScore > 1 ? Number((rawScore / 100).toFixed(4)) : Number(rawScore.toFixed(4));
        aiService
          .catatLogInferensi({
            versi_model: modelMetaRef.current?.versi || "v1.2.20260912",
            prediksi_kelas_id: loggedKelasId,
            skor_yakin: normalizedConfidence,
            diterima_kasir: !isCorrection,
            produk_id_asli: product.id,
            butuh_koreksi: isCorrection,
            metode_deteksi: correctionMeta?.detectionMethod || "softmax",
            foto_cuplikan: snapshotDataUrl,
          })
          .catch((err) => console.error("Gagal mencatat log inferensi POS:", err));
      }
    },
    [captureCameraSnapshot]
  );

  useEffect(() => {
    if (!open || camStatus !== "active" || !modelReady || !tfModelRef.current) return;
    let isSubscribed = true;
    let timer: NodeJS.Timeout | null = null;

    const runContinuousLoop = async () => {
      if (!isSubscribed) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && !isLoopRunningRef.current) {
        isLoopRunningRef.current = true;
        try {
          const res = await runVisionPrediction({
            imgSource: video,
            model: tfModelRef.current,
            rawClasses: labelsRef.current,
            tfModule: tfModuleRef.current,
            kelasList: kelasListRef.current,
            products: productsRef.current,
            storeEmbeddings: storeEmbeddingsRef.current,
            enableHybridEmbedding:
              Boolean(modelMetaRef.current?.mendukung_embedding) &&
              modelMetaRef.current?.threshold_config?.enable_hybrid_embedding !== false,
            embeddingMinSimilarity: modelMetaRef.current?.threshold_config?.embedding_min_similarity ?? 78,
            expectedEmbeddingDim: modelMetaRef.current?.dimensi_embedding || 256,
            classCentroids: classCentroidsRef.current,
          });
          if (res && isSubscribed) {
            tfModuleRef.current = res.tfModule;
            setLatencyMs(res.ms);
            const top = res.candidates[0] || null;
            setLiveCandidate(top);
            const now = Date.now();
            const isEmbeddingHit = top?.detectionMethod === "embedding";
            const allowAutoAddTier1 =
              Boolean(top) &&
              !isEmbeddingHit &&
              top.confidence >= highThreshold * 100 &&
              (modelMetaRef.current?.threshold_config?.auto_add_high_confidence ?? true);

            if (top && allowAutoAddTier1) {
              emptyFrameCountRef.current = 0;
              consecutiveHitsRef.current =
                consecutiveHitsRef.current.id === top.product.id
                  ? { id: top.product.id, count: consecutiveHitsRef.current.count + 1 }
                  : { id: top.product.id, count: 1 };
              const isSameProduct = lastScannedIdRef.current === top.product.id;
              const timeSinceLast = now - lastScannedTimeRef.current;

              if (isSameProduct && timeSinceLast < COOLDOWN_SAME_ITEM_MS) {
                setCooldownSec(Math.max(0, Math.round((COOLDOWN_SAME_ITEM_MS - timeSinceLast) / 100) / 10));
              } else if (consecutiveHitsRef.current.count >= 2 || !isSameProduct) {
                lastScannedIdRef.current = top.product.id;
                lastScannedTimeRef.current = now;
                setCooldownSec(0);
                consecutiveHitsRef.current = { id: top.product.id, count: 0 };
                setAlternativePicks([]);
                triggerSuccessfulScan(top.product, top.confidence, top.classLabel, top.kelasId, "base", {
                  detectionMethod: "softmax",
                });
              }
            } else if (top && (isEmbeddingHit || top.confidence >= mediumThreshold * 100)) {
              setAlternativePicks(res.candidates.slice(0, 3));
              setCooldownSec(0);
            } else {
              setAlternativePicks([]);
              emptyFrameCountRef.current += 1;
              if (emptyFrameCountRef.current >= 2) {
                lastScannedIdRef.current = null;
                setCooldownSec(0);
                consecutiveHitsRef.current = { id: "", count: 0 };
              }
            }
          }
        } finally {
          isLoopRunningRef.current = false;
        }
      }
      if (isSubscribed) timer = setTimeout(runContinuousLoop, 250);
    };

    runContinuousLoop();
    return () => {
      isSubscribed = false;
      if (timer) clearTimeout(timer);
    };
  }, [open, camStatus, modelReady, highThreshold, mediumThreshold, triggerSuccessfulScan]);

  const handleIncrementItem = useCallback(
    (item: SessionScanItem) => {
      playScannerBeep("success", isMuted);
      onSelectProductRef.current(item.product, item.unit, "ai_kamera");
      setSessionScans((prev) => prev.map((s) => (s.cartItemId === item.cartItemId ? { ...s, qty: s.qty + 1, scannedAt: new Date() } : s)));
    },
    [isMuted]
  );

  const handleDecrementItem = useCallback(
    (item: SessionScanItem) => {
      setSessionScans((prev) => prev.map((s) => (s.cartItemId === item.cartItemId ? { ...s, qty: s.qty - 1 } : s)).filter((s) => s.qty > 0));
      if (onUpdateCartQty) {
        const cartMatch = cart.find((c: any) => c.cartItemId === item.cartItemId);
        onUpdateCartQty(item.cartItemId, Math.max(0, cartMatch ? Number(cartMatch.qty) - 1 : item.qty - 1));
      }
    },
    [cart, onUpdateCartQty]
  );

  const handleApplyCorrection = useCallback(
    (wrongItem: SessionScanItem, trueProduct: Produk) => {
      handleDecrementItem(wrongItem);
      const snapshot = wrongItem.snapshot || captureCameraSnapshot();
      triggerSuccessfulScan(trueProduct, wrongItem.confidence, trueProduct.nama, trueProduct.ai_kelas_id || undefined, "base", {
        isCorrection: true,
        predictedKelasId: wrongItem.kelasId || wrongItem.product.ai_kelas_id || undefined,
        predictedConfidence: wrongItem.confidence,
        snapshotOverride: snapshot,
      });
      setCorrectingItem(null);
      setCorrectionSearch("");
    },
    [handleDecrementItem, captureCameraSnapshot, triggerSuccessfulScan]
  );

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => {
      setIsAnalyzingManual(false);
      setErrorMsg("Gagal membaca file foto yang dipilih.");
    };
    reader.onload = () => {
      setIsAnalyzingManual(true);
      const img = new Image();
      img.onload = async () => {
        try {
          const res = await runVisionPrediction({
            imgSource: img,
            model: tfModelRef.current,
            rawClasses: labelsRef.current,
            tfModule: tfModuleRef.current,
            kelasList: kelasListRef.current,
            products: productsRef.current,
            storeEmbeddings: storeEmbeddingsRef.current,
            enableHybridEmbedding:
              Boolean(modelMetaRef.current?.mendukung_embedding) &&
              modelMetaRef.current?.threshold_config?.enable_hybrid_embedding !== false,
            embeddingMinSimilarity: modelMetaRef.current?.threshold_config?.embedding_min_similarity ?? 78,
            expectedEmbeddingDim: modelMetaRef.current?.dimensi_embedding || 256,
            classCentroids: classCentroidsRef.current,
          });
          if (res) tfModuleRef.current = res.tfModule;
          if (res && res.candidates.length > 0) {
            const top = res.candidates[0];
            if (top.detectionMethod === "embedding") {
              setLiveCandidate(top);
              setAlternativePicks(res.candidates.slice(0, 3));
            } else {
              triggerSuccessfulScan(top.product, top.confidence, top.classLabel, top.kelasId, "base", {
                detectionMethod: top.detectionMethod || "softmax",
              });
            }
          } else {
            setErrorMsg("Kemasan produk tidak cocok dengan kelas model terlatih.");
          }
        } finally {
          setIsAnalyzingManual(false);
        }
      };
      img.onerror = () => {
        setIsAnalyzingManual(false);
        setErrorMsg("Foto rusak atau format tidak didukung browser.");
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const resetCooldown = () => {
    lastScannedIdRef.current = null;
    setCooldownSec(0);
    playScannerBeep("duplicate", isMuted);
  };

  return {
    modelMeta, loadingModel, modelReady, camStatus, camError, isCamDenied, videoDevices, errorMsg,
    isMuted, setIsMuted, scanFlash, justScannedName, liveCandidate, latencyMs, cooldownSec,
    sessionScans, alternativePicks, correctingItem, setCorrectingItem, correctionSearch, setCorrectionSearch,
    isAnalyzingManual, highThreshold, videoRef, canvasRef, selectedDeviceIdxRef,
    activateCamera, handleSwitchCamera, triggerSuccessfulScan, handleIncrementItem, handleDecrementItem,
    handleApplyCorrection, handleManualUpload, resetCooldown,
  };
}
