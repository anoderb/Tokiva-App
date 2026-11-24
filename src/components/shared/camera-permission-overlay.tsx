"use client";

import { Camera, CameraOff, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CameraStatus } from "@/lib/utils/camera";

interface CameraPermissionOverlayProps {
  status: CameraStatus;
  errorMessage?: string | null;
  isPermissionDenied?: boolean;
  title?: string;
  description?: string;
  startingText?: string;
  onRequestConsent: () => void;
  onRetry: () => void;
}

export function CameraPermissionOverlay({
  status,
  errorMessage,
  isPermissionDenied = false,
  title = "Izin Akses Kamera Diperlukan",
  description = "Tokiva membutuhkan akses kamera perangkat untuk memindai produk secara langsung.",
  startingText = "Menyiapkan Kamera...",
  onRequestConsent,
  onRetry,
}: CameraPermissionOverlayProps) {
  if (status === "active") return null;

  if (status === "needs_consent") {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/95 p-5 text-center text-slate-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-accent bg-accent/20 text-accent">
          <Camera className="h-6 w-6" />
        </div>
        <div className="max-w-xs space-y-1">
          <h4 className="font-heading text-sm font-bold text-white">{title}</h4>
          <p className="text-[11px] leading-relaxed text-slate-300">{description}</p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onRequestConsent}
          className="mt-1 cursor-pointer bg-accent text-white font-bold shadow-pop-soft hover:brightness-110"
        >
          <Camera className="mr-1.5 h-4 w-4" />
          Izinkan &amp; Aktifkan Kamera
        </Button>
        <p className="text-[10px] text-slate-400">
          Konfirmasi ini hanya diminta satu kali pada penggunaan awal.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 bg-slate-950/95 p-5 text-center text-slate-200">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/15 text-rose-400">
          {isPermissionDenied ? (
            <ShieldAlert className="h-6 w-6" />
          ) : (
            <CameraOff className="h-6 w-6" />
          )}
        </div>
        <div className="max-w-xs space-y-1">
          <h4 className="font-heading text-xs font-bold text-rose-300">
            {isPermissionDenied ? "Izin Kamera Ditolak" : "Kamera Tidak Tersedia"}
          </h4>
          <p className="text-[11px] leading-relaxed text-slate-300">
            {errorMessage || "Kamera tidak dapat diakses."}
          </p>
          {isPermissionDenied && (
            <p className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px] text-amber-200">
              Klik ikon gembok/kamera di bilah alamat browser, ubah izin Kamera ke{" "}
              <strong>Izinkan (Allow)</strong>, lalu tekan Coba Lagi.
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="mt-1 cursor-pointer border-slate-600 bg-slate-800 text-xs text-white hover:bg-slate-700"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  // status === "starting" | "idle"
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-slate-950/95 p-4 text-center text-slate-300">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <span className="text-xs font-bold text-white">{startingText}</span>
      <span className="text-[10px] text-slate-400">
        Pastikan izin kamera disetujui jika browser meminta konfirmasi.
      </span>
    </div>
  );
}
