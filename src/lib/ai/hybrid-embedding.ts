import type { AIKelasEmbedding, Produk } from "@/types/api";

export interface DualModelOutputs {
  probs: number[];
  embedding: number[] | null;
}

export interface HybridEmbeddingCandidate {
  embeddingRecord: AIKelasEmbedding;
  product: Produk | null;
  similarity: number;
  confidence: number;
  classLabel: string;
  kelasId: string;
  detectionMethod: "embedding";
}

/** Normalisasi L2 pada vektor fitur numerik. */
export function l2Normalize(vec: number[]): number[] {
  if (!vec || vec.length === 0) return [];
  let sumSq = 0;
  for (let i = 0; i < vec.length; i += 1) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm <= 1e-12) return vec.slice();
  return vec.map((v) => v / norm);
}

/** Hitung cosine similarity (diasumsikan vektor bisa belum/sudah ternormalisasi). */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom <= 1e-12) return 0;
  return dot / denom;
}

function tensorToArray(t: any): number[] {
  if (!t || typeof t.dataSync !== "function") return [];
  return Array.from(t.dataSync() as Float32Array);
}

/**
 * Mengekstrak [probs, embedding] secara aman baik dari model v1 (1 output)
 * maupun model v2 Dual-Output (2 output array atau NamedTensorMap).
 */
export function extractDualModelOutputs(
  pred: any,
  numClassesHint = 0,
  expectedEmbeddingDim = 256
): DualModelOutputs {
  if (!pred) return { probs: [], embedding: null };

  // NamedTensorMap (beberapa ekspor TFJS GraphModel mengembalikan map nama output)
  if (!Array.isArray(pred) && typeof pred === "object" && typeof pred.dataSync !== "function") {
    const entries = Object.entries(pred);
    const arrays = entries.map(([name, tensor]) => ({
      name: name.toLowerCase(),
      arr: tensorToArray(tensor),
    }));
    const embEntry =
      arrays.find((e) => e.name.includes("embed")) ||
      arrays.find((e) => e.arr.length === expectedEmbeddingDim && e.arr.length !== numClassesHint);
    const probEntry =
      arrays.find((e) => e.name.includes("pred") || e.name.includes("prob") || e.name.includes("softmax")) ||
      arrays.find((e) => e !== embEntry) ||
      arrays[0];
    return {
      probs: probEntry?.arr || [],
      embedding: embEntry ? l2Normalize(embEntry.arr) : null,
    };
  }

  if (Array.isArray(pred)) {
    const arrays = pred.map((t) => tensorToArray(t)).filter((a) => a.length > 0);
    if (arrays.length === 1) {
      return { probs: arrays[0], embedding: null };
    }
    if (arrays.length >= 2) {
      // Identifikasi mana tensor probabilitas Softmax (jumlah ~1.0 & elemen non-negatif) vs embedding L2
      const looksLikeSoftmax = (arr: number[]) => {
        if (arr.length === 0) return false;
        let sum = 0;
        for (const v of arr) {
          if (v < -0.001 || v > 1.001) return false;
          sum += v;
        }
        return Math.abs(sum - 1) < 0.08;
      };

      const a0 = arrays[0];
      const a1 = arrays[1];
      if (numClassesHint > 0) {
        if (a0.length === numClassesHint && a1.length !== numClassesHint) {
          return { probs: a0, embedding: l2Normalize(a1) };
        }
        if (a1.length === numClassesHint && a0.length !== numClassesHint) {
          return { probs: a1, embedding: l2Normalize(a0) };
        }
      }
      if (looksLikeSoftmax(a0) && !looksLikeSoftmax(a1)) {
        return { probs: a0, embedding: l2Normalize(a1) };
      }
      if (looksLikeSoftmax(a1) && !looksLikeSoftmax(a0)) {
        return { probs: a1, embedding: l2Normalize(a0) };
      }
      if (a1.length === expectedEmbeddingDim) {
        return { probs: a0, embedding: l2Normalize(a1) };
      }
      return { probs: a0, embedding: l2Normalize(a1) };
    }
  }

  return { probs: tensorToArray(pred), embedding: null };
}

/** Jalankan 1 gambar ke model v2 untuk mengambil vektor embedding L2-normalized. */
export function extractEmbeddingFromElement(
  model: any,
  tf: any,
  imgSource: HTMLImageElement | HTMLVideoElement,
  numClassesHint = 0,
  expectedDim = 256
): number[] | null {
  if (!model || !tf) return null;
  return tf.tidy(() => {
    const raw = tf.browser.fromPixels(imgSource);
    const resized = tf.image.resizeBilinear(raw, [224, 224]);
    const tensor = resized.toFloat().expandDims(0);
    const pred = model.predict(tensor);
    const { embedding } = extractDualModelOutputs(pred, numClassesHint, expectedDim);
    return embedding;
  });
}

