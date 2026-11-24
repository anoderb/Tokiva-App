"use client";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Store,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Eye,
  MapPin,
  Download,
  Building2,
  ShieldCheck,
  Ban,
  RefreshCw,
  KeyRound,
  EyeOff,
} from "lucide-react";
import { adminService, type TokoPlatformItem } from "@/lib/services/admin.service";
import { formatDate, formatNumber, formatRupiah } from "@/lib/format";
import { downloadCsvFile } from "@/lib/utils/csv";

function generateSecurePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let result = "";
  const arr = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * chars.length);
  }
  for (let i = 0; i < length; i++) {
    result += chars[arr[i] % chars.length];
  }
  return result;
}

export default function AdminTokoListPage() {
  const { toast } = useToast();
  const [stores, setStores] = useState<TokoPlatformItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Semua");
  const [cityFilter, setCityFilter] = useState<string>("Semua");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newStore, setNewStore] = useState({
    nama_toko: "",
    nama_owner: "",
    email_owner: "",
    password_owner: "",
    telepon: "",
    kota: "",
    alamat: "",
  });

  const [actionStore, setActionStore] = useState<TokoPlatformItem | null>(null);
  const [actionType, setActionType] = useState<"aktif" | "nonaktif" | "ditangguhkan" | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const apiStatus =
        statusFilter === "Aktif"
          ? "aktif"
          : statusFilter === "Nonaktif"
            ? "nonaktif"
            : statusFilter === "Ditangguhkan"
              ? "ditangguhkan"
              : undefined;

      const res = await adminService.getTokoList({
        search: debouncedSearch || undefined,
        status: apiStatus,
        page,
        limit,
      });
      setStores(res.items || []);
      setTotalItems(res.pagination?.total ?? res.meta?.total ?? (res.items || []).length);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat direktori toko.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page, toast]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const cities = [
    "Semua",
    ...Array.from(
      new Set(stores.map((s) => s.kota).filter((k): k is string => Boolean(k && k.trim() && k !== "-")))
    ),
  ];

  const displayedStores = stores.filter((s) => cityFilter === "Semua" || s.kota === cityFilter);

  const activeCount = stores.filter((s) => s.status === "aktif").length;
  const suspendedCount = stores.filter((s) => s.status !== "aktif").length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const handleOpenAddModal = () => {
    setNewStore({
      nama_toko: "",
      nama_owner: "",
      email_owner: "",
      password_owner: "",
      telepon: "",
      kota: "",
      alamat: "",
    });
    setShowPassword(false);
    setAddModalOpen(true);
  };

  const handleAddStore = async () => {
    if (!newStore.nama_toko.trim() || !newStore.nama_owner.trim() || !newStore.email_owner.trim()) {
      toast.warning("Nama toko, nama pemilik, dan email pemilik wajib diisi.");
      return;
    }
    if (!newStore.password_owner || newStore.password_owner.length < 6) {
      toast.warning("Password awal owner minimal 6 karakter wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      await adminService.createToko({
        nama_toko: newStore.nama_toko.trim(),
        nama_owner: newStore.nama_owner.trim(),
        email_owner: newStore.email_owner.trim(),
        password_owner: newStore.password_owner,
        telepon: newStore.telepon.trim() || undefined,
        kota: newStore.kota.trim() || undefined,
        alamat: newStore.alamat.trim() || undefined,
      });
      toast.success(`Tenant "${newStore.nama_toko}" berhasil didaftarkan!`);
      setAddModalOpen(false);
      loadStores();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mendaftarkan tenant baru.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!actionStore || !actionType) return;
    setSubmitting(true);
    try {
      await adminService.updateStatusToko(actionStore.id, actionType);
      toast.success(`Status toko "${actionStore.nama}" diperbarui menjadi ${actionType}.`);
      setActionStore(null);
      setActionType(null);
      loadStores();
    } catch (err: any) {
      toast.error(err?.message || "Gagal memperbarui status toko.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "ID Tenant",
      "Kode Toko",
      "Nama Toko",
      "Pemilik",
      "Email",
      "Telepon",
      "Kota",
      "Pengguna",
      "Produk",
      "Transaksi",
      "Total GMV",
      "Tgl Daftar",
      "Status",
    ];
    const rows = displayedStores.map((s) => [
      s.id,
      s.kode || s.kode_toko || "-",
      s.nama,
      s.pemilik || s.nama_pemilik || "-",
      s.email_owner || "-",
      s.telepon || "-",
      s.kota || "-",
      s.jml_pengguna,
      s.jml_produk,
      s.jml_transaksi,
      s.total_gmv,
      formatDate(s.dibuat_pada),
      s.status,
    ]);
    downloadCsvFile(
      `direktori-toko-tokiva-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === "aktif") return <Badge variant="green">Aktif</Badge>;
    if (status === "ditangguhkan") return <Badge variant="red">Ditangguhkan</Badge>;
    return <Badge variant="gray">Nonaktif</Badge>;
  };

  return (
    <AdminLayout title="Manajemen Toko (Tenant)" breadcrumb="Panel Admin / Manajemen Toko">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-heading">Direktori Tenant Kelontong</h2>
          <p className="text-xs sm:text-[13px] text-muted-fg">
            Kelola seluruh toko terdaftar, verifikasi pendaftaran baru, dan pantau operasional tenant.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={loadStores} disabled={loading}>
            Refresh
          </Button>
          <Button size="sm" variant="outline" icon={Download} onClick={handleExportCSV}>
            Ekspor CSV
          </Button>
          <Button
            size="sm"
            icon={Plus}
            onClick={handleOpenAddModal}
            className="bg-admin hover:bg-purple-700 text-white"
          >
            Daftarkan Toko Baru
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 mb-5">
        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex items-center gap-3">
          <div className="w-10 h-10 rounded-md border-2 border-fg bg-purple-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
            <Store className="w-5 h-5 text-admin" />
          </div>
          <div>
            <div className="font-heading text-xl font-bold">{formatNumber(totalItems)}</div>
            <div className="text-[11px] font-semibold text-muted-fg">Total Tenant (Filter Aktif)</div>
          </div>
        </div>

        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex items-center gap-3">
          <div className="w-10 h-10 rounded-md border-2 border-fg bg-emerald-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="font-heading text-xl font-bold">{formatNumber(activeCount)}</div>
            <div className="text-[11px] font-semibold text-muted-fg">Aktif Halaman Ini</div>
          </div>
        </div>

        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex items-center gap-3">
          <div className="w-10 h-10 rounded-md border-2 border-fg bg-red-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
            <AlertTriangle className="w-5 h-5 text-red-700" />
          </div>
          <div>
            <div className="font-heading text-xl font-bold">{formatNumber(suspendedCount)}</div>
            <div className="text-[11px] font-semibold text-muted-fg">Nonaktif / Ditangguhkan</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <SectionCard
        title="Daftar Seluruh Toko"
        desc={`Menampilkan ${displayedStores.length} dari total ${formatNumber(totalItems)} tenant terdaftar.`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mt-2 mb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {["Semua", "Aktif", "Ditangguhkan", "Nonaktif"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${statusFilter === st
                    ? "bg-admin text-white border-fg shadow-[2px_2px_0px_#1E293B]"
                    : "bg-card border-border text-muted-fg hover:text-fg hover:bg-muted"
                  }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-muted-fg absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama toko, pemilik, kode..."
                className="w-full pl-9 pr-3 py-1.5 rounded-md border-2 border-fg bg-card text-xs focus:outline-none focus:ring-2 focus:ring-admin"
              />
            </div>

            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-md border-2 border-fg bg-card text-xs font-medium focus:outline-none"
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c === "Semua" ? "Semua Kota" : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto border-2 border-fg rounded-md">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                <th className="p-3">Tenant / Toko</th>
                <th className="p-3">Pemilik & Kontak</th>
                <th className="p-3">Lokasi</th>
                <th className="p-3 text-center">Pengguna</th>
                <th className="p-3 text-center">Produk</th>
                <th className="p-3 text-right">Transaksi / GMV</th>
                <th className="p-3">Tgl Daftar</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {displayedStores.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-fg text-xs">
                    {loading ? "Memuat direktori toko..." : "Tidak ada toko yang sesuai filter pencarian."}
                  </td>
                </tr>
              ) : (
                displayedStores.map((s) => (
                  <tr key={s.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-md border-2 border-fg flex items-center justify-center font-heading font-bold text-sm shrink-0 shadow-[2px_2px_0px_#1E293B] bg-purple-100 text-admin">
                          {s.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/admin/toko/detail?id=${s.id}`}
                            className="font-bold text-fg hover:text-admin transition-colors block"
                          >
                            {s.nama}
                          </Link>
                          <span className="text-[11px] font-mono text-muted-fg">
                            {s.kode || s.kode_toko || s.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-xs">{s.pemilik || s.nama_pemilik || "-"}</div>
                      <div className="text-[11px] text-muted-fg">{s.email_owner || s.telepon || "-"}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-xs font-medium">
                        <MapPin className="w-3.5 h-3.5 text-muted-fg shrink-0" />
                        <span>{s.kota || "-"}</span>
                      </div>
                      <div className="text-[11px] text-muted-fg truncate max-w-[160px]">
                        {s.alamat || "-"}
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-xs">{s.jml_pengguna}</td>
                    <td className="p-3 text-center font-bold text-xs">{formatNumber(s.jml_produk)}</td>
                    <td className="p-3 text-right">
                      <div className="font-bold text-xs">{formatNumber(s.jml_transaksi)} trx</div>
                      <div className="text-[11px] text-emerald-700 font-semibold">
                        {formatRupiah(s.total_gmv)}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-fg">{formatDate(s.dibuat_pada)}</td>
                    <td className="p-3">{getStatusBadge(s.status)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/admin/toko/detail?id=${s.id}`}>
                          <Button size="sm" variant="outline" icon={Eye}>
                            Detail
                          </Button>
                        </Link>
                        {s.status === "aktif" ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setActionStore(s);
                              setActionType("ditangguhkan");
                            }}
                          >
                            Tangguhkan
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setActionStore(s);
                              setActionType("aktif");
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Aktifkan
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-2.5">
          {displayedStores.map((s) => (
            <div key={s.id} className="p-3.5 rounded-md border-2 border-fg bg-card shadow-pop-soft">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-md border-2 border-fg flex items-center justify-center font-heading font-bold text-sm shrink-0 bg-purple-100 text-admin">
                    {s.nama.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{s.nama}</div>
                    <div className="text-[11px] text-muted-fg">
                      {s.kode || s.kode_toko || s.id.slice(0, 8)} · {s.pemilik || s.nama_pemilik || "-"}
                    </div>
                  </div>
                </div>
                {getStatusBadge(s.status)}
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 my-2 border-y border-border text-center text-xs">
                <div>
                  <div className="text-[10px] text-muted-fg">Pengguna</div>
                  <div className="font-bold">{s.jml_pengguna}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-fg">Produk</div>
                  <div className="font-bold">{formatNumber(s.jml_produk)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-fg">GMV</div>
                  <div className="font-bold">{formatRupiah(s.total_gmv)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-muted-fg">
                  📍 {s.kota || "-"} · {formatDate(s.dibuat_pada)}
                </span>
                <div className="flex items-center gap-1.5">
                  <Link href={`/admin/toko/detail?id=${s.id}`}>
                    <Button size="sm" variant="outline" icon={Eye}>
                      Detail
                    </Button>
                  </Link>
                  {s.status === "aktif" ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setActionStore(s);
                        setActionType("ditangguhkan");
                      }}
                    >
                      Tangguhkan
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setActionStore(s);
                        setActionType("aktif");
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Aktifkan
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-xs">
          <span className="text-muted-fg">
            Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong> (Total {formatNumber(totalItems)} toko)
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Modal: Daftarkan Toko Baru */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Daftarkan Tenant Toko Baru"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Batal
            </Button>
            <Button
              icon={Building2}
              onClick={handleAddStore}
              disabled={submitting}
              className="bg-admin hover:bg-purple-700 text-white"
            >
              {submitting ? "Menyimpan..." : "Simpan & Buat Tenant"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Nama Toko Kelontong *</label>
            <input
              type="text"
              value={newStore.nama_toko}
              onChange={(e) => setNewStore({ ...newStore, nama_toko: e.target.value })}
              placeholder="Contoh: Toko Berkah Mandiri"
              className="w-full p-2 rounded-md border-2 border-fg bg-card"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Nama Pemilik (Owner) *</label>
              <input
                type="text"
                value={newStore.nama_owner}
                onChange={(e) => setNewStore({ ...newStore, nama_owner: e.target.value })}
                placeholder="Nama lengkap pemilik"
                className="w-full p-2 rounded-md border-2 border-fg bg-card"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Email Pemilik *</label>
              <input
                type="email"
                value={newStore.email_owner}
                onChange={(e) => setNewStore({ ...newStore, email_owner: e.target.value })}
                placeholder="owner@tokobaru.id"
                className="w-full p-2 rounded-md border-2 border-fg bg-card"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Password Awal Owner *</label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newStore.password_owner}
                    onChange={(e) => setNewStore({ ...newStore, password_owner: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="w-full p-2 pr-8 rounded-md border-2 border-fg bg-card font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-fg hover:text-fg"
                    title={showPassword ? "Sembunyikan" : "Lihat Password"}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const pwd = generateSecurePassword(12);
                    setNewStore({ ...newStore, password_owner: pwd });
                    setShowPassword(true);
                  }}
                  className="px-2 py-2 rounded-md border-2 border-fg bg-muted hover:bg-card font-semibold text-[11px] flex items-center gap-1 shrink-0"
                  title="Buat password acak aman"
                >
                  <KeyRound className="w-3 h-3" /> Acak
                </button>
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={newStore.telepon}
                onChange={(e) => setNewStore({ ...newStore, telepon: e.target.value })}
                placeholder="0812-xxxx-xxxx"
                className="w-full p-2 rounded-md border-2 border-fg bg-card"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Kota / Kabupaten</label>
              <input
                type="text"
                value={newStore.kota}
                onChange={(e) => setNewStore({ ...newStore, kota: e.target.value })}
                placeholder="Contoh: Pekalongan"
                className="w-full p-2 rounded-md border-2 border-fg bg-card"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Alamat Lengkap</label>
              <input
                type="text"
                value={newStore.alamat}
                onChange={(e) => setNewStore({ ...newStore, alamat: e.target.value })}
                placeholder="Jl. Raya No. 10..."
                className="w-full p-2 rounded-md border-2 border-fg bg-card"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Konfirmasi Status */}
      <Modal
        open={Boolean(actionStore && actionType)}
        onClose={() => {
          setActionStore(null);
          setActionType(null);
        }}
        title={actionType === "aktif" ? "Aktifkan Toko Tenant" : "Tangguhkan Toko Tenant"}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setActionStore(null);
                setActionType(null);
              }}
            >
              Batal
            </Button>
            <Button
              variant={actionType === "aktif" ? "primary" : "danger"}
              icon={actionType === "aktif" ? ShieldCheck : Ban}
              onClick={handleConfirmAction}
              disabled={submitting}
            >
              {submitting ? "Memproses..." : "Konfirmasi"}
            </Button>
          </>
        }
      >
        {actionStore && (
          <div className="space-y-2 text-xs">
            <p>
              Apakah Anda yakin ingin mengubah status toko{" "}
              <strong>{actionStore.nama}</strong> menjadi{" "}
              <strong>{actionType?.toUpperCase()}</strong>?
            </p>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
