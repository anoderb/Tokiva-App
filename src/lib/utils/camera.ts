export type CameraStatus = "idle" | "needs_consent" | "starting" | "active" | "error";

export type CameraConsentCheck = "auto_start" | "needs_consent" | "denied" | "unsupported";

export const CAMERA_CONSENT_STORAGE_KEY = "tokiva_camera_consent_granted";

/**
 * Memeriksa apakah aplikasi sudah mendapat konfirmasi pertama kali dan izin browser untuk kamera.
 */
export async function checkCameraConsentState(): Promise<CameraConsentCheck> {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return "unsupported";
  }

  let browserPermState: PermissionState | "unsupported" = "unsupported";
  if (navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      browserPermState = status.state;
    } catch {
      // Sebagian browser (Safari / Firefox tertentu) tidak mendukung query("camera")
      browserPermState = "unsupported";
    }
  }

  if (browserPermState === "denied") {
    return "denied";
  }

  let hasLocalConsent = false;
  try {
    hasLocalConsent = window.localStorage.getItem(CAMERA_CONSENT_STORAGE_KEY) === "1";
  } catch {
    hasLocalConsent = false;
  }

  if (!hasLocalConsent) {
    return "needs_consent";
  }

  return "auto_start";
}

/**
 * Menandai bahwa pengguna telah menyetujui konfirmasi izin kamera pertama kali.
 */
export function markCameraConsentGranted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CAMERA_CONSENT_STORAGE_KEY, "1");
  } catch {
    // Abaikan jika storage dibatasi
  }
}

/**
 * Menghapus penanda konfirmasi kamera jika izin ternyata dicabut oleh pengguna.
 */
export function resetCameraConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CAMERA_CONSENT_STORAGE_KEY);
  } catch {
    // Abaikan jika storage dibatasi
  }
}

export interface AcquireCameraOptions {
  deviceId?: string;
  facingMode?: "environment" | "user";
  width?: number;
  height?: number;
}

/**
 * Mengambil MediaStream kamera dengan fallback bertahap agar tahan terhadap berbagai jenis webcam.
 */
export async function acquireCameraStream(
  options: AcquireCameraOptions = {}
): Promise<MediaStream> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    const err = new Error(
      "Browser tidak mendukung akses kamera atau halaman tidak dibuka melalui HTTPS / localhost."
    );
    err.name = "UnsupportedCameraError";
    throw err;
  }

  const {
    deviceId,
    facingMode = "environment",
    width = 1280,
    height = 720,
  } = options;

  const primaryConstraints: MediaStreamConstraints = {
    audio: false,
    video: deviceId
      ? {
          deviceId: { exact: deviceId },
          width: { ideal: width },
          height: { ideal: height },
        }
      : {
          facingMode: { ideal: facingMode },
          width: { ideal: width },
          height: { ideal: height },
        },
  };

  try {
    return await navigator.mediaDevices.getUserMedia(primaryConstraints);
  } catch (err: unknown) {
    const errName = (err as { name?: string })?.name || "";
    if (
      errName === "NotAllowedError" ||
      errName === "PermissionDeniedError" ||
      errName === "SecurityError"
    ) {
      throw err;
    }

    // Fallback ke constraint minimal jika device menolak resolusi/facingMode spesifik
    const fallbackConstraints: MediaStreamConstraints = {
      audio: false,
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
    };
    return await navigator.mediaDevices.getUserMedia(fallbackConstraints);
  }
}

/**
 * Memasang MediaStream ke elemen <video> dan menunggu hingga metadata serta frame pertama siap.
 */
export async function attachStreamToVideo(
  videoEl: HTMLVideoElement,
  stream: MediaStream,
  timeoutMs = 4500
): Promise<void> {
  videoEl.srcObject = stream;
  videoEl.muted = true;
  videoEl.playsInline = true;

  await new Promise<void>((resolve) => {
    if (videoEl.readyState >= 1 && videoEl.videoWidth > 0) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      videoEl.removeEventListener("loadedmetadata", finish);
      videoEl.removeEventListener("canplay", finish);
      clearTimeout(timer);
      resolve();
    };

    const timer = window.setTimeout(finish, timeoutMs);
    videoEl.addEventListener("loadedmetadata", finish, { once: true });
    videoEl.addEventListener("canplay", finish, { once: true });
  });

  try {
    await videoEl.play();
  } catch {
    // Beberapa browser tetap memutar video via autoPlay walau play() melempar AbortError saat transisi
  }
}

/**
 * Menghentikan seluruh track MediaStream dan membersihkan elemen <video> untuk mencegah lampu webcam tetap menyala.
 */
export function releaseCameraStream(
  stream?: MediaStream | null,
  videoEl?: HTMLVideoElement | null
): void {
  const seenTracks = new Set<MediaStreamTrack>();

  const stopStream = (target?: MediaStream | null) => {
    if (!target) return;
    for (const track of target.getTracks()) {
      if (!seenTracks.has(track)) {
        seenTracks.add(track);
        try {
          track.stop();
        } catch {
          // Abaikan error stop track
        }
      }
    }
  };

  stopStream(stream);

  if (videoEl) {
    const attached = videoEl.srcObject as MediaStream | null;
    if (attached && typeof attached.getTracks === "function") {
      stopStream(attached);
    }
    try {
      videoEl.pause();
    } catch {
      // Abaikan
    }
    videoEl.srcObject = null;
  }
}

/**
 * Mengambil daftar perangkat input kamera yang tersedia.
 */
export async function listCameraDevices(): Promise<MediaDeviceInfo[]> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.enumerateDevices
  ) {
    return [];
  }
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === "videoinput");
  } catch {
    return [];
  }
}

/**
 * Mengubah error WebRTC/MediaDevices menjadi pesan berbahasa Indonesia yang mudah dipahami pengguna.
 */
export function formatCameraError(err: unknown): {
  message: string;
  isPermissionDenied: boolean;
} {
  const name = (err as { name?: string })?.name || "";
  const rawMsg = (err as { message?: string })?.message || "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return {
      isPermissionDenied: true,
      message:
        "Izin akses kamera ditolak oleh browser. Aktifkan izin kamera agar pemindaian dapat berjalan.",
    };
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      isPermissionDenied: false,
      message:
        "Tidak ditemukan perangkat kamera/webcam yang terhubung ke perangkat ini.",
    };
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      isPermissionDenied: false,
      message:
        "Kamera sedang digunakan oleh aplikasi atau tab lain. Tutup aplikasi lain lalu coba lagi.",
    };
  }

  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return {
      isPermissionDenied: false,
      message:
        "Resolusi atau konfigurasi kamera tidak didukung oleh perangkat Anda.",
    };
  }

  if (name === "UnsupportedCameraError" || name === "SecurityError") {
    return {
      isPermissionDenied: false,
      message:
        rawMsg ||
        "Akses kamera diblokir karena koneksi tidak aman. Gunakan HTTPS atau localhost.",
    };
  }

  return {
    isPermissionDenied: false,
    message:
      rawMsg ||
      "Kamera gagal diaktifkan. Pastikan perangkat webcam terpasang dengan benar.",
  };
}
