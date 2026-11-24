"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Eye, EyeOff, ArrowLeft, AlertCircle } from "lucide-react";
import { DemoQuickLogin, IS_DEMO_LOGIN_ENABLED } from "@/components/auth/demo-quick-login";
import { authService } from "@/lib/services/auth.service";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const { setSessionData } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const err: Record<string, string> = {};
    if (!email.trim() || !email.includes("@")) err.email = "Email administrator tidak valid";
    if (!pass) err.pass = "Kata sandi wajib diisi";
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    setLoading(true);
    try {
      const res = await authService.login(email.trim(), pass);
      if (res.user.peran !== "superadmin") {
        await authService.logout();
        setAuthError("Akun ini bukan Super Administrator platform.");
        return;
      }
      setSessionData(res.user, res.toko);
      toast.success(`Login Superadmin berhasil (${res.user.nama_lengkap})`);
      router.push("/admin");
    } catch (error: any) {
      setAuthError(error?.message || "Kredensial Super Admin tidak valid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg relative flex items-center justify-center p-5 overflow-hidden">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-purple-400 border-2 border-border opacity-20 pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-pink-400 border-2 border-border opacity-15 pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        <div className="bg-card border-2 border-fg rounded-xl p-6 sm:p-9 shadow-pop-lg">
          <div className="flex items-center gap-2.5 justify-center mb-4">
            <div className="w-10 h-10 bg-admin rounded-md border-2 border-fg flex items-center justify-center font-heading font-extrabold text-lg text-white shadow-[3px_3px_0px_#1E293B]">T</div>
            <span className="font-heading text-[22px] font-extrabold">Tokiva</span>
          </div>

          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-purple-100 border-2 border-admin font-heading text-[11px] font-bold text-admin">
              <Shield className="w-3.5 h-3.5" /> Portal Administrasi Platform
            </span>
          </div>

          <h1 className="font-heading text-xl font-extrabold text-center mb-1">Masuk sebagai Administrator</h1>
          <p className="text-[13px] text-muted-fg text-center mb-5">Halaman ini khusus untuk pengelola platform Tokiva.</p>

          {authError && (
            <div className="mb-4 p-3 rounded-md border-2 border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-heading text-[11px] font-bold uppercase tracking-wider mb-1.5">Email Administrator</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); setAuthError(""); }}
                placeholder="admin@domain.com"
                className={`w-full px-3.5 py-2.5 border-2 rounded-md text-sm bg-card text-fg outline-none transition-all ${errors.email ? "border-red-500" : "border-border focus:border-admin focus:shadow-[3px_3px_0px_#7C3AED]"}`}
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
                  className={`w-full px-3.5 py-2.5 pr-10 border-2 rounded-md text-sm bg-card text-fg outline-none transition-all ${errors.pass ? "border-red-500" : "border-border focus:border-admin focus:shadow-[3px_3px_0px_#7C3AED]"}`}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-fg cursor-pointer">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.pass && <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.pass}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-admin text-white border-2 border-fg font-heading text-sm font-bold shadow-pop hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-active transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Memverifikasi..." : <><Shield className="w-4 h-4" /> Masuk ke Panel Admin</>}
            </button>
          </form>

          {IS_DEMO_LOGIN_ENABLED && (
            <DemoQuickLogin
              filterRoles={["admin"]}
              onFillCredentials={(e, p) => {
                setEmail(e);
                setPass(p);
                setErrors({});
                setAuthError("");
              }}
            />
          )}

          <div className="mt-5 p-3 rounded-md bg-muted border border-border text-[11px] text-muted-fg text-center leading-relaxed">
            Akses ke halaman ini diawasi dan tercatat dalam log keamanan sistem. Hanya personel yang berwenang yang diperkenankan masuk.
          </div>
        </div>

        <p className="text-center mt-3.5 text-xs text-muted-fg">
          <Link href="/auth/login" className="text-accent font-semibold hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Kembali ke halaman masuk pengguna</Link>
        </p>
      </div>
    </div>
  );
}
