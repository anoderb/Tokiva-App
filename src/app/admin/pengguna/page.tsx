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
  UsersRound,
  ShieldCheck,
  UserCheck,
  Activity,
  Search,
  Download,
  Eye,
  Store,
  CheckCircle2,
  Ban,
  RefreshCw,
} from "lucide-react";
import { adminService } from "@/lib/services/admin.service";
import type { Pengguna } from "@/types/api";
import { formatDate, formatDateTime, formatNumber, getInitials } from "@/lib/format";
import { downloadCsvFile } from "@/lib/utils/csv";

export default function AdminPenggunaPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<Pengguna[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 25;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("Semua");
  const [statusFilter, setStatusFilter] = useState<string>("Semua");
  const [storeFilter, setStoreFilter] = useState<string>("Semua");

  const [detailUser, setDetailUser] = useState<Pengguna | null>(null);
  const [toggleUser, setToggleUser] = useState<Pengguna | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const apiRole =
        roleFilter === "Semua" ? undefined : roleFilter.toLowerCase();
      const apiAktif =
        statusFilter === "Aktif" ? true : statusFilter === "Nonaktif" ? false : undefined;

      const res = await adminService.getPenggunaList({
        search: debouncedSearch || undefined,
        peran: apiRole,
        aktif: apiAktif,
        page,
        limit,
      });
      setUsers(res.items || []);
      setTotalItems(res.pagination?.total ?? res.meta?.total ?? (res.items || []).length);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat daftar pengguna platform.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, roleFilter, statusFilter, page, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const storesList = [
    "Semua",
    ...Array.from(
      new Set(
        users
          .map((u) => u.toko?.nama)
          .filter((n): n is string => Boolean(n && n.trim()))
      )
    ),
  ];

  const displayedUsers = users.filter(
    (u) => storeFilter === "Semua" || u.toko?.nama === storeFilter
  );

  const ownerCount = users.filter((u) => u.peran === "owner").length;
  const kasirCount = users.filter((u) => u.peran === "kasir").length;
  const activeCount = users.filter((u) => u.aktif).length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const getDisplayName = (u: Pengguna) => u.nama_lengkap || u.nama || "-";
  const getLastLogin = (u: Pengguna) => u.login_terakhir || u.terakhir_login || null;

  const handleToggleStatus = async () => {
    if (!toggleUser) return;
    setSubmitting(true);
    try {
      const nextStatus = !toggleUser.aktif;
      await adminService.updateStatusPengguna(toggleUser.id, nextStatus);
      toast.success(
        `Status akun "${getDisplayName(toggleUser)}" diperbarui menjadi ${nextStatus ? "Aktif" : "Nonaktif"
        }.`
      );
      setToggleUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengubah status pengguna.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "ID Pengguna",
      "Nama Lengkap",
      "Email",
      "Telepon",
      "Peran",
      "Toko Tenant",
      "Status",
      "Login Terakhir",
      "Tgl Bergabung",
    ];
    const rows = displayedUsers.map((u) => {
      const lastLogin = getLastLogin(u);
      return [
        u.id,
        getDisplayName(u),
        u.email,
        u.telepon || "-",
        u.peran,
        u.toko?.nama || "Platform Admin",
        u.aktif ? "Aktif" : "Nonaktif",
        lastLogin ? formatDateTime(lastLogin) : "-",
        formatDate(u.dibuat_pada),
      ];
    });
    downloadCsvFile(
      `pengguna-platform-tokiva-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  return (
    <AdminLayout title="Manajemen Pengguna" breadcrumb="Panel Admin / Manajemen Pengguna">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-heading">
            Direktori Pengguna Lintas Tenant
          </h2>
          <p className="text-xs sm:text-[13px] text-muted-fg">
            Pantau dan kelola seluruh akun Owner, Kasir, dan Superadmin di seluruh toko terdaftar.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={loadUsers} disabled={loading}>
            Refresh
          </Button>
          <Button size="sm" variant="outline" icon={Download} onClick={handleExportCSV}>
            Ekspor CSV
          </Button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-5">
        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex items-center gap-3">
          <div className="w-10 h-10 rounded-md border-2 border-fg bg-purple-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
            <UsersRound className="w-5 h-5 text-admin" />
          </div>
          <div>
            <div className="font-heading text-xl font-bold">{formatNumber(totalItems)}</div>
            <div className="text-[11px] font-semibold text-muted-fg">Total Pengguna (Filter)</div>
          </div>
        </div>

        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex items-center gap-3">
          <div className="w-10 h-10 rounded-md border-2 border-fg bg-amber-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
            <ShieldCheck className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="font-heading text-xl font-bold">{formatNumber(ownerCount)}</div>
            <div className="text-[11px] font-semibold text-muted-fg">Owner Halaman Ini</div>
          </div>
        </div>

        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex items-center gap-3">
          <div className="w-10 h-10 rounded-md border-2 border-fg bg-sky-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
            <UserCheck className="w-5 h-5 text-sky-700" />
          </div>
          <div>
            <div className="font-heading text-xl font-bold">{formatNumber(kasirCount)}</div>
            <div className="text-[11px] font-semibold text-muted-fg">Kasir Halaman Ini</div>
          </div>
        </div>

        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex items-center gap-3">
          <div className="w-10 h-10 rounded-md border-2 border-fg bg-emerald-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
            <Activity className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="font-heading text-xl font-bold">{formatNumber(activeCount)}</div>
            <div className="text-[11px] font-semibold text-muted-fg">Aktif Halaman Ini</div>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <SectionCard
        title="Daftar Pengguna Terdaftar"
        desc={`Menampilkan ${displayedUsers.length} dari total ${formatNumber(totalItems)} pengguna.`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mt-2 mb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {["Semua", "Owner", "Kasir", "Superadmin"].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRoleFilter(r);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${roleFilter === r
                    ? "bg-admin text-white border-fg shadow-[2px_2px_0px_#1E293B]"
                    : "bg-card border-border text-muted-fg hover:text-fg hover:bg-muted"
                  }`}
              >
                {r === "Semua" ? "Semua Peran" : r}
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
                placeholder="Cari nama, email, telepon..."
                className="w-full pl-9 pr-3 py-1.5 rounded-md border-2 border-fg bg-card text-xs focus:outline-none"
              />
            </div>

            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="px-3 py-1.5 rounded-md border-2 border-fg bg-card text-xs font-medium"
            >
              {storesList.map((st) => (
                <option key={st} value={st}>
                  {st === "Semua" ? "Semua Toko" : st}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-md border-2 border-fg bg-card text-xs font-medium"
            >
              {["Semua", "Aktif", "Nonaktif"].map((st) => (
                <option key={st} value={st}>
                  {st === "Semua" ? "Semua Status" : st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto border-2 border-fg rounded-md">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                <th className="p-3">Pengguna</th>
                <th className="p-3">Peran</th>
                <th className="p-3">Toko (Tenant)</th>
                <th className="p-3">Login Terakhir</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-fg text-xs">
                    {loading ? "Memuat data pengguna..." : "Tidak ada pengguna yang sesuai filter."}
                  </td>
                </tr>
              ) : (
                displayedUsers.map((u) => {
                  const displayName = getDisplayName(u);
                  const lastLogin = getLastLogin(u);
                  return (
                    <tr key={u.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-full border-2 border-fg flex items-center justify-center font-heading font-bold text-xs shrink-0 ${u.peran === "owner"
                                ? "bg-purple-100 text-admin"
                                : u.peran === "superadmin"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-sky-100 text-sky-700"
                              }`}
                          >
                            {getInitials(displayName)}
                          </div>
                          <div>
                            <div className="font-bold text-fg">{displayName}</div>
                            <div className="text-[11px] text-muted-fg">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            u.peran === "owner"
                              ? "purple"
                              : u.peran === "superadmin"
                                ? "yellow"
                                : "blue"
                          }
                        >
                          {u.peran.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {u.toko ? (
                          <Link
                            href={`/admin/toko/detail?id=${u.toko.id}`}
                            className="font-semibold text-xs text-fg hover:text-admin flex items-center gap-1"
                          >
                            <Store className="w-3.5 h-3.5 text-muted-fg" />
                            <span>{u.toko.nama}</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-fg">Platform Global</span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-fg">
                        {lastLogin ? formatDateTime(lastLogin) : "Belum pernah"}
                      </td>
                      <td className="p-3">
                        <Badge variant={u.aktif ? "green" : "gray"}>
                          {u.aktif ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            icon={Eye}
                            onClick={() => setDetailUser(u)}
                          >
                            Detail
                          </Button>
                          {u.peran !== "superadmin" && (
                            <Button
                              size="sm"
                              variant={u.aktif ? "danger" : "primary"}
                              onClick={() => setToggleUser(u)}
                            >
                              {u.aktif ? "Nonaktifkan" : "Aktifkan"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-xs">
          <span className="text-muted-fg">
            Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong> (Total{" "}
            {formatNumber(totalItems)} pengguna)
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

      {/* Modal Detail Pengguna */}
      <Modal
        open={Boolean(detailUser)}
        onClose={() => setDetailUser(null)}
        title="Detail Akun Pengguna"
        footer={
          <Button variant="outline" onClick={() => setDetailUser(null)}>
            Tutup
          </Button>
        }
      >
        {detailUser && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded bg-muted border border-border">
                <div className="text-[10px] text-muted-fg uppercase">Nama Lengkap</div>
                <div className="font-bold mt-0.5">{getDisplayName(detailUser)}</div>
              </div>
              <div className="p-2.5 rounded bg-muted border border-border">
                <div className="text-[10px] text-muted-fg uppercase">Email</div>
                <div className="font-bold mt-0.5">{detailUser.email}</div>
              </div>
              <div className="p-2.5 rounded bg-muted border border-border">
                <div className="text-[10px] text-muted-fg uppercase">Peran</div>
                <div className="font-bold mt-0.5 uppercase">{detailUser.peran}</div>
              </div>
              <div className="p-2.5 rounded bg-muted border border-border">
                <div className="text-[10px] text-muted-fg uppercase">Toko Tenant</div>
                <div className="font-bold mt-0.5">{detailUser.toko?.nama || "Platform Admin"}</div>
              </div>
              <div className="p-2.5 rounded bg-muted border border-border">
                <div className="text-[10px] text-muted-fg uppercase">Telepon</div>
                <div className="font-bold mt-0.5">{detailUser.telepon || "-"}</div>
              </div>
              <div className="p-2.5 rounded bg-muted border border-border">
                <div className="text-[10px] text-muted-fg uppercase">Terdaftar Pada</div>
                <div className="font-bold mt-0.5">{formatDateTime(detailUser.dibuat_pada)}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Konfirmasi Status */}
      <Modal
        open={Boolean(toggleUser)}
        onClose={() => setToggleUser(null)}
        title={toggleUser?.aktif ? "Nonaktifkan Akun Pengguna?" : "Aktifkan Akun Pengguna?"}
        footer={
          <>
            <Button variant="outline" onClick={() => setToggleUser(null)}>
              Batal
            </Button>
            <Button
              variant={toggleUser?.aktif ? "danger" : "primary"}
              icon={toggleUser?.aktif ? Ban : CheckCircle2}
              disabled={submitting}
              onClick={handleToggleStatus}
            >
              {submitting ? "Memproses..." : "Konfirmasi"}
            </Button>
          </>
        }
      >
        {toggleUser && (
          <p className="text-xs text-muted-fg">
            Apakah Anda yakin ingin mengubah status akun <strong>{getDisplayName(toggleUser)}</strong> (
            {toggleUser.email}) menjadi{" "}
            <strong>{toggleUser.aktif ? "NONAKTIF" : "AKTIF"}</strong>?
          </p>
        )}
      </Modal>
    </AdminLayout>
  );
}
