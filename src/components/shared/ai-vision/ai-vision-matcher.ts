import { loadTfjs } from "@/app/admin/ai/hooks/useTfjsModel";
import {
  cosineSimilarity,
  extractDualModelOutputs,
  matchEmbeddingPrototypes,
} from "@/lib/ai/hybrid-embedding";
import type { AIKelas, AIKelasEmbedding, Produk } from "@/types/api";
import type { AiDetectionCandidate } from "./ai-vision-types";

/** Mencocokkan label prediksi model AI dengan katalog produk toko yang sedang aktif. */
export function matchAiLabelToProduct(
  label: string,
  kelasList: AIKelas[],
  products: Produk[]
): { product: Produk | null; kelas?: AIKelas } {
  const cleanLabel = label.toLowerCase().replace(/[_-]/g, " ").trim();
  const slugLabel = label.toLowerCase().replace(/[^a-z0-9]/g, "");

  const matchedKelas = kelasList.find((k) => {
    const kNameSlug = k.nama.toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      k.kode_kelas.toLowerCase() === label.toLowerCase() ||
      k.nama.toLowerCase() === cleanLabel ||
      kNameSlug === slugLabel
    );
  });

  if (matchedKelas) {
    const byMaster = products.find(
      (p) =>
        (matchedKelas.master_id && p.master_id === matchedKelas.master_id) ||
        (matchedKelas.barcode && p.barcode === matchedKelas.barcode) ||
        p.ai_kelas_id === matchedKelas.id
    );
    if (byMaster) return { product: byMaster, kelas: matchedKelas };
  }

  if (slugLabel.length >= 4) {
    const exactSlugMatch = products.find(
      (p) => `${p.nama} ${p.merek || ""}`.toLowerCase().replace(/[^a-z0-9]/g, "") === slugLabel
    );
    if (exactSlugMatch) return { product: exactSlugMatch, kelas: matchedKelas };
  }

  const tokens = cleanLabel.split(/\s+/).filter((w) => w.length >= 3);
  if (tokens.length === 0) return { product: null, kelas: matchedKelas };

  let bestProd: Produk | null = null;
  let bestScore = 0;

  for (const p of products) {
    const pTokens = new Set(
      `${p.nama} ${p.merek || ""}`
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3)
    );
    let score = 0;
    for (const t of tokens) {
      if (pTokens.has(t)) score += 1;
    }
    const minRequired = tokens.length >= 2 ? Math.min(2, tokens.length) : 1;
    if (score >= minRequired && score > bestScore) {
      bestScore = score;
      bestProd = p;
    }
  }

  return { product: bestProd, kelas: matchedKelas };
}

function disposePredictionOutput(out: any) {
  if (!out) return;
  if (typeof out.dispose === "function") {
    out.dispose();
  } else if (Array.isArray(out)) {
    out.forEach((t) => t?.dispose?.());
  } else if (typeof out === "object") {
    Object.values(out).forEach((t: any) => t?.dispose?.());
  }
}

