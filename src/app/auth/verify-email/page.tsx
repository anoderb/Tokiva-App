"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { authService } from "@/lib/services/auth.service";
import { CheckCircle2, ArrowRight, Mail, RefreshCw, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const tokenParam = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(Boolean(tokenParam));
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!tokenParam) return;
    let active = true;
    setVerifying(true);
    setErrorMsg("");
    authService
      .verifyEmail({ token: tokenParam })
      .then((res) => {
        if (!active) return;
        setVerified(true);
        if (res.email) setEmail(res.email);
        toast.success("Email berhasil diverifikasi!");
      })
      .catch((err: any) => {
        if (!active) return;
        setErrorMsg(err?.message || "Tautan verifikasi tidak valid atau telah kedaluwarsa.");
      })
      .finally(() => {
        if (active) setVerifying(false);
      });
    return () => {
      active = false;
    };
  }, [tokenParam, toast]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Masukkan alamat email terdaftar yang valid.");
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setErrorMsg("Kode OTP verifikasi harus terdiri dari 6 digit angka.");
      return;
    }

    setVerifying(true);
    try {
      await authService.verifyEmail({ email: email.trim(), otp: otp.trim() });
      setVerified(true);
      toast.success("Email berhasil diverifikasi! Silakan masuk.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Kode verifikasi tidak cocok atau sudah kedaluwarsa.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg("");
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Masukkan email akun Anda terlebih dahulu untuk mengirim ulang kode.");
      return;
    }
    setResending(true);
    try {
      const res = await authService.resendVerification(email.trim());
      if (res.already_verified) {
        setVerified(true);
        toast.info(res.message || "Email Anda sudah terverifikasi.");
      } else {
        setCooldown(res.cooldown_seconds || 60);
        toast.success(res.message || "Kode verifikasi baru telah dikirim ke email Anda.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal mengirim ulang email verifikasi.");
    } finally {
      setResending(false);
    }
  };

  if (verifying && tokenParam && !verified) {
    return (
      <div className="bg-card border-2 border-fg rounded-xl p-6 sm:p-8 shadow-pop text-center">
        <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto mb-3" />
        <h2 className="font-heading font-extrabold text-xl text-fg mb-1">
          Memverifikasi Email Anda...
        </h2>
        <p className="text-xs sm:text-sm text-muted-fg">
          Mohon tunggu sebentar selagi kami memvalidasi tautan aktivasi.
        </p>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="bg-card border-2 border-fg rounded-xl p-6 sm:p-8 shadow-pop text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-fg flex items-center justify-center mx-auto mb-4 text-emerald-700 shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h2 className="font-heading font-extrabold text-2xl text-fg mb-2">
          Email Terverifikasi!
        </h2>

        <p className="text-xs sm:text-sm text-muted-fg leading-relaxed mb-6">
          Akun{email ? ` (${email})` : ""} kini telah aktif. Anda sudah dapat masuk dan mengelola toko Anda di Tokiva POS.
        </p>

        <Link
          href="/auth/login"
          className="w-full py-3 rounded-full border-2 border-fg bg-accent text-white font-heading font-bold text-sm shadow-pop hover:shadow-pop-hover inline-flex items-center justify-center gap-2"
        >
          <span>Masuk ke Dashboard Tokiva</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card border-2 border-fg rounded-xl p-6 sm:p-8 shadow-pop">
      <div className="w-12 h-12 rounded-lg bg-emerald-100 border-2 border-fg flex items-center justify-center text-emerald-700 mb-4 shadow-[2px_2px_0px_#1E293B]">
        <Mail className="w-6 h-6" />
      </div>

      <h2 className="font-heading font-extrabold text-2xl text-fg mb-1">
        Verifikasi Email Anda
      </h2>

      <p className="text-xs sm:text-sm text-muted-fg leading-relaxed mb-5">
        Kami telah mengirimkan tautan aktivasi dan kode OTP 6-digit melalui Resend ke{" "}
        <strong className="text-fg">{email || "email terdaftar Anda"}</strong>. Klik tautan di inbox atau masukkan kodenya di bawah.
      </p>

      {errorMsg && (
        <Alert variant="danger" className="mb-4">
          {errorMsg}
        </Alert>
      )}

      <form onSubmit={handleVerifyOtp} className="space-y-3.5 text-xs sm:text-sm">
        <div>
          <label className="block font-bold text-fg mb-1 text-xs">Email Terdaftar</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className="w-full px-3.5 py-2.5 bg-card border-2 border-fg rounded-md focus:outline-none text-sm"
          />
        </div>

        <div>
          <label className="block font-bold text-fg mb-1 text-xs">Kode Verifikasi (OTP 6-Digit)</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="w-full px-3.5 py-2.5 bg-card border-2 border-fg rounded-md focus:outline-none font-mono text-center text-lg font-bold tracking-[0.35em]"
          />
        </div>

        <button
          type="submit"
          disabled={verifying}
          className="w-full py-3 rounded-full border-2 border-fg bg-accent text-white font-heading font-bold text-sm shadow-pop hover:shadow-pop-hover active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {verifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memverifikasi...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Verifikasi Akun</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2 text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="w-full py-2.5 rounded-full border-2 border-border bg-card text-fg hover:border-fg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
          <span>
            {cooldown > 0
              ? `Kirim Ulang Kode (${cooldown}s)`
              : resending
              ? "Mengirim..."
              : "Kirim Ulang Kode Verifikasi"}
          </span>
        </button>

        <Link href="/auth/login" className="text-xs text-muted-fg hover:text-fg font-bold mt-1">
          Kembali ke Halaman Masuk
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthLayout
      title="Aktivasi Akun Toko Kelontong Anda"
      subtitle="Selesaikan verifikasi email untuk mulai mengelola penjualan, stok barang, dan AI Vision Tokiva."
    >
      <Suspense fallback={<div className="text-center p-8 text-xs text-muted-fg">Memuat halaman verifikasi...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </AuthLayout>
  );
}
