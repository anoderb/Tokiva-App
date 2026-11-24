"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ArrowRight, ArrowLeft, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/lib/services/auth.service";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";

export default function RegisterPage() {
  const router = useRouter();
  const { setSessionData } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", pass: "", confirmPw: "",
    storeName: "", city: "", address: "", agree: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nama wajib diisi";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "Email tidak valid";
    if (!form.phone.trim()) e.phone = "Nomor telepon wajib diisi";
    if (form.pass.length < 6) e.pass = "Minimal 6 karakter";
    if (form.pass !== form.confirmPw) e.confirmPw = "Kata sandi tidak cocok";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.storeName.trim()) e.storeName = "Nama toko wajib diisi";
    if (!form.city.trim()) e.city = "Kota wajib diisi";
    if (!form.address.trim()) e.address = "Alamat wajib diisi";
    if (!form.agree) e.agree = "Anda harus menyetujui ketentuan layanan";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validateStep1()) setStep(2); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const cleanEmail = form.email.trim();
      const res = await authService.register({
        nama_toko: form.storeName.trim(),
        nama_owner: form.name.trim(),
        email: cleanEmail,
        password: form.pass,
        telepon: form.phone.trim(),
        kota: form.city.trim(),
        alamat: form.address.trim(),
      });

      if (res.requires_verification || !res.token?.access_token) {
        toast.success(`Kode verifikasi telah dikirim ke ${cleanEmail}`);
        router.push(`/auth/verify-email?email=${encodeURIComponent(cleanEmail)}`);
        return;
      }

      if (res.user) {
        setSessionData(res.user, res.toko);
      }
      toast.success(`Toko "${res.toko?.nama}" berhasil didaftarkan!`);
      router.push("/owner");
    } catch (error: any) {
      setApiError(error?.message || "Gagal mendaftarkan toko. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = form.pass.length === 0 ? 0 : form.pass.length < 6 ? 1 : form.pass.length < 10 ? 2 : 3;
  const pwColors = ["", "bg-red-500", "bg-amber-400", "bg-emerald-500"];
  const pwLabels = ["", "Lemah", "Sedang", "Kuat"];

  const set = (key: string, val: string | boolean) => {
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: "" }));
    setApiError("");
  };

  return (
    <div className="min-h-screen bg-bg relative flex items-center justify-center p-5 overflow-hidden">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-tertiary border-2 border-border opacity-35 pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-emerald-500 border-2 border-border opacity-15 pointer-events-none" />

      <div className="w-full max-w-[480px] relative z-10">
        <div className="bg-card border-2 border-fg rounded-xl p-6 sm:p-9 shadow-pop-lg">
          <div className="flex items-center gap-2.5 justify-center mb-5">
            <div className="w-10 h-10 bg-accent rounded-md border-2 border-fg flex items-center justify-center font-heading font-extrabold text-lg text-white shadow-[3px_3px_0px_#1E293B]">T</div>
            <span className="font-heading text-[22px] font-extrabold">Tokiva</span>
          </div>

          <h1 className="font-heading text-xl font-extrabold text-center mb-1">Daftarkan Toko Anda</h1>
          <p className="text-[13px] text-muted-fg text-center mb-5">Buat akun pemilik toko dan verifikasi email Anda untuk mulai berjualan.</p>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-7 h-7 rounded-full border-2 border-fg flex items-center justify-center font-heading text-xs font-bold ${step === 1 ? "bg-accent text-white shadow-[2px_2px_0px_#1E293B]" : "bg-tertiary text-fg"}`}>
              {step > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
            </div>
            <div className={`w-10 h-0.5 ${step > 1 ? "bg-fg" : "bg-border"}`} />
            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-heading text-xs font-bold ${step === 2 ? "bg-accent text-white border-fg shadow-[2px_2px_0px_#1E293B]" : "bg-muted text-muted-fg border-border"}`}>2</div>
          </div>

          {apiError && (
            <div className="mb-4 p-3 rounded-md border-2 border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-3.5">
              <div>
                <label className="block font-heading text-[11px] font-bold uppercase tracking-wider mb-1">Nama Lengkap *</label>
                <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nama pemilik toko" className={`w-full px-3.5 py-2.5 border-2 rounded-md text-sm bg-card text-fg outline-none ${errors.name ? "border-red-500" : "border-border focus:border-accent"}`} />
                {errors.name && <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-3">
                <div>
                  <label className="block font-heading text-[11px] font-bold uppercase tracking-wider mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="nama@email.com" className={`w-full px-3.5 py-2.5 border-2 rounded-md text-sm bg-card text-fg outline-none ${errors.email ? "border-red-500" : "border-border focus:border-accent"}`} />
                  {errors.email && <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block font-heading text-[11px] font-bold uppercase tracking-wider mb-1">No. Telepon *</label>
                  <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="08xxxxxxxxxx" className={`w-full px-3.5 py-2.5 border-2 rounded-md text-sm bg-card text-fg outline-none ${errors.phone ? "border-red-500" : "border-border focus:border-accent"}`} />
                  {errors.phone && <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.phone}</p>}
                </div>
              </div>
              <div>
                <label className="block font-heading text-[11px] font-bold uppercase tracking-wider mb-1">Kata Sandi *</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={form.pass} onChange={e => set("pass", e.target.value)} placeholder="Minimal 6 karakter" className={`w-full px-3.5 py-2.5 pr-10 border-2 rounded-md text-sm bg-card text-fg outline-none ${errors.pass ? "border-red-500" : "border-border focus:border-accent"}`} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg cursor-pointer">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
                {form.pass && (
                  <div className="mt-1.5">
                    <div className="flex gap-1">{[1, 2, 3].map(i => <div key={i} className={`flex-1 h-1 rounded ${i <= pwStrength ? pwColors[pwStrength] : "bg-border"}`} />)}</div>
                    <p className="text-[11px] text-muted-fg mt-0.5">Kekuatan: {pwLabels[pwStrength]}</p>
                  </div>
                )}
                {errors.pass && <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.pass}</p>}
              </div>
              <div>
                <label className="block font-heading text-[11px] font-bold uppercase tracking-wider mb-1">Konfirmasi Kata Sandi *</label>
                <input type="password" value={form.confirmPw} onChange={e => set("confirmPw", e.target.value)} placeholder="Ulangi kata sandi" className={`w-full px-3.5 py-2.5 border-2 rounded-md text-sm bg-card text-fg outline-none ${errors.confirmPw ? "border-red-500" : "border-border focus:border-accent"}`} />
                {errors.confirmPw && <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.confirmPw}</p>}
              </div>
              <Button type="button" onClick={handleNext} className="w-full justify-center py-3 text-[15px]">
                Lanjutkan ke Data Toko <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block font-heading text-[11px] font-bold uppercase tracking-wider mb-1">Nama Toko *</label>
                <input value={form.storeName} onChange={e => set("storeName", e.target.value)} placeholder="Contoh: Toko Kelontong Berkah" className={`w-full px-3.5 py-2.5 border-2 rounded-md text-sm bg-card text-fg outline-none ${errors.storeName ? "border-red-500" : "border-border focus:border-accent"}`} />
                {errors.storeName && <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.storeName}</p>}
              </div>
              <div>
                <label className="block font-heading text-[11px] font-bold uppercase tracking-wider mb-1">Kota / Kabupaten *</label>
                <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Contoh: Pekalongan" className={`w-full px-3.5 py-2.5 border-2 rounded-md text-sm bg-card text-fg outline-none ${errors.city ? "border-red-500" : "border-border focus:border-accent"}`} />
                {errors.city && <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.city}</p>}
              </div>
              <div>
                <label className="block font-heading text-[11px] font-bold uppercase tracking-wider mb-1">Alamat Toko *</label>
                <textarea value={form.address} onChange={e => set("address", e.target.value)} rows={2} placeholder="Alamat lengkap toko" className={`w-full px-3.5 py-2 border-2 rounded-md text-sm bg-card text-fg outline-none resize-y ${errors.address ? "border-red-500" : "border-border focus:border-accent"}`} />
                {errors.address && <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.address}</p>}
              </div>
              <div>
                <label className="flex items-start gap-2 text-xs text-muted-fg cursor-pointer leading-relaxed">
                  <input type="checkbox" checked={form.agree} onChange={e => set("agree", e.target.checked)} className="w-4 h-4 accent-accent mt-0.5 shrink-0" />
                  <span>Saya menyetujui Ketentuan Layanan dan Kebijakan Privasi Tokiva.</span>
                </label>
                {errors.agree && <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.agree}</p>}
              </div>
              <div className="flex gap-2.5">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 justify-center"><ArrowLeft className="w-4 h-4" /> Kembali</Button>
                <Button type="submit" disabled={loading} className="flex-[2] justify-center py-3 text-[15px]">
                  {loading ? "Mendaftarkan..." : <><Check className="w-4 h-4" /> Daftarkan Toko</>}
                </Button>
              </div>
            </form>
          )}

          <p className="text-center mt-5 text-[13px] text-muted-fg">
            Sudah memiliki akun? <Link href="/auth/login" className="text-accent font-semibold hover:underline">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
