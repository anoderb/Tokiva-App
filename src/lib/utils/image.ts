export interface CompressImageOptions {
  maxDim?: number;
  quality?: number;
  maxRawBytes?: number;
}

/**
 * Validasi ukuran, muat citra via Canvas, dan kompres ke JPEG Base64 di sisi klien sebelum upload.
 */
export function compressImageFileToBase64(
  file: File,
  { maxDim = 1024, quality = 0.84, maxRawBytes = 10 * 1024 * 1024 }: CompressImageOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File harus berupa gambar (JPG, PNG, WebP)"));
      return;
    }
    if (file.size > maxRawBytes) {
      const maxMb = Math.round(maxRawBytes / (1024 * 1024));
      reject(new Error(`Ukuran file terlalu besar (maksimal ${maxMb} MB).`));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    let settled = false;

    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Waktu pemrosesan gambar habis. Silakan pilih ulang file."));
    }, 15_000);

    img.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        let targetW = img.naturalWidth || img.width || maxDim;
        let targetH = img.naturalHeight || img.height || maxDim;
        if (targetW > maxDim || targetH > maxDim) {
          if (targetW >= targetH) {
            targetH = Math.max(1, Math.round((targetH * maxDim) / targetW));
            targetW = maxDim;
          } else {
            targetW = Math.max(1, Math.round((targetW * maxDim) / targetH));
            targetH = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          reject(new Error("Browser gagal menyiapkan kanvas kompresi gambar."));
          return;
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const out = canvas.toDataURL("image/jpeg", quality);
        cleanup();
        resolve(out);
      } catch {
        cleanup();
        reject(new Error("Gagal mengonversi dan mengompresi gambar."));
      }
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      reject(new Error("Gambar rusak atau tidak didukung oleh peramban."));
    };

    img.src = objectUrl;
  });
}
