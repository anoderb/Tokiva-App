"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type * as TfType from "@tensorflow/tfjs";
import { extractDualModelOutputs } from "@/lib/ai/hybrid-embedding";

let cachedTfPromise: Promise<typeof TfType> | null = null;

export async function loadTfjs(): Promise<typeof TfType> {
  if (!cachedTfPromise) {
    cachedTfPromise = import("@tensorflow/tfjs").then(async (mod) => {
      await mod.ready();
      return mod;
    });
  }
  return cachedTfPromise;
}

export function disposeTfModel(model: any) {
  if (model && typeof model.dispose === "function") {
    try {
      model.dispose();
    } catch {
      // ignore disposal error
    }
  }
}

export interface PredictionResult {
  label: string;
  score: number;
}

export interface InferenceOutput {
  predictions: PredictionResult[];
  embedding?: number[] | null;
  ms: number;
  topLabel: string;
  topConfidence: number;
  isDetected: boolean;
}

function hashModelUrl(url: string): string {
  let hash = 2166136261;
  for (let i = 0; i < url.length; i++) {
    hash ^= url.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function disposeTensorOutput(outputRaw: TfType.Tensor | TfType.Tensor[] | TfType.NamedTensorMap) {
  if (Array.isArray(outputRaw)) {
    outputRaw.forEach((t) => t?.dispose());
  } else if (outputRaw && typeof (outputRaw as TfType.Tensor).dispose === "function") {
    (outputRaw as TfType.Tensor).dispose();
  } else if (outputRaw && typeof outputRaw === "object") {
    Object.values(outputRaw).forEach((t) => t?.dispose?.());
  }
}

export async function loadCachedTfGraphModel(
  modelUrl: string,
  cachePrefix = "tokiva-admin-model"
): Promise<TfType.GraphModel> {
  const tf = await loadTfjs();
  const cacheKey = `indexeddb://${cachePrefix}-${hashModelUrl(modelUrl)}`;
  try {
    return await tf.loadGraphModel(cacheKey);
  } catch {
    let loaded: TfType.GraphModel;
    try {
      loaded = await tf.loadGraphModel(modelUrl);
    } catch (graphErr) {
      try {
        loaded = (await tf.loadLayersModel(modelUrl)) as unknown as TfType.GraphModel;
      } catch {
        throw graphErr;
      }
    }
    try {
      await loaded.save(cacheKey);
    } catch {
      // IndexedDB save optional
    }
    return loaded;
  }
}

export function parseClassLabels(data: unknown): string[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map((s) => String(s).trim());
  }
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return [];

    // Jika formatnya index numerik {"0": "amo-sparkling...", "1": "cleo-mineral..."}
    if (keys.every((k) => !Number.isNaN(Number(k)))) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => String(obj[k]).trim());
    }

    // Jika formatnya label: index {"amo-sparkling...": 0}
    const values = Object.values(obj);
    if (values.every((v) => typeof v === "number")) {
      const sortedEntries = Object.entries(obj).sort(
        (a, b) => Number(a[1]) - Number(b[1])
      );
      return sortedEntries.map(([k]) => k.trim());
    }

    return values.map((v) => String(v).trim());
  }
  return [];
}

function preprocess(
  tf: typeof TfType,
  element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): TfType.Tensor4D {
  return tf.tidy(() => {
    // Model dilatih dengan MobileNetV3Large(include_preprocessing=True)
    // yang sudah memiliki normalisasi internal [-1, 1], sehingga input
    // harus berupa nilai piksel float32 mentah rentang [0, 255] berukuran 224x224.
    const raw = tf.browser.fromPixels(element);
    const resized = tf.image.resizeBilinear(raw, [224, 224]);
    return resized.toFloat().expandDims(0);
  });
}

export function useTfjsModel(cachePrefix = "tokiva-admin-model") {
  const [model, setModel] = useState<TfType.GraphModel | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modelRef = useRef<TfType.GraphModel | null>(null);
  const classesRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      disposeTfModel(modelRef.current);
      modelRef.current = null;
    };
  }, []);

  const loadModel = useCallback(
    async (modelUrl: string, classJsonUrl?: string | null) => {
      if (!modelUrl) return;
      setLoading(true);
      setError(null);

      try {
        const loaded = await loadCachedTfGraphModel(modelUrl, cachePrefix);

        if (modelRef.current && modelRef.current !== loaded) {
          disposeTfModel(modelRef.current);
        }

        modelRef.current = loaded;
        setModel(loaded);

        // Unduh label kelas dari class.json
        const targetClassUrl =
          classJsonUrl || modelUrl.replace(/model\.json(\?.*)?$/, "class.json$1");
        try {
          const res = await fetch(targetClassUrl);
          if (res.ok) {
            const rawLabels = await res.json();
            const parsed = parseClassLabels(rawLabels);
            if (parsed.length > 0) {
              classesRef.current = parsed;
              setClasses(parsed);
            }
          }
        } catch (fetchErr) {
          console.warn("Gagal mengunduh label class.json:", fetchErr);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Gagal memuat berkas model AI";
        console.error("Gagal loadModel TFJS:", err);
        setError(msg);
        if (modelRef.current) {
          try {
            modelRef.current.dispose();
          } catch { }
        }
        modelRef.current = null;
        setModel(null);
      } finally {
        setLoading(false);
      }
    },
    [cachePrefix]
  );

  const predict = useCallback(
    async (
      element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
      threshold = 0.75,
      expectedEmbeddingDim = 256
    ): Promise<InferenceOutput | null> => {
      const m = modelRef.current;
      if (!m || !element) return null;

      const t0 = performance.now();
      let input: TfType.Tensor4D | null = null;
      let outputRaw: TfType.Tensor | TfType.Tensor[] | TfType.NamedTensorMap | null = null;
      try {
        const tf = await loadTfjs();
        input = preprocess(tf, element);
        outputRaw = m.predict(input);
        const labels = classesRef.current;
        const { probs, embedding } = extractDualModelOutputs(
          outputRaw,
          labels.length,
          expectedEmbeddingDim
        );
        input.dispose();
        input = null;
        disposeTensorOutput(outputRaw);
        outputRaw = null;

        const predictions: PredictionResult[] = probs
          .map((score, i) => ({
            label: labels[i] || `Kelas_${i}`,
            score: Number(score),
          }))
          .sort((a, b) => b.score - a.score);

        const ms = Math.round(performance.now() - t0);
        const top = predictions[0] || { label: "Tidak Dikenal", score: 0 };

        return {
          predictions,
          embedding,
          ms,
          topLabel: top.label,
          topConfidence: top.score,
          isDetected: top.score >= threshold,
        };
      } catch (predictErr) {
        if (input) input.dispose();
        if (outputRaw) disposeTensorOutput(outputRaw);
        console.error("Kesalahan inferensi TFJS:", predictErr);
        return null;
      }
    },
    []
  );

  return { model, classes, loading, error, loadModel, predict, setClasses };
}
