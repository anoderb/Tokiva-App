/**
 * Tokiva Scanner Audio Synthesizer (Web Audio API)
 * Menghasilkan nada scanner ritel bebas latensi (0ms) tanpa memerlukan file audio eksternal.
 */

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioContext || sharedAudioContext.state === "closed") {
      sharedAudioContext = new AudioContextClass();
    }
    if (sharedAudioContext.state === "suspended") {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Mainkan suara scanner kasir
 * @param type 'success' (beep standar C6), 'warning' (nada ganda), 'duplicate' (klip lembut)
 */
export function playScannerBeep(
  type: "success" | "warning" | "duplicate" = "success",
  isMuted: boolean = false
): void {
  if (isMuted || typeof window === "undefined") return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      // Nada Scanner Kasir Ritel Klasik: 1046.5 Hz (Nada C6)
      osc.type = "sine";
      osc.frequency.setValueAtTime(1046.5, now);
      // Volume envelope dengan penurunan eksponensial lembut untuk mencegah distorsi klik
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === "warning") {
      // Nada Medium Confidence / Butuh Perhatian: 587.33 Hz (D5)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(587.33, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "duplicate") {
      // Nada klik lembut (barang sama terdeteksi saat masih dalam cooldown)
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch {
    // Abaikan jika browser membatasi Web Audio tanpa user gesture
  }
}

