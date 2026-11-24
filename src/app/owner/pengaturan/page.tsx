"use client";

import { useState, useEffect, useCallback } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SectionCard } from "@/components/ui/section-card";
import { compressImageFileToBase64 } from "@/lib/utils/image";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/components/auth/auth-provider";
import { tokoService } from "@/lib/services/toko.service";
import { authService } from "@/lib/services/auth.service";
import { posService } from "@/lib/services/pos.service";
import { BarcodeScannerModal } from "@/components/shared/barcode-scanner-modal";
import {
  Store,
  ReceiptText,
  QrCode,
  Shield,
  Save,
  Upload,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function PengaturanPage() {
  const { toast } = useToast();
  const { refreshSession } = useAuth();

  const [section, setSection] = useState<"info" | "struk" | "qris" | "keamanan">("info");
  const [saving, setSaving] = useState(false);
  const [qrisDeleteConfirmOpen, setQrisDeleteConfirmOpen] = useState(false);

  const [infoForm, setInfoForm] = useState({
    nama: "",
    pemilik: "",
    telepon: "",
    kota: "",
    alamat: "",
    logo_url: "",
  });

  const [strukForm, setStrukForm] = useState({
    struk_header: "",
    struk_footer: "",
    lebar_kertas: "58mm" as "58mm" | "80mm",
  });

  // QRIS State
  const [qrisStatusData, setQrisStatusData] = useState<any>(null);
  const [qrisStringInput, setQrisStringInput] = useState("");
  const [qrisFotoUrl, setQrisFotoUrl] = useState("");
  const [isScanQrisModalOpen, setIsScanQrisModalOpen] = useState(false);
  const [testSimulasiModalOpen, setTestSimulasiModalOpen] = useState(false);
  const [simulasiQrData, setSimulasiQrData] = useState<any>(null);
  const [loadingSimulasi, setLoadingSimulasi] = useState(false);

  const [pwForm, setPwForm] = useState({
    password_lama: "",
    password_baru: "",
    konfirmasi: "",
  });

  const loadData = useCallback(() => {
    tokoService
      .getProfilToko()
      .then((t) => {
        setInfoForm({
          nama: t.nama || "",
          pemilik: t.pemilik || "",
          telepon: t.telepon || "",
          kota: t.kota || "",
          alamat: t.alamat || "",
          logo_url: t.logo_url || "",
        });
        setStrukForm({
          struk_header: t.struk_header || "",
          struk_footer: t.struk_footer || "Terima kasih telah berbelanja!",
          lebar_kertas: (t.lebar_kertas as "58mm" | "80mm") || "58mm",
        });
        setQrisFotoUrl(t.qris_foto_url || t.qris_url || "");
      })
      .catch(() => {});

    tokoService
      .getQrisStatus()
      .then((res) => {
        setQrisStatusData(res);
        setQrisStringInput(res.qris_string || "");
        if (res.qris_foto_url) setQrisFotoUrl(res.qris_foto_url);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await tokoService.updateProfilToko(infoForm);
      await refreshSession();
      toast.success("Informasi profil toko berhasil disimpan!");
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan profil toko");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStruk = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await tokoService.updateStruk(strukForm);
      await refreshSession();
      toast.success("Pengaturan struk thermal berhasil disimpan!");
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan pengaturan struk");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQris = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleanString = qrisStringInput.trim();
      await tokoService.updateQRIS({
        qris_string: cleanString || undefined,
        qris_foto_url: qrisFotoUrl || undefined,
      });
      await refreshSession();
      loadData();
      toast.success("Pengaturan QRIS berhasil diverifikasi dan disimpan!");
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan pengaturan QRIS");
    } finally {
      setSaving(false);
    }
  };

  const handleHapusQris = () => {
    setQrisDeleteConfirmOpen(true);
  };

  const executeHapusQris = async () => {
    setSaving(true);
    try {
      await tokoService.updateQRIS({
        qris_string: "",
        qris_foto_url: "",
        qris_mid: "",
      });
      setQrisStringInput("");
      setQrisFotoUrl("");
      setQrisDeleteConfirmOpen(false);
      await refreshSession();
      loadData();
      toast.success("QRIS toko berhasil dihapus.");
    } catch (err: any) {
      toast.error(err?.message || "Gagal menghapus QRIS");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadQrisImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const base64 = await compressImageFileToBase64(file, { maxDim: 1024, quality: 0.92 });
      const res = await tokoService.uploadMedia(
        {
          file_base64: base64,
          kategori: "qris",
          nama_file: file.name,
        },
        "owner"
      );
      setQrisFotoUrl(res.url);

      // Dekode otomatis QR Code dari gambar menggunakan ZXing di browser
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const codeReader = new BrowserMultiFormatReader();
        const decodeRes = await codeReader.decodeFromImageUrl(base64);
        const rawText = decodeRes.getText()?.trim();
        if (rawText && rawText.startsWith("000201")) {
          setQrisStringInput(rawText);
          toast.success("Payload QRIS EMVCo berhasil diekstrak otomatis dari gambar!");
        }
      } catch {
        // Bila gambar tidak terbaca otomatis oleh barcode reader
        toast.info("Gambar berhasil diunggah. Pastikan gambar jelas atau pindai dengan kamera jika perlu.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengunggah gambar QRIS");
    }
  };

  const handleSimulasiQrisDinamis = async () => {
    setLoadingSimulasi(true);
    try {
      const data = await posService.generateDynamicQris(15000);
      setSimulasiQrData(data);
      setTestSimulasiModalOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Gagal menguji konversi QRIS dinamis. Pastikan QRIS statis sudah disimpan.");
    } finally {
      setLoadingSimulasi(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwForm.password_lama.trim()) {
      toast.error("Kata sandi saat ini wajib diisi");
      return;
    }
    if (pwForm.password_baru.length < 6) {
      toast.error("Kata sandi baru minimal 6 karakter");
      return;
    }
    if (pwForm.password_baru !== pwForm.konfirmasi) {
      toast.error("Konfirmasi kata sandi tidak cocok");
      return;
    }
    setSaving(true);
    try {
      await authService.updatePassword({
        password_lama: pwForm.password_lama,
        password_baru: pwForm.password_baru,
      });
      setPwForm({ password_lama: "", password_baru: "", konfirmasi: "" });
      toast.success("Kata sandi akun Owner berhasil diperbarui!");
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengubah kata sandi");
    } finally {
      setSaving(false);
    }
  };

  const isQrisActive = Boolean(qrisStatusData?.qris_aktif && qrisStatusData?.qris_status === "valid");

  return (
    <OwnerLayout
      title="Pengaturan Toko"
      desc="Kelola identitas toko, format cetak struk thermal, konversi QRIS dinamis, dan keamanan akun."
    >
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { id: "info", label: "Informasi Toko", icon: Store },
          { id: "struk", label: "Struk Thermal", icon: ReceiptText },
          { id: "qris", label: "Pembayaran QRIS", icon: QrCode },
          { id: "keamanan", label: "Keamanan Akun", icon: Shield },
        ].map((nav) => {
          const Icon = nav.icon;
          const active = section === nav.id;
          return (
            <button
              key={nav.id}
              onClick={() => setSection(nav.id as any)}
              className={`px-4 py-2 rounded-full text-xs font-heading font-bold flex items-center gap-1.5 border-2 cursor-pointer transition-all ${
                active
                  ? "bg-accent text-white border-fg shadow-[2px_2px_0px_#1E293B]"
                  : "bg-card border-border text-muted-fg hover:text-fg"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{nav.label}</span>
            </button>
          );
        })}
      </div>

      {section === "info" && (
        <SectionCard title="Profil & Identitas Toko">
          <form onSubmit={handleSaveInfo} className="space-y-3 text-xs max-w-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">Nama Toko *</label>
                <input
                  required
                  value={infoForm.nama}
                  onChange={(e) => setInfoForm((p) => ({ ...p, nama: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-border rounded bg-card"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Nama Pemilik</label>
                <input
                  value={infoForm.pemilik}
                  onChange={(e) => setInfoForm((p) => ({ ...p, pemilik: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-border rounded bg-card"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Nomor Telepon Toko</label>
                <input
                  value={infoForm.telepon}
                  onChange={(e) => setInfoForm((p) => ({ ...p, telepon: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-border rounded bg-card"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Kota / Kabupaten</label>
                <input
                  value={infoForm.kota}
                  onChange={(e) => setInfoForm((p) => ({ ...p, kota: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-border rounded bg-card"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-bold block mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  value={infoForm.alamat}
                  onChange={(e) => setInfoForm((p) => ({ ...p, alamat: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-border rounded bg-card"
                />
              </div>
            </div>
            <Button type="submit" icon={Save} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Informasi Toko"}
            </Button>
          </form>
        </SectionCard>
      )}

      {section === "struk" && (
        <SectionCard title="Format Cetak Struk Thermal (58mm / 80mm)">
          <form onSubmit={handleSaveStruk} className="space-y-3 text-xs max-w-xl">
            <div>
              <label className="font-bold block mb-1">Ukuran Kertas Printer Thermal</label>
              <select
                value={strukForm.lebar_kertas}
                onChange={(e) =>
                  setStrukForm((p) => ({ ...p, lebar_kertas: e.target.value as any }))
                }
                className="w-full px-3 py-2 border-2 border-border rounded bg-card"
              >
                <option value="58mm">58 mm (Standar Mini Thermal)</option>
                <option value="80mm">80 mm (Lebar Kasir Desktop)</option>
              </select>
            </div>
            <div>
              <label className="font-bold block mb-1">Sub-Judul (Header) Struk</label>
              <input
                value={strukForm.struk_header}
                onChange={(e) =>
                  setStrukForm((p) => ({ ...p, struk_header: e.target.value }))
                }
                placeholder="Contoh: Sedia Sembako & Kebutuhan Harian"
                className="w-full px-3 py-2 border-2 border-border rounded bg-card"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">Pesan Kaki (Footer) Struk</label>
              <textarea
                rows={2}
                value={strukForm.struk_footer}
                onChange={(e) =>
                  setStrukForm((p) => ({ ...p, struk_footer: e.target.value }))
                }
                className="w-full px-3 py-2 border-2 border-border rounded bg-card"
              />
            </div>
            <Button type="submit" icon={Save} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Pengaturan Struk"}
            </Button>
          </form>
        </SectionCard>
      )}

      {section === "qris" && (
        <div className="space-y-4 max-w-2xl">
          {/* Card Status Verifikasi QRIS EMVCo */}
          <SectionCard title="Status QRIS Dinamis Toko">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg border-2 border-fg bg-card shadow-pop-soft">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border-2 border-fg ${
                    isQrisActive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-fg">
                      {qrisStatusData?.merchant_name || infoForm.nama || "Belum Dikonfigurasi"}
                    </span>
                    <Badge variant={isQrisActive ? "green" : "yellow"}>
                      {isQrisActive ? "Aktif & Terverifikasi" : "Belum Aktif"}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-fg mt-0.5">
                    {isQrisActive
                      ? `Kota: ${qrisStatusData?.merchant_city || infoForm.kota || "-"} · MID: ${
                          qrisStatusData?.qris_mid || qrisStatusData?.qris_info?.merchant_id || "-"
                        }`
                      : "Unggah foto QRIS asli atau scan dengan kamera untuk mengaktifkan pembayaran otomatis."}
                  </div>
                </div>
              </div>

              {isQrisActive && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSimulasiQrisDinamis}
                    disabled={loadingSimulasi}
                    className="border-2 border-fg font-bold text-xs"
                    title="Uji coba konversi QRIS dinamis untuk nominal Rp15.000"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-accent mr-1" />
                    <span>{loadingSimulasi ? "Memproses..." : "Uji Coba Dinamis"}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleHapusQris}
                    disabled={saving}
                    className="border-2 border-red-500 text-red-600 hover:bg-red-50 font-bold text-xs"
                    title="Hapus QRIS toko"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Form Konfigurasi QRIS Statis */}
          <SectionCard title="Unggah / Pindai QRIS Statis Toko">
            <form onSubmit={handleSaveQris} className="space-y-3.5 text-xs">
              <p className="text-muted-fg leading-relaxed">
                Tokiva secara otomatis mengonversi kode QRIS statis toko Anda (BCA, Mandiri, BRI, BNI, GoPay, OVO, ShopeePay, DANA) menjadi <strong>QRIS Dinamis</strong> ber-nominal otomatis saat kasir memproses checkout tanpa potongan biaya pihak ketiga.
              </p>

              {/* Pilihan Input: Unggah Gambar atau Scan Kamera */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="p-3.5 border-2 border-dashed border-border hover:border-fg rounded-lg bg-muted/20 cursor-pointer flex flex-col items-center justify-center text-center gap-2 transition-colors">
                  <Upload className="w-6 h-6 text-accent" />
                  <div>
                    <span className="font-bold block text-fg">Pilih Berkas Foto QRIS</span>
                    <span className="text-[10px] text-muted-fg">PNG, JPG, atau tangkapan layar e-wallet</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadQrisImage}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setIsScanQrisModalOpen(true)}
                  className="p-3.5 border-2 border-dashed border-border hover:border-fg rounded-lg bg-muted/20 cursor-pointer flex flex-col items-center justify-center text-center gap-2 transition-colors"
                >
                  <Camera className="w-6 h-6 text-accent" />
                  <div>
                    <span className="font-bold block text-fg">Pindai Standee via Kamera</span>
                    <span className="text-[10px] text-muted-fg">Arahkan kamera ke stiker / akrilik QRIS</span>
                  </div>
                </button>
              </div>

              {/* Preview Gambar jika ada */}
              {qrisFotoUrl && (
                <div className="flex items-center gap-3 p-2.5 bg-card border-2 border-border rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrisFotoUrl}
                    alt="Preview QRIS"
                    className="w-16 h-16 object-contain border border-border rounded bg-white"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-fg block">Foto QRIS Terpilih</span>
                    <span className="text-[10px] text-muted-fg font-mono truncate block">
                      {qrisFotoUrl}
                    </span>
                  </div>
                </div>
              )}

              {/* Teks String QRIS EMVCo */}
              <div>
                <label className="font-bold block mb-1">
                  String Payload QRIS EMVCo (Otomatis terisi saat discan):
                </label>
                <textarea
                  rows={3}
                  value={qrisStringInput}
                  onChange={(e) => setQrisStringInput(e.target.value)}
                  placeholder="00020101021126... (Bisa ditempel langsung jika memiliki teks kode)"
                  className="w-full px-3 py-2 border-2 border-border rounded font-mono text-[11px] bg-card outline-none focus:border-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="submit" icon={Save} disabled={saving}>
                  {saving ? "Menyimpan & Memverifikasi..." : "Simpan & Aktifkan QRIS"}
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}

      {section === "keamanan" && (
        <SectionCard title="Ubah Kata Sandi Akun Owner">
          <form onSubmit={handleSavePassword} className="space-y-3 text-xs max-w-md">
            <div>
              <label className="font-bold block mb-1">Kata Sandi Saat Ini *</label>
              <input
                type="password"
                required
                value={pwForm.password_lama}
                onChange={(e) =>
                  setPwForm((p) => ({ ...p, password_lama: e.target.value }))
                }
                placeholder="Masukkan kata sandi saat ini"
                className="w-full px-3 py-2 border-2 border-border rounded bg-card"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">Kata Sandi Baru *</label>
              <input
                type="password"
                required
                value={pwForm.password_baru}
                onChange={(e) =>
                  setPwForm((p) => ({ ...p, password_baru: e.target.value }))
                }
                className="w-full px-3 py-2 border-2 border-border rounded bg-card"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">Konfirmasi Kata Sandi Baru *</label>
              <input
                type="password"
                required
                value={pwForm.konfirmasi}
                onChange={(e) => setPwForm((p) => ({ ...p, konfirmasi: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-border rounded bg-card"
              />
            </div>
            <Button type="submit" icon={Save} disabled={saving}>
              Perbarui Kata Sandi
            </Button>
          </form>
        </SectionCard>
      )}

      {/* Modal Pindai QRIS via Kamera */}
      <BarcodeScannerModal
        open={isScanQrisModalOpen}
        onClose={() => setIsScanQrisModalOpen(false)}
        onScan={(scanned) => {
          setQrisStringInput(scanned);
          toast.success("Payload QRIS berhasil dibaca dari kamera!");
        }}
      />

      {/* Modal Simulasi QRIS Dinamis */}
      {testSimulasiModalOpen && simulasiQrData && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setTestSimulasiModalOpen(false)}
        >
          <div
            className="bg-card border-2 border-fg rounded-xl shadow-pop p-5 max-w-sm w-full text-center space-y-3 font-body text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="font-bold text-sm font-heading flex items-center gap-1.5 text-accent">
                <Sparkles className="w-4 h-4" />
                Simulasi QRIS Dinamis
              </span>
              <button
                type="button"
                onClick={() => setTestSimulasiModalOpen(false)}
                className="font-bold text-muted-fg hover:text-fg"
              >
                ✕
              </button>
            </div>

            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-300 text-emerald-800 dark:text-emerald-200">
              <span className="font-bold block text-sm">Rp15.000</span>
              <span className="text-[10px]">Nominal Transaksi Pas (Terkunci)</span>
            </div>

            <div className="p-3 bg-white border-2 border-slate-900 rounded-lg inline-block shadow-sm mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={simulasiQrData.qr_image}
                alt="QRIS Dinamis"
                className="w-48 h-48 object-contain"
              />
            </div>

            <div className="text-[11px] font-mono text-muted-fg space-y-0.5">
              <div className="font-bold text-fg">{simulasiQrData.merchant_name}</div>
              <div>{simulasiQrData.merchant_city || "Indonesia"} · Ref: {simulasiQrData.ref_id}</div>
            </div>

            <p className="text-[10px] text-muted-fg italic">
              Jika dipindai menggunakan BCA, Mandiri, GoPay, OVO, ShopeePay, atau DANA, nominal Rp15.000 otomatis terisi tanpa perlu diketik pembeli!
            </p>

            <Button
              className="w-full mt-2 font-bold"
              size="sm"
              onClick={() => setTestSimulasiModalOpen(false)}
            >
              Tutup Simulasi
            </Button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={qrisDeleteConfirmOpen}
        onClose={() => setQrisDeleteConfirmOpen(false)}
        onConfirm={executeHapusQris}
        loading={saving}
        title="Hapus Konfigurasi QRIS?"
        message="Apakah Anda yakin ingin menghapus konfigurasi QRIS toko ini? Transaksi POS tidak akan dapat menggunakan QRIS dinamis."
        confirmText="Ya, Hapus QRIS"
        variant="danger"
      />
    </OwnerLayout>
  );
}
