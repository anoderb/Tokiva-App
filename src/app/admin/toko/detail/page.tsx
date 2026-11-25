"use client";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Package,
  ReceiptText,
  Clock,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { adminService } from "@/lib/services/admin.service";
import type { Pengguna, Toko } from "@/types/api";
import { formatDate, formatDateTime, formatNumber, formatRupiah, getInitials } from "@/lib/format";

function AdminTokoDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const routeId =
    (typeof params?.id === "string" ? params.id : null) ||
    searchParams.get("id") ||
    "";

  const [toko, setToko] = useState<Toko | null>(null);
  const [penggunaList, setPenggunaList] = useState<Pengguna[]>([]);
  const [statistik, setStatistik] = useState({
    jml_pengguna: 0,
    jml_produk: 0,
    jml_transaksi: 0,
    total_gmv: 0,
  });
  const [transaksiTerbaru, setTransaksiTerbaru] = useState<any[]>([]);
  const [shiftTerbaru, setShiftTerbaru] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<"ringkasan" | "info" | "pengguna" | "aktivitas">(
    "ringkasan"
  );
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [reactivateModalOpen, setReactivateModalOpen] = useState(false);
  const [searchUser, setSearchUser] = useState("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      let targetId = routeId;
      if (!targetId) {
        const listRes = await adminService.getTokoList({ limit: 1 });
        if (listRes.items?.length) {
          targetId = listRes.items[0].id;
        }
      }
      if (!targetId) {
        setLoading(false);
        return;
      }
      const res = await adminService.getDetailToko(targetId);
      setToko(res.toko);
      setPenggunaList(res.pengguna || []);
      setStatistik(
        res.statistik || {
          jml_pengguna: 0,
          jml_produk: 0,
          jml_transaksi: 0,
          total_gmv: 0,
        }
      );
      setTransaksiTerbaru(res.transaksi_terbaru || []);
      setShiftTerbaru(res.shift_terbaru || []);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat detail toko.");
    } finally {
      setLoading(false);
    }
  }, [routeId, toast]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleUpdateStatus = async (status: "aktif" | "ditangguhkan") => {
    if (!toko) return;
    setSubmitting(true);
    try {
      await adminService.updateStatusToko(toko.id, status);
      toast.success(
        status === "aktif"
          ? `Toko "${toko.nama}" berhasil diaktifkan kembali.`
          : `Toko "${toko.nama}" telah ditangguhkan.`
      );
      setSuspendModalOpen(false);
      setReactivateModalOpen(false);
      loadDetail();
    } catch (err: any) {
      toast.error(err?.message || "Gagal memperbarui status toko.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = penggunaList.filter((u) => {
    const displayName = (u.nama_lengkap || u.nama || "").toLowerCase();
    const q = searchUser.toLowerCase();
    return displayName.includes(q) || u.email.toLowerCase().includes(q);
  });

  const isSuspended = toko?.status && toko.status !== "aktif";

  return (
    <AdminLayout
      title={toko ? `${toko.nama} — Detail Toko` : "Detail Toko"}
      breadcrumb={`Panel Admin / Manajemen Toko / ${toko?.nama || "Detail"}`}
    >
      {/* Back Button */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/admin/toko">
          <Button size="sm" variant="outline" icon={ArrowLeft}>
            Kembali ke Daftar Toko
          </Button>
        </Link>
        <Button size="sm" variant="outline" icon={RefreshCw} onClick={loadDetail} disabled={loading}>
          Refresh
        </Button>
      </div>

      {!toko && !loading ? (
        <SectionCard title="Toko Tidak Ditemukan" desc="Data tenant tidak tersedia.">
          <p className="text-xs text-muted-fg py-4">Silakan kembali ke daftar toko.</p>
        </SectionCard>
      ) : (
        <>
          {/* Suspended Banner */}
          {isSuspended && (
            <div className="bg-red-50 border-2 border-red-600 rounded-md p-3.5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-red-900">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="font-bold">Toko ini sedang nonaktif / ditangguhkan.</strong>{" "}
                  Seluruh akses pengguna pada tenant ini diblokir hingga diaktifkan kembali.
                </div>
              </div>
              <Button
                size="sm"
                icon={CheckCircle2}
                onClick={() => setReactivateModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              >
                Aktifkan Kembali
              </Button>
            </div>
          )}

          {/* Store Header Card */}
          <div className="bg-card border-2 border-fg rounded-md p-4 sm:p-5 shadow-pop-soft mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-md border-2 border-fg bg-purple-100 text-admin flex items-center justify-center font-heading font-bold text-xl shrink-0 shadow-[2px_2px_0px_#1E293B]">
                {toko ? getInitials(toko.nama) : "TK"}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-base sm:text-lg font-bold">
                    {toko?.nama || "Memuat..."}
                  </h2>
                  <Badge variant={toko?.status === "aktif" ? "green" : toko?.status === "ditangguhkan" ? "red" : "gray"}>
                    {toko?.status === "aktif" ? "Aktif" : toko?.status === "ditangguhkan" ? "Ditangguhkan" : "Nonaktif"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-fg mt-0.5">
                  Kode: <strong>{toko?.kode || toko?.kode_toko || "-"}</strong> · Pemilik:{" "}
                  <strong>{toko?.pemilik || toko?.nama_pemilik || "-"}</strong> · Terdaftar:{" "}
                  {formatDate(toko?.dibuat_pada)}
                </p>
              </div>
            </div>

            <div>
              {!isSuspended ? (
                <Button
                  size="sm"
                  variant="danger"
                  icon={XCircle}
                  onClick={() => setSuspendModalOpen(true)}
                >
                  Tangguhkan Toko
                </Button>
              ) : (
                <Button
                  size="sm"
                  icon={CheckCircle2}
                  onClick={() => setReactivateModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Aktifkan Kembali
                </Button>
              )}
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-5">
            <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm border-2 border-fg bg-sky-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
                <Users className="w-5 h-5 text-sky-700" />
              </div>
              <div>
                <div className="font-heading text-xl font-bold">
                  {formatNumber(statistik.jml_pengguna)}
                </div>
                <div className="text-[11px] font-semibold">Pengguna</div>
              </div>
            </div>

            <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm border-2 border-fg bg-purple-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
                <Package className="w-5 h-5 text-admin" />
              </div>
              <div>
                <div className="font-heading text-xl font-bold">
                  {formatNumber(statistik.jml_produk)}
                </div>
                <div className="text-[11px] font-semibold">Produk Aktif</div>
              </div>
            </div>

            <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm border-2 border-fg bg-amber-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
                <ReceiptText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="font-heading text-xl font-bold">
                  {formatNumber(statistik.jml_transaksi)}
                </div>
                <div className="text-[11px] font-semibold">Total Transaksi Selesai</div>
              </div>
            </div>

            <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm border-2 border-fg bg-emerald-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="font-heading text-sm sm:text-base font-bold">
                  {formatRupiah(statistik.total_gmv)}
                </div>
                <div className="text-[11px] font-semibold">Total GMV</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 overflow-x-auto border-b-2 border-fg mb-5">
            {[
              { id: "ringkasan", label: "Ringkasan" },
              { id: "info", label: "Informasi Toko" },
              { id: "pengguna", label: `Pengguna (${penggunaList.length})` },
              { id: "aktivitas", label: "Transaksi & Shift" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2.5 font-heading text-xs font-bold border-b-[3px] -mb-[2px] transition-all whitespace-nowrap cursor-pointer ${activeTab === t.id
                    ? "border-admin text-admin"
                    : "border-transparent text-muted-fg hover:text-fg"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: RINGKASAN */}
          {activeTab === "ringkasan" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              <SectionCard title="Transaksi Terbaru" desc="20 transaksi kasir terakhir pada toko ini.">
                <div className="overflow-x-auto border-2 border-fg rounded-md mt-2">
                  <table className="w-full min-w-[460px] text-xs">
                    <thead>
                      <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                        <th className="p-2.5">No. Struk</th>
                        <th className="p-2.5">Waktu</th>
                        <th className="p-2.5">Metode</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transaksiTerbaru.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-muted-fg">
                            Belum ada transaksi.
                          </td>
                        </tr>
                      ) : (
                        transaksiTerbaru.slice(0, 10).map((trx) => (
                          <tr key={trx.id} className="border-b border-border">
                            <td className="p-2.5 font-mono font-bold">
                              {trx.nomor_faktur || trx.no_transaksi || trx.nomor_struk || "-"}
                            </td>
                            <td className="p-2.5 text-muted-fg">
                              {formatDateTime(trx.dibuat_pada || trx.tgl_transaksi)}
                            </td>
                            <td className="p-2.5 uppercase">{trx.metode_bayar || "-"}</td>
                            <td className="p-2.5 text-right font-bold">
                              {formatRupiah(trx.total ?? trx.total_akhir ?? 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <SectionCard title="Pengguna Terdaftar" desc="Daftar akun Owner & Kasir di toko ini.">
                <div className="space-y-2.5 mt-2">
                  {penggunaList.map((u) => {
                    const displayName = u.nama_lengkap || u.nama || "-";
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2.5 rounded-md border-2 border-border bg-muted"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full border-2 border-fg flex items-center justify-center font-heading font-bold text-xs bg-purple-100">
                            {getInitials(displayName)}
                          </div>
                          <div>
                            <div className="font-semibold text-xs">{displayName}</div>
                            <div className="text-[11px] text-muted-fg">
                              {u.peran.toUpperCase()} · {u.email}
                            </div>
                          </div>
                        </div>
                        <Badge variant={u.aktif ? "green" : "gray"}>
                          {u.aktif ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </div>
          )}

          {/* TAB 2: INFORMASI TOKO */}
          {activeTab === "info" && toko && (
            <SectionCard title="Profil & Identitas Toko" desc="Data lengkap tenant di database.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-xs">
                {[
                  { label: "ID Tenant", val: toko.id },
                  { label: "Kode Toko", val: toko.kode || toko.kode_toko || "-" },
                  { label: "Nama Toko", val: toko.nama },
                  { label: "Nama Pemilik", val: toko.pemilik || toko.nama_pemilik || "-" },
                  { label: "Nomor Telepon", val: toko.telepon || "-" },
                  { label: "Kota / Kabupaten", val: toko.kota || "-" },
                  { label: "Alamat Lengkap", val: toko.alamat || "-" },
                  { label: "Tanggal Pendaftaran", val: formatDateTime(toko.dibuat_pada) },
                ].map((f, i) => (
                  <div key={i} className="p-2.5 rounded bg-muted border border-border">
                    <div className="text-[10px] text-muted-fg uppercase">{f.label}</div>
                    <div className="font-semibold mt-0.5">{f.val}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* TAB 3: PENGGUNA */}
          {activeTab === "pengguna" && (
            <SectionCard title="Daftar Pengguna Toko" desc="Akun Owner dan Staf Kasir pada tenant ini.">
              <div className="relative max-w-xs mb-3 mt-2">
                <Search className="w-4 h-4 text-muted-fg absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Cari nama atau email..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-md border-2 border-fg bg-card text-xs"
                />
              </div>

              <div className="overflow-x-auto border-2 border-fg rounded-md">
                <table className="w-full min-w-[560px] text-[13px]">
                  <thead>
                    <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                      <th className="p-2.5">Nama</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5">Peran</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Login Terakhir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const lastLogin = u.login_terakhir || u.terakhir_login;
                      return (
                        <tr key={u.id} className="border-b border-border hover:bg-muted/50">
                          <td className="p-2.5 font-semibold">{u.nama_lengkap || u.nama || "-"}</td>
                          <td className="p-2.5 text-xs">{u.email}</td>
                          <td className="p-2.5">
                            <Badge variant={u.peran === "owner" ? "purple" : "blue"}>
                              {u.peran.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-2.5">
                            <Badge variant={u.aktif ? "green" : "gray"}>
                              {u.aktif ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-xs text-muted-fg">
                            {lastLogin ? formatDateTime(lastLogin) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* TAB 4: AKTIVITAS TRANSAKSI & SHIFT */}
          {activeTab === "aktivitas" && (
            <div className="space-y-5">
              <SectionCard title="Riwayat Transaksi Terbaru" desc="20 transaksi kasir terbaru pada toko ini.">
                <div className="overflow-x-auto border-2 border-fg rounded-md mt-2">
                  <table className="w-full min-w-[460px] text-xs">
                    <thead>
                      <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                        <th className="p-2.5">No. Struk</th>
                        <th className="p-2.5">Waktu</th>
                        <th className="p-2.5">Metode</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transaksiTerbaru.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-fg">
                            Belum ada riwayat transaksi.
                          </td>
                        </tr>
                      ) : (
                        transaksiTerbaru.map((trx) => (
                          <tr key={trx.id} className="border-b border-border">
                            <td className="p-2.5 font-mono font-bold">
                              {trx.nomor_faktur || trx.no_transaksi || "-"}
                            </td>
                            <td className="p-2.5 text-muted-fg">
                              {formatDateTime(trx.dibuat_pada || trx.tgl_transaksi)}
                            </td>
                            <td className="p-2.5 uppercase">{trx.metode_bayar || "-"}</td>
                            <td className="p-2.5">
                              <Badge variant={trx.status === "selesai" ? "green" : "red"}>
                                {trx.status}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-right font-bold">
                              {formatRupiah(trx.total ?? 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <SectionCard title="Riwayat Shift Kasir" desc="Catatan buka/tutup shift terbaru di toko ini.">
                <div className="overflow-x-auto border-2 border-fg rounded-md mt-2">
                  <table className="w-full min-w-[460px] text-xs">
                    <thead>
                      <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                        <th className="p-2.5">Waktu Buka</th>
                        <th className="p-2.5">Waktu Tutup</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right">Modal Awal</th>
                        <th className="p-2.5 text-right">Kas Aktual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shiftTerbaru.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-fg">
                            Belum ada riwayat shift kasir.
                          </td>
                        </tr>
                      ) : (
                        shiftTerbaru.map((sh) => (
                          <tr key={sh.id} className="border-b border-border">
                            <td className="p-2.5">{formatDateTime(sh.waktu_buka)}</td>
                            <td className="p-2.5">
                              {sh.waktu_tutup ? formatDateTime(sh.waktu_tutup) : "-"}
                            </td>
                            <td className="p-2.5">
                              <Badge variant={sh.status === "terbuka" ? "green" : "gray"}>
                                {sh.status}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-right">{formatRupiah(sh.modal_awal ?? 0)}</td>
                            <td className="p-2.5 text-right">
                              {sh.kas_aktual != null ? formatRupiah(sh.kas_aktual) : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>
          )}

          {/* Suspend Modal */}
          <Modal
            open={suspendModalOpen}
            onClose={() => setSuspendModalOpen(false)}
            title={`Tangguhkan ${toko?.nama}?`}
            footer={
              <>
                <Button variant="outline" onClick={() => setSuspendModalOpen(false)}>
                  Batal
                </Button>
                <Button
                  variant="danger"
                  disabled={submitting}
                  onClick={() => handleUpdateStatus("ditangguhkan")}
                >
                  {submitting ? "Memproses..." : "Ya, Tangguhkan Toko"}
                </Button>
              </>
            }
          >
            <p className="text-xs text-muted-fg">
              Seluruh pengguna di toko ini tidak akan dapat mengakses aplikasi selama status
              ditangguhkan. Data toko tetap tersimpan aman.
            </p>
          </Modal>

          {/* Reactivate Modal */}
          <Modal
            open={reactivateModalOpen}
            onClose={() => setReactivateModalOpen(false)}
            title={`Aktifkan Kembali ${toko?.nama}?`}
            footer={
              <>
                <Button variant="outline" onClick={() => setReactivateModalOpen(false)}>
                  Batal
                </Button>
                <Button
                  disabled={submitting}
                  onClick={() => handleUpdateStatus("aktif")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? "Memproses..." : "Ya, Aktifkan Kembali"}
                </Button>
              </>
            }
          >
            <p className="text-xs text-muted-fg">
              Seluruh akun Owner dan Kasir di toko ini akan dapat kembali masuk dan bertransaksi.
            </p>
          </Modal>
        </>
      )}
    </AdminLayout>
  );
}

export default function AdminTokoDetailPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-fg">Memuat detail toko...</div>}>
      <AdminTokoDetailContent />
    </Suspense>
  );
}
