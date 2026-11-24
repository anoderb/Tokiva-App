"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Clock, Ban, ShieldX, ArrowRight, Home, LogIn } from "lucide-react";

function StatusContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "expired";

  if (type === "denied") {
    return (
      <div className="bg-card border-2 border-fg rounded-xl p-6 sm:p-8 shadow-pop text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-fg flex items-center justify-center mx-auto mb-4 text-red-600 shadow-sm">
          <ShieldX className="w-8 h-8" />
        </div>

        <h2 className="font-heading font-extrabold text-2xl text-fg mb-2">
          Akses Tidak Diizinkan (403)
        </h2>

        <p className="text-xs sm:text-sm text-muted-fg leading-relaxed mb-6">
          Akun Anda tidak memiliki izin hak akses untuk membuka halaman ini. Silakan hubungi pemilik toko atau administrator jika ini merupakan kekeliruan.
        </p>

        <Link
          href="/auth/login"
          className="w-full py-3 rounded-full border-2 border-fg bg-accent text-white font-heading font-bold text-sm shadow-pop hover:shadow-pop-hover inline-flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Kembali ke Halaman Masuk</span>
        </Link>
      </div>
    );
  }

  if (type === "disabled") {
    return (
      <div className="bg-card border-2 border-fg rounded-xl p-6 sm:p-8 shadow-pop text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-fg flex items-center justify-center mx-auto mb-4 text-amber-700 shadow-sm">
          <Ban className="w-8 h-8" />
        </div>

        <h2 className="font-heading font-extrabold text-2xl text-fg mb-2">
          Akun Dinonaktifkan Sementara
        </h2>

        <p className="text-xs sm:text-sm text-muted-fg leading-relaxed mb-6">
          Akses akun Anda saat ini sedang dinonaktifkan atau ditangguhkan oleh pemilik toko / administrator Tokiva.
        </p>

        <div className="bg-muted p-3 rounded-lg border border-border text-xs text-muted-fg mb-6 text-left">
          <strong>Perlu bantuan?</strong> Hubungi dukungan resmi Tokiva melalui email di{" "}
          <span className="font-mono text-fg font-bold">support@tokiva.id</span> atau hubungi pemilik toko Anda.
        </div>

        <Link
          href="/auth/login"
          className="w-full py-2.5 rounded-full border-2 border-fg bg-card text-fg font-bold text-xs hover:bg-muted inline-flex items-center justify-center gap-1.5"
        >
          <span>Kembali ke Halaman Masuk</span>
        </Link>
      </div>
    );
  }

  // Default: session expired
  return (
    <div className="bg-card border-2 border-fg rounded-xl p-6 sm:p-8 shadow-pop text-center">
      <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-fg flex items-center justify-center mx-auto mb-4 text-amber-700 shadow-sm">
        <Clock className="w-8 h-8" />
      </div>

      <h2 className="font-heading font-extrabold text-2xl text-fg mb-2">
        Sesi Anda Telah Berakhir
      </h2>

      <p className="text-xs sm:text-sm text-muted-fg leading-relaxed mb-6">
        Demi menjaga keamanan transaksi dan data toko kelontong Anda, sesi login Anda telah kedaluwarsa. Silakan masuk kembali untuk melanjutkan.
      </p>

      <Link
        href="/auth/login"
        className="w-full py-3 rounded-full border-2 border-fg bg-accent text-white font-heading font-bold text-sm shadow-pop hover:shadow-pop-hover inline-flex items-center justify-center gap-2"
      >
        <LogIn className="w-4 h-4" />
        <span>Masuk Kembali ke Tokiva</span>
      </Link>
    </div>
  );
}

export default function StatusPage() {
  return (
    <AuthLayout
      title="Informasi Keamanan Sesi Tokiva"
      subtitle="Sistem proteksi sesi kami secara proaktif melindungi data toko kelontong dari akses tidak sah."
    >
      <Suspense fallback={<div className="text-center p-8 text-xs text-muted-fg">Memuat status...</div>}>
        <StatusContent />
      </Suspense>
    </AuthLayout>
  );
}

