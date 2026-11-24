import { loadTfjs } from "@/app/admin/ai/hooks/useTfjsModel";
import type { AIKelas, Produk } from "@/types/api";
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

/** Menjalankan inferensi gambar TFJS 224x224 dan mengembalikan top-3 kandidat produk unik. */
export async function runVisionPrediction({
  imgSource,
  model,
  rawClasses,
  tfModule,
  kelasList,
  products,
}: {
  imgSource: HTMLVideoElement | HTMLImageElement;
  model: any;
  rawClasses: string[];
  tfModule: any;
  kelasList: AIKelas[];
  products: Produk[];
}): Promise<{ candidates: AiDetectionCandidate[]; ms: number; tfModule: any } | null> {
  if (!model) return null;
  const t0 = performance.now();
  try {
    const tf = tfModule || (await loadTfjs());
    const probs: number[] = tf.tidy(() => {
      const raw = tf.browser.fromPixels(imgSource);
      const resized = tf.image.resizeBilinear(raw, [224, 224]);
      const tensor = resized.toFloat().expandDims(0);
      const pred = model.predict(tensor);
      const outTensor = Array.isArray(pred) ? pred[0] : pred;
      return Array.from(outTensor.dataSync() as Float32Array);
    });

    const effectiveClasses =
      rawClasses.length > 0 ? rawClasses : Array.from({ length: probs.length }, (_, i) => `Kelas_${i}`);

    const indexed = probs
      .map((p, idx) => ({ prob: p, idx, label: effectiveClasses[idx] || `kelas_${idx}` }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 5);

    const usedProductIds = new Set<string>();
    const topCandidates: AiDetectionCandidate[] = [];

    for (const item of indexed) {
      const { product, kelas } = matchAiLabelToProduct(item.label, kelasList, products);
      if (product && !usedProductIds.has(product.id)) {
        usedProductIds.add(product.id);
        const conf = Math.min(99.9, Math.max(1, Number((item.prob * 100).toFixed(1))));
        topCandidates.push({
          product,
          confidence: conf,
          classLabel: item.label,
          kelasId: kelas?.id || product.ai_kelas_id || undefined,
        });
      }
      if (topCandidates.length >= 3) break;
    }

    return { candidates: topCandidates, ms: Math.round(performance.now() - t0), tfModule: tf };
  } catch (inferErr) {
    console.error("Gagal inferensi:", inferErr);
    return null;
  }
}
