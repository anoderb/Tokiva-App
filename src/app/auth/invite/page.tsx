"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { PasswordInput } from "@/components/auth/password-input";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { authService } from "@/lib/services/auth.service";
import { useAuth } from "@/components/auth/auth-provider";
import { UserCheck, Store, Check, Loader2, ShieldAlert } from "lucide-react";

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { setSessionData } = useAuth();

  const tokenParam = searchParams.get("token") || "";

  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    nama_lengkap: string;
    nama_toko: string;
  } | null>(null);
  const [validating, setValidating] = useState(true);
  const [inviteError, setInviteError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pinKasir, setPinKasir] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!tokenParam) {
      setValidating(false);
      setInviteError("Tautan undangan tidak memiliki token verifikasi yang sah.");
      return;
    }

    let active = true;
    setValidating(true);
    authService
      .getInviteDetails(tokenParam)
      .then((res) => {
        if (!active) return;
        setInviteInfo({
          email: res.email,
          nama_lengkap: res.nama_lengkap,
          nama_toko: res.nama_toko,
        });
      })
      .catch((err: any) => {
        if (!active) return;
        setInviteError(err?.message || "Undangan tidak valid atau sudah kedaluwarsa.");
      })
      .finally(() => {
        if (active) setValidating(false);
      });

    return () => {
      active = false;
    };
  }, [tokenParam]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 6) {
      setErrorMsg("Kata sandi minimal 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (!/^\d{6}$/.test(pinKasir.trim())) {
      setErrorMsg("PIN otorisasi kasir wajib tepat 6 digit angka.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.acceptInvite({
        token: tokenParam,
        password,
        pin_kasir: pinKasir.trim(),
      });
      setSessionData(res.user, res.toko);
      toast.success(`Akun kasir aktif! Selamat bergabung, ${res.user.nama_lengkap}.`);
      router.push("/kasir");
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal mengaktifkan akun kasir.");
    } finally {
      setIsLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="bg-card border-2 border-fg rounded-xl p-6 sm:p-8 shadow-pop text-center">
        <Loader2 className="w-9 h-9 animate-spin text-accent mx-auto mb-3" />
        <p className="text-sm font-bold text-fg">Memvalidasi Undangan Kasir...</p>
      </div>
    );
  }

  if (inviteError || !inviteInfo) {
    return (
      <div className="bg-card border-2 border-fg rounded-xl p-6 sm:p-8 shadow-pop text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-100 border-2 border-fg flex items-center justify-center mx-auto text-red-600">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="font-heading font-extrabold text-xl text-fg">Undangan Tidak Valid</h2>
        <p className="text-xs sm:text-sm text-muted-fg leading-relaxed">
          {inviteError || "Silakan minta pemilik toko mengirimkan ulang tautan aktivasi resmi ke email Anda."}
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border-2 border-fg bg-accent text-white font-heading font-bold text-xs shadow-pop"
        >
          Ke Halaman Masuk Utama
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card border-2 border-fg rounded-xl p-6 sm:p-8 shadow-pop">
      <div className="w-12 h-12 rounded-lg bg-sky-100 border-2 border-fg flex items-center justify-center text-sky-700 mb-4 shadow-[2px_2px_0px_#1E293B]">
        <UserCheck className="w-6 h-6" />
      </div>

      <h2 className="font-heading font-extrabold text-2xl text-fg mb-1">
        Aktivasi Akun Kasir
      </h2>

      <p className="text-xs sm:text-sm text-muted-fg leading-relaxed mb-4">
        Halo <strong>{inviteInfo.nama_lengkap}</strong>, atur kata sandi dan PIN 6-digit pribadi Anda untuk mengakses terminal POS:
      </p>

      <div className="bg-muted/40 border-2 border-fg rounded-lg p-3.5 mb-5 space-y-1.5 text-xs shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-fg flex items-center gap-1.5 font-bold">
            <Store className="w-3.5 h-3.5 text-accent" /> Toko:
          </span>
          <strong className="text-fg text-sm">{inviteInfo.nama_toko}</strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-fg font-bold">Email Terverifikasi:</span>
          <span className="font-mono text-fg">{inviteInfo.email}</span>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="danger" className="mb-4">
          {errorMsg}
        </Alert>
      )}

      <form onSubmit={handleActivate} className="flex flex-col gap-3.5 text-xs sm:text-sm">
        <div>
          <label className="block font-bold text-fg mb-1 text-xs">Buat Kata Sandi Login *</label>
          <PasswordInput
            required
            showStrength
            placeholder="Minimal 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-bold text-fg mb-1 text-xs">Konfirmasi Kata Sandi *</label>
          <PasswordInput
            required
            placeholder="Ulangi kata sandi baru"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-bold text-fg mb-1 text-xs">PIN Otorisasi Kasir (6-Digit) *</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            required
            value={pinKasir}
            onChange={(e) => setPinKasir(e.target.value.replace(/\D/g, ""))}
            placeholder="6 digit angka"
            className="w-full px-3.5 py-2.5 bg-card border-2 border-fg rounded-md focus:outline-none font-mono text-center text-base font-bold tracking-[0.35em]"
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
              <span>Mengaktifkan Akun...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Aktifkan Akun & Mulai POS</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-border text-center">
        <Link href="/auth/login" className="text-xs text-muted-fg hover:text-fg font-bold">
          Kembali ke Halaman Masuk Utama
        </Link>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <AuthLayout
      title="Selamat Bergabung di Tokiva POS"
      subtitle="Atur kata sandi dan PIN otorisasi kasir pribadi Anda secara aman."
    >
      <Suspense fallback={<div className="text-center p-8 text-xs text-muted-fg">Memuat undangan kasir...</div>}>
        <InviteContent />
      </Suspense>
    </AuthLayout>
  );
}