function loadHtmlImageFromBase64(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar untuk ekstraksi embedding"));
    img.src = dataUrl;
  });
}

/**
 * Ekstrak prototipe (centroid + maksimal 5 vektor sudut representatif) dari daftar foto base64 Owner.
 */
export async function extractPrototypeFromBase64List({
  model,
  tf,
  base64List,
  numClassesHint = 0,
  expectedDim = 256,
  maxSamples = 5,
}: {
  model: any;
  tf: any;
  base64List: string[];
  numClassesHint?: number;
  expectedDim?: number;
  maxSamples?: number;
}): Promise<{ centroid: number[]; prototypes: number[][]; dimensi: number; jml_sampel: number } | null> {
  if (!model || !tf || !Array.isArray(base64List) || base64List.length === 0) return null;

  const picked: string[] = [];
  if (base64List.length <= maxSamples) {
    picked.push(...base64List);
  } else {
    const step = (base64List.length - 1) / (maxSamples - 1);
    for (let i = 0; i < maxSamples; i += 1) {
      picked.push(base64List[Math.round(i * step)]);
    }
  }

  const prototypes: number[][] = [];
  for (const src of picked) {
    try {
      const img = await loadHtmlImageFromBase64(src);
      const vec = extractEmbeddingFromElement(model, tf, img, numClassesHint, expectedDim);
      if (vec && vec.length > 0) prototypes.push(vec);
    } catch {
      // Lewati foto yang gagal decode
    }
  }

  if (prototypes.length === 0) return null;
  const dim = prototypes[0].length;
  const mean = new Array(dim).fill(0);
  for (const p of prototypes) {
    for (let i = 0; i < dim; i += 1) mean[i] += p[i];
  }
  for (let i = 0; i < dim; i += 1) mean[i] /= prototypes.length;

  return {
    centroid: l2Normalize(mean),
    prototypes,
    dimensi: dim,
    jml_sampel: prototypes.length,
  };
}

/**
 * Mencocokkan query embedding terhadap daftar prototipe aktif milik 1 toko.
 * Seluruh hasil diberi penanda detectionMethod = 'embedding' agar selalu masuk Tier 2.
 */
export function matchEmbeddingPrototypes({
  queryEmbedding,
  storeEmbeddings,
  products,
  minSimilarityRatio = 0.78,
}: {
  queryEmbedding: number[] | null;
  storeEmbeddings: AIKelasEmbedding[];
  products?: Produk[];
  minSimilarityRatio?: number;
}): HybridEmbeddingCandidate[] {
  if (!queryEmbedding || queryEmbedding.length === 0 || !Array.isArray(storeEmbeddings) || storeEmbeddings.length === 0) {
    return [];
  }

  const results: HybridEmbeddingCandidate[] = [];
  for (const rec of storeEmbeddings) {
    if (rec.status !== "aktif") continue;
    const embObj = rec.embedding;
    if (!embObj) continue;

    let bestSim = 0;
    if (Array.isArray(embObj.centroid) && embObj.centroid.length === queryEmbedding.length) {
      bestSim = Math.max(bestSim, cosineSimilarity(queryEmbedding, embObj.centroid));
    }
    if (Array.isArray(embObj.prototypes)) {
      for (const proto of embObj.prototypes) {
        if (Array.isArray(proto) && proto.length === queryEmbedding.length) {
          bestSim = Math.max(bestSim, cosineSimilarity(queryEmbedding, proto));
        }
      }
    }

    if (bestSim < minSimilarityRatio) continue;

    let matchedProd: Produk | null = null;
    if (Array.isArray(products) && products.length > 0) {
      matchedProd =
        products.find(
          (p) =>
            (rec.produk_id && p.id === rec.produk_id) ||
            (rec.kelas?.barcode && p.barcode === rec.kelas.barcode) ||
            p.ai_kelas_id === rec.kelas_id
        ) || null;
      if (!matchedProd) continue;
    }

    results.push({
      embeddingRecord: rec,
      product: matchedProd,
      similarity: bestSim,
      confidence: Math.min(99.5, Math.max(1, Number((bestSim * 100).toFixed(1)))),
      classLabel: rec.kelas?.nama || rec.produk?.nama || rec.kelas?.kode_kelas || "Produk Baru",
      kelasId: rec.kelas_id,
      detectionMethod: "embedding",
    });
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}
