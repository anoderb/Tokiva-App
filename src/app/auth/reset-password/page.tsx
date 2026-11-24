"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { PasswordInput } from "@/components/auth/password-input";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { authService } from "@/lib/services/auth.service";
import { Lock, Check, ArrowLeft, Loader2 } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const tokenParam = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!tokenParam) {
      if (!email.trim() || !email.includes("@")) {
        setErrorMsg("Email akun wajib diisi.");
        return;
      }
      if (!/^\d{6}$/.test(otp.trim())) {
        setErrorMsg("Kode OTP reset harus 6 digit angka dari email Anda.");
        return;
      }
    }

    if (password.length < 6) {
      setErrorMsg("Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(
        tokenParam
          ? { token: tokenParam, password_baru: password }
          : { email: email.trim(), otp: otp.trim(), password_baru: password }
      );
      toast.success("Kata sandi baru berhasil disimpan! Silakan masuk.");
      router.push("/auth/login");
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Token atau kode OTP reset tidak valid / telah kedaluwarsa."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card border-2 border-fg rounded-xl p-6 sm:p-8 shadow-pop">
      <div className="w-12 h-12 rounded-lg bg-emerald-100 border-2 border-fg flex items-center justify-center text-emerald-700 mb-4 shadow-[2px_2px_0px_#1E293B]">
        <Lock className="w-6 h-6" />
      </div>

      <h2 className="font-heading font-extrabold text-2xl text-fg mb-1">
        Buat Kata Sandi Baru
      </h2>

      <p className="text-xs sm:text-sm text-muted-fg leading-relaxed mb-5">
        {tokenParam ? (
          <>Tautan verifikasi terdeteksi. Silakan atur kata sandi baru{email ? <> untuk <strong className="text-fg">{email}</strong></> : ""}.</>
        ) : (
          <>Masukkan kode OTP 6-digit yang dikirim ke email Anda beserta kata sandi baru.</>
        )}
      </p>

      {errorMsg && (
        <Alert variant="danger" className="mb-4">
          {errorMsg}
        </Alert>
      )}

      <form onSubmit={handleReset} className="flex flex-col gap-3.5 text-xs sm:text-sm">
        {!tokenParam && (
          <>
            <div>
              <label className="block font-bold text-fg mb-1 text-xs">Alamat Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@toko.id"
                className="w-full px-3.5 py-2.5 bg-card border-2 border-fg rounded-md focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-fg mb-1 text-xs">Kode OTP Reset (6-Digit)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 bg-card border-2 border-fg rounded-md focus:outline-none font-mono text-center text-base font-bold tracking-[0.3em]"
              />
            </div>
          </>
        )}

        <div>
          <label className="block font-bold text-fg mb-1 text-xs">Kata Sandi Baru</label>
          <PasswordInput
            required
            showStrength
            placeholder="Minimal 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-bold text-fg mb-1 text-xs">Ulangi Kata Sandi Baru</label>
          <PasswordInput
            required
            placeholder="Konfirmasi kata sandi baru"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-full border-2 border-fg bg-accent text-white font-heading font-bold text-sm shadow-pop hover:shadow-pop-hover active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyimpan Sandi...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Simpan Kata Sandi Baru</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-border text-center flex items-center justify-between text-xs">
        <Link
          href="/auth/forgot-password"
          className="text-accent font-bold hover:underline"
        >
          Minta Kode Ulang
        </Link>
        <Link
          href="/auth/login"
          className="text-muted-fg hover:text-fg font-bold inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Halaman Masuk</span>
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Perbarui Keamanan Akun Anda"
      subtitle="Gunakan kombinasi huruf kapital, angka, dan simbol untuk keamanan maksimal akun Tokiva Anda."
    >
      <Suspense fallback={<div className="text-center p-8 text-xs text-muted-fg">Memuat form reset...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </AuthLayout>
  );
}
