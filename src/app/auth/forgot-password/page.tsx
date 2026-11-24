"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { authService } from "@/lib/services/auth.service";
import { KeyRound, Mail, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Masukkan alamat email yang valid.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      setIsSent(true);
      toast.success(res.message || "Instruksi reset kata sandi telah dikirim ke email Anda.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal memproses permintaan reset kata sandi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Pemulihan Akses Akun Toko"
      subtitle="Masukkan email terdaftar Anda untuk mengatur ulang kata sandi melalui tautan atau OTP email."
    >
      <div className="bg-card border-2 border-fg rounded-xl p-6 sm:p-8 shadow-pop">
        {!isSent ? (
          <>
            <div className="w-12 h-12 rounded-lg bg-purple-100 border-2 border-fg flex items-center justify-center text-admin mb-4 shadow-[2px_2px_0px_#1E293B]">
              <KeyRound className="w-6 h-6" />
            </div>

            <h2 className="font-heading font-extrabold text-2xl text-fg mb-1">
              Lupa Kata Sandi?
            </h2>

            <p className="text-xs sm:text-sm text-muted-fg leading-relaxed mb-5">
              Masukkan alamat email akun Tokiva Anda. Kami akan mengirimkan tautan dan kode OTP 6-digit ke inbox Anda.
            </p>

            {errorMsg && (
              <Alert variant="danger" className="mb-4">
                {errorMsg}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-fg mb-1 text-xs">Alamat Email Terdaftar</label>
                <input
                  type="email"
                  required
                  placeholder="nama@toko.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-card border-2 border-fg rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40 font-medium"
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
                    <span>Mengirim Instruksi...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Kirim Kode Reset via Email</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-fg flex items-center justify-center mx-auto mb-4 text-emerald-700 shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="font-heading font-extrabold text-xl text-fg mb-2">
              Periksa Inbox Email Anda
            </h3>

            <p className="text-xs sm:text-sm text-muted-fg leading-relaxed mb-4">
              Jika <strong className="text-fg">{email}</strong> terdaftar di Tokiva POS, kami telah mengirimkan tautan pemulihan dan kode OTP 6-digit.
            </p>

            <div className="flex flex-col gap-2.5 mt-6">
              <Link
                href={`/auth/reset-password?email=${encodeURIComponent(email.trim())}`}
                className="w-full py-2.5 rounded-full border-2 border-fg bg-accent text-white font-heading font-bold text-xs shadow-pop hover:shadow-pop-hover flex items-center justify-center gap-1.5"
              >
                <span>Masukkan Kode OTP & Atur Ulang Sandi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => setIsSent(false)}
                className="w-full py-2 rounded-full border-2 border-border bg-card text-muted-fg hover:text-fg font-bold text-xs cursor-pointer"
              >
                Gunakan Email Lain
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-border text-center">
          <Link
            href="/auth/login"
            className="text-xs text-muted-fg hover:text-fg font-bold inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Masuk</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