/** Menjalankan inferensi gambar TFJS 224x224 (v1 Softmax / v2 Dual-Output Hybrid) dan mengembalikan top-3 kandidat unik. */
export async function runVisionPrediction({
  imgSource,
  model,
  rawClasses,
  tfModule,
  kelasList,
  products,
  storeEmbeddings,
  enableHybridEmbedding = false,
  embeddingMinSimilarity = 78,
  expectedEmbeddingDim = 256,
  classCentroids = null,
}: {
  imgSource: HTMLVideoElement | HTMLImageElement;
  model: any;
  rawClasses: string[];
  tfModule: any;
  kelasList: AIKelas[];
  products: Produk[];
  storeEmbeddings?: AIKelasEmbedding[];
  enableHybridEmbedding?: boolean;
  embeddingMinSimilarity?: number;
  expectedEmbeddingDim?: number;
  classCentroids?: Record<string, { centroid: number[]; mean_sim?: number; min_sim?: number }> | null;
}): Promise<{ candidates: AiDetectionCandidate[]; ms: number; tfModule: any } | null> {
  if (!model) return null;
  const t0 = performance.now();
  let inputTensor: any = null;
  let predOutput: any = null;
  try {
    const tf = tfModule || (await loadTfjs());
    inputTensor = tf.tidy(() => {
      const raw = tf.browser.fromPixels(imgSource);
      const resized = tf.image.resizeBilinear(raw, [224, 224]);
      return resized.toFloat().expandDims(0);
    });
    predOutput = model.predict(inputTensor);
    const { probs, embedding } = extractDualModelOutputs(
      predOutput,
      rawClasses.length,
      expectedEmbeddingDim
    );
    inputTensor?.dispose?.();
    inputTensor = null;
    disposePredictionOutput(predOutput);
    predOutput = null;

    const effectiveClasses =
      rawClasses.length > 0 ? rawClasses : Array.from({ length: probs.length }, (_, i) => `Kelas_${i}`);

    const indexed = probs
      .map((p, idx) => ({ prob: p, idx, label: effectiveClasses[idx] || `kelas_${idx}` }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 5);

    const softmaxCandidates: AiDetectionCandidate[] = [];
    const seenSoftmaxProductIds = new Set<string>();
    for (const item of indexed) {
      const { product, kelas } = matchAiLabelToProduct(item.label, kelasList, products);
      if (product && !seenSoftmaxProductIds.has(product.id)) {
        seenSoftmaxProductIds.add(product.id);
        const conf = Math.min(99.9, Math.max(1, Number((item.prob * 100).toFixed(1))));
        softmaxCandidates.push({
          product,
          confidence: conf,
          classLabel: item.label,
          kelasId: kelas?.id || product.ai_kelas_id || undefined,
          detectionMethod: "softmax",
        });
      }
      if (softmaxCandidates.length >= 3) break;
    }

    let embeddingCandidates: AiDetectionCandidate[] = [];
    let preferEmbeddingFirst = false;

    if (
      enableHybridEmbedding &&
      embedding &&
      embedding.length > 0 &&
      Array.isArray(storeEmbeddings) &&
      storeEmbeddings.length > 0
    ) {
      const minSimRatio =
        embeddingMinSimilarity > 1 ? embeddingMinSimilarity / 100 : embeddingMinSimilarity;
      const embHits = matchEmbeddingPrototypes({
        queryEmbedding: embedding,
        storeEmbeddings,
        products,
        minSimilarityRatio: Math.max(0.5, Math.min(0.95, minSimRatio)),
      });

      embeddingCandidates = embHits
        .filter((hit): hit is typeof hit & { product: Produk } => Boolean(hit.product))
        .map((hit) => ({
          product: hit.product,
          confidence: hit.confidence,
          classLabel: hit.classLabel,
          kelasId: hit.kelasId || hit.product.ai_kelas_id || undefined,
          detectionMethod: "embedding" as const,
        }));

      if (embHits.length > 0 && embeddingCandidates.length > 0) {
        const topEmbedHit = embHits[0];
        const topSoftmaxItem = indexed[0];
        const centroidLookup =
          (classCentroids as any)?.classes && typeof (classCentroids as any).classes === "object"
            ? (classCentroids as any).classes
            : classCentroids;
        const topSoftmaxCentroid = topSoftmaxItem
            ? centroidLookup?.[topSoftmaxItem.label]?.centroid
            : undefined;
        const simToTrainedCentroid =
          topSoftmaxCentroid && topSoftmaxCentroid.length === embedding.length
            ? cosineSimilarity(embedding, topSoftmaxCentroid)
            : null;

        preferEmbeddingFirst =
          softmaxCandidates.length === 0 ||
          (topSoftmaxItem?.prob ?? 0) < 0.75 ||
          (simToTrainedCentroid !== null && topEmbedHit.similarity > simToTrainedCentroid + 0.05);
      }
    }

    const usedProductIds = new Set<string>();
    const topCandidates: AiDetectionCandidate[] = [];
    const orderedSources = preferEmbeddingFirst
      ? [...embeddingCandidates, ...softmaxCandidates]
      : [...softmaxCandidates, ...embeddingCandidates];

    for (const cand of orderedSources) {
      if (!usedProductIds.has(cand.product.id)) {
        usedProductIds.add(cand.product.id);
        topCandidates.push(cand);
      }
      if (topCandidates.length >= 3) break;
    }

    return { candidates: topCandidates, ms: Math.round(performance.now() - t0), tfModule: tf };
  } catch (inferErr) {
    console.error("Gagal inferensi:", inferErr);
    return null;
  } finally {
    try {
      inputTensor?.dispose?.();
      disposePredictionOutput(predOutput);
    } catch {
      // ignore cleanup error
    }
  }
}
