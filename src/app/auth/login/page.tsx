"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Shield, AlertCircle, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoQuickLogin, IS_DEMO_LOGIN_ENABLED } from "@/components/auth/demo-quick-login";
import { authService } from "@/lib/services/auth.service";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";

const REMEMBER_EMAIL_KEY = "tokiva_remembered_email";

export default function LoginPage() {
  const router = useRouter();
  const { setSessionData } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRememberEmail(true);
      }
    } catch {
      // Abaikan error akses storage
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setNeedsVerification(false);
    const err: Record<string, string> = {};
    if (!email.trim()) err.email = "Email wajib diisi";
    else if (!email.includes("@")) err.email = "Format email tidak valid";
    if (!pass) err.pass = "Kata sandi wajib diisi";
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    const cleanEmail = email.trim();
    try {
      if (rememberEmail) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, cleanEmail);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {
      // Abaikan error storage
    }

    setLoading(true);
    try {
      const res = await authService.login(cleanEmail, pass);
      setSessionData(res.user, res.toko);
      toast.success(`Selamat datang kembali, ${res.user.nama_lengkap}!`);

      if (res.user.peran === "superadmin") {
        router.push("/admin");
      } else if (res.user.peran === "kasir") {
        router.push("/kasir");
      } else {
        router.push("/owner");
      }
    } catch (error: any) {
      const msg = error?.message || "Email atau kata sandi tidak sesuai.";
      setAuthError(msg);
      if (
        error?.status === 403 &&
        (msg.toLowerCase().includes("belum dikonfirmasi") ||
          msg.toLowerCase().includes("verifikasi"))
      ) {
        setNeedsVerification(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg relative flex items-center justify-center p-5 overflow-hidden">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-tertiary border-2 border-border opacity-35 pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-emerald-500 border-2 border-border opacity-15 pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        <div className="bg-card border-2 border-fg rounded-xl p-6 sm:p-9 shadow-pop-lg">
          {/* Brand */}
          <div className="flex items-center gap-2.5 justify-center mb-6">
            <div className="w-10 h-10 bg-accent rounded-md border-2 border-fg flex items-center justify-center font-heading font-extrabold text-lg text-white shadow-[3px_3px_0px_#1E293B]">T</div>
            <span className="font-heading text-[22px] font-extrabold">Tokiva</span>
          </div>

          <h1 className="font-heading text-xl font-extrabold text-center mb-1">Masuk ke Akun Anda</h1>
          <p className="text-[13px] text-muted-fg text-center mb-6">Kelola operasional toko dan transaksi penjualan Anda.</p>

          {authError && (
            <div className="mb-4 p-3 rounded-md border-2 border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
              {needsVerification && email.trim() && (
                <Link
                  href={`/auth/verify-email?email=${encodeURIComponent(email.trim())}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border-2 border-fg text-fg font-heading font-bold text-[11px] hover:bg-muted"
                >
                  <MailCheck className="w-3.5 h-3.5 text-accent" />
                  <span>Verifikasi / Kirim Ulang Kode Email</span>
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-heading text-[11px] font-bold uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); setAuthError(""); setNeedsVerification(false); }}
                placeholder="nama@toko.com"
                className={`w-full px-3.5 py-2.5 border-2 rounded-md text-sm font-body bg-card text-fg outline-none transition-all ${errors.email ? "border-red-500" : "border-border focus:border-accent focus:shadow-[3px_3px_0px_#0CAF60]"}`}
              />
              {errors.email && <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block font-heading text-[11px] font-bold uppercase tracking-wider mb-1.5">Kata Sandi</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pass}
                  onChange={e => { setPass(e.target.value); setErrors(p => ({ ...p, pass: "" })); setAuthError(""); }}
                  placeholder="Masukkan kata sandi"
                  className={`w-full px-3.5 py-2.5 pr-10 border-2 rounded-md text-sm font-body bg-card text-fg outline-none transition-all ${errors.pass ? "border-red-500" : "border-border focus:border-accent focus:shadow-[3px_3px_0px_#0CAF60]"}`}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-fg cursor-pointer">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.pass && <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.pass}</p>}
            </div>

            <div className="flex items-center justify-between text-[13px]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="w-4 h-4 accent-accent"
                />{" "}
                Ingat email saya
              </label>
              <Link href="/auth/forgot-password" className="text-accent font-semibold hover:underline">Lupa kata sandi?</Link>
            </div>

            <Button type="submit" className="w-full justify-center py-3 text-[15px]" disabled={loading}>
              {loading ? "Memproses..." : <><span>Masuk</span><ArrowRight className="w-4 h-4" /></>}
            </Button>
          </form>

          {IS_DEMO_LOGIN_ENABLED && (
            <DemoQuickLogin
              filterRoles={["owner", "kasir1"]}
              onFillCredentials={(e, p) => {
                setEmail(e);
                setPass(p);
                setErrors({});
                setAuthError("");
              }}
            />
          )}

          <p className="text-center mt-5 text-[13px] text-muted-fg">
            Belum memiliki akun toko? <Link href="/auth/register" className="text-accent font-semibold hover:underline">Daftarkan Toko</Link>
          </p>
        </div>

        <p className="text-center mt-3.5 text-xs text-muted-fg">
          Administrator platform? <Link href="/auth/admin" className="text-admin font-semibold hover:underline inline-flex items-center gap-1"><Shield className="w-3 h-3" /> Masuk sebagai Admin</Link>
        </p>
      </div>
    </div>
  );
}
