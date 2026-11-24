"use client";

import { useState, useEffect, useCallback } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast } from "@/components/ui/toast";
import { tokoService } from "@/lib/services/toko.service";
import { formatTanggal, formatTanggalWaktu } from "@/lib/format";
import type { Pengguna } from "@/types/api";
import {
  UsersRound,
  Search,
  Plus,
  Pencil,
  Save,
  Key,
  Trash2,
  RefreshCw,
  Mail,
} from "lucide-react";

export default function PenggunaPage() {
  const { toast } = useToast();

  const [staffList, setStaffList] = useState<Pengguna[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Add / Edit Modal
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Pengguna | null>(null);
  const [kirimUndangan, setKirimUndangan] = useState(true);
  const [form, setForm] = useState({
    nama_lengkap: "",
    email: "",
    telepon: "",
    password: "",
    pin_kasir: "",
    aktif: true,
  });

  // Reset PIN Modal
  const [pinTarget, setPinTarget] = useState<Pengguna | null>(null);
  const [newPin, setNewPin] = useState("");

  // Delete Confirm & Invite loading
  const [deleteTarget, setDeleteTarget] = useState<Pengguna | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tokoService.getKaryawan({ search: debouncedSearch || undefined });
      const list = Array.isArray(res) ? res : res?.items || [];
      setStaffList(list);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat daftar staf kasir");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, toast]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_lengkap.trim() || !form.email.includes("@")) {
      toast.error("Nama lengkap dan email valid wajib diisi");
      return;
    }
    if (!kirimUndangan) {
      if (form.password.length < 6) {
        toast.error("Kata sandi awal minimal 6 karakter");
        return;
      }
      if (!/^\d{6}$/.test(form.pin_kasir)) {
        toast.error("PIN otorisasi kasir wajib 6 digit angka");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await tokoService.createKaryawan({
        nama_lengkap: form.nama_lengkap.trim(),
        email: form.email.trim(),
        telepon: form.telepon.trim() || undefined,
        kirim_undangan: kirimUndangan,
        ...(kirimUndangan
          ? {}
          : {
              password: form.password,
              pin_kasir: form.pin_kasir,
            }),
      });
      toast.success(
        res.undangan_terkirim
          ? `Undangan aktivasi telah dikirim ke ${form.email.trim()}!`
          : "Akun staf kasir baru berhasil dibuat!"
      );
      setAddOpen(false);
      loadStaff();
    } catch (err: any) {
      toast.error(err?.message || "Gagal membuat akun kasir");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvite = async (u: Pengguna) => {
    try {
      const res = await tokoService.resendInviteKaryawan(u.id);
      toast.success(res.message || `Undangan dikirim ulang ke ${u.email}`);
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengirim ulang undangan kasir");
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await tokoService.updateKaryawan(editTarget.id, {
        nama_lengkap: form.nama_lengkap.trim(),
        telepon: form.telepon.trim() || undefined,
        aktif: form.aktif,
      });
      toast.success("Data staf kasir berhasil diperbarui!");
      setEditTarget(null);
      loadStaff();
    } catch (err: any) {
      toast.error(err?.message || "Gagal memperbarui staf kasir");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinTarget || !/^\d{6}$/.test(newPin)) {
      toast.error("PIN baru wajib 6 digit angka");
      return;
    }
    setSubmitting(true);
    try {
      await tokoService.resetPinKaryawan(pinTarget.id, newPin);
      toast.success(`PIN kasir ${pinTarget.nama_lengkap} berhasil direset!`);
      setPinTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Gagal mereset PIN kasir");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await tokoService.deleteKaryawan(deleteTarget.id);
      toast.success(`Staf kasir ${deleteTarget.nama_lengkap} telah dinonaktifkan.`);
      setDeleteTarget(null);
      loadStaff();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menonaktifkan kasir");
    } finally {
      setSubmitting(false);
    }
  };

  const aktifCount = staffList.filter((u) => u.aktif).length;

  return (
    <OwnerLayout
      title="Manajemen Staf & Kasir"
      desc="Kelola akun karyawan kasir, undangan aktivasi email, dan PIN otorisasi 6-digit."
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-5">
        <StatCard icon={UsersRound} value={String(staffList.length)} label="Total Staf Kasir" />
        <StatCard icon={UsersRound} value={String(aktifCount)} label="Staf Aktif" />
        <StatCard
          icon={UsersRound}
          value={String(staffList.length - aktifCount)}
          label="Nonaktif"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <SectionCard
        title="Daftar Akun Staf Kasir"
        customAction={
          <Button
            size="sm"
            icon={Plus}
            onClick={() => {
              setKirimUndangan(true);
              setForm({
                nama_lengkap: "",
                email: "",
                telepon: "",
                password: "",
                pin_kasir: "",
                aktif: true,
              });
              setAddOpen(true);
            }}
          >
            Tambah Kasir Baru
          </Button>
        }
      >
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full pl-9 pr-3 py-2 border-2 border-border rounded-full text-xs outline-none focus:border-accent bg-card"
            />
          </div>
          <Button size="sm" variant="ghost" icon={RefreshCw} onClick={loadStaff} />
        </div>

        <div className="overflow-x-auto border-2 border-fg rounded-md">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                <th className="p-2.5">Nama Lengkap</th>
                <th className="p-2.5">Email</th>
                <th className="p-2.5">Telepon</th>
                <th className="p-2.5">Peran</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Login Terakhir</th>
                <th className="p-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-fg">
                    Memuat daftar pengguna...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-fg">
                    Belum ada staf kasir terdaftar.
                  </td>
                </tr>
              ) : (
                staffList.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-2.5 font-semibold">{u.nama_lengkap}</td>
                    <td className="p-2.5 font-mono">{u.email}</td>
                    <td className="p-2.5">{u.telepon || "-"}</td>
                    <td className="p-2.5">
                      <Badge variant={u.peran === "owner" ? "purple" : "blue"}>
                        {u.peran.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-2.5">
                      <Badge variant={u.aktif ? "green" : "red"}>
                        {u.aktif ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="p-2.5 text-muted-fg">
                      {u.login_terakhir
                        ? formatTanggalWaktu(u.login_terakhir)
                        : formatTanggal(u.dibuat_pada)}
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        {u.aktif && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Mail}
                            onClick={() => handleResendInvite(u)}
                            title="Kirim Undangan Aktivasi Email"
                          />
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Pencil}
                          onClick={() => {
                            setEditTarget(u);
                            setForm({
                              nama_lengkap: u.nama_lengkap,
                              email: u.email,
                              telepon: u.telepon || "",
                              password: "",
                              pin_kasir: "",
                              aktif: u.aktif,
                            });
                          }}
                          title="Edit"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Key}
                          onClick={() => {
                            setPinTarget(u);
                            setNewPin("");
                          }}
                          title="Reset PIN 6-Digit"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          onClick={() => setDeleteTarget(u)}
                          title="Nonaktifkan"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* MODAL TAMBAH KASIR */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah Akun Staf Kasir Baru"
        className="max-w-md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Nama Lengkap *</label>
            <input
              required
              value={form.nama_lengkap}
              onChange={(e) => setForm((p) => ({ ...p, nama_lengkap: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            />
          </div>
          <div>
            <label className="font-bold block mb-1">Email Login *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="kasir@toko.id"
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            />
          </div>
          <div>
            <label className="font-bold block mb-1">Nomor Telepon</label>
            <input
              value={form.telepon}
              onChange={(e) => setForm((p) => ({ ...p, telepon: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            />
          </div>

          <label className="flex items-start gap-2 p-2.5 rounded border-2 border-border bg-muted/40 cursor-pointer">
            <input
              type="checkbox"
              checked={kirimUndangan}
              onChange={(e) => setKirimUndangan(e.target.checked)}
              className="w-4 h-4 accent-accent mt-0.5 shrink-0"
            />
            <span className="leading-relaxed">
              <strong>Kirim undangan via Email (Resend)</strong> — Kasir mengatur kata sandi dan PIN 6-digit pribadi sendiri dari tautan email.
            </span>
          </label>

          {!kirimUndangan && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold block mb-1">Kata Sandi Awal *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Min. 6 karakter"
                  className="w-full px-3 py-2 border-2 border-border rounded bg-card"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">PIN Otorisasi 6-Digit *</label>
                <input
                  type="password"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  value={form.pin_kasir}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, pin_kasir: e.target.value.replace(/\D/g, "") }))
                  }
                  placeholder="6 digit"
                  className="w-full px-3 py-2 border-2 border-border rounded bg-card font-mono"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" icon={kirimUndangan ? Mail : Save} disabled={submitting}>
              {kirimUndangan ? "Kirim Undangan Kasir" : "Buat Akun Kasir"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDIT KASIR */}
      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Perbarui Data Staf Kasir"
        className="max-w-md"
      >
        <form onSubmit={handleUpdateStaff} className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Nama Lengkap *</label>
            <input
              required
              value={form.nama_lengkap}
              onChange={(e) => setForm((p) => ({ ...p, nama_lengkap: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            />
          </div>
          <div>
            <label className="font-bold block mb-1">Telepon</label>
            <input
              value={form.telepon}
              onChange={(e) => setForm((p) => ({ ...p, telepon: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            />
          </div>
          <div>
            <label className="font-bold block mb-1">Status Akun</label>
            <select
              value={form.aktif ? "true" : "false"}
              onChange={(e) => setForm((p) => ({ ...p, aktif: e.target.value === "true" }))}
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            >
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
              Batal
            </Button>
            <Button type="submit" icon={Save} disabled={submitting}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL RESET PIN */}
      <Modal
        open={Boolean(pinTarget)}
        onClose={() => setPinTarget(null)}
        title={`Reset PIN 6-Digit: ${pinTarget?.nama_lengkap || ""}`}
        className="max-w-sm"
      >
        <form onSubmit={handleResetPin} className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">PIN 6-Digit Baru *</label>
            <input
              type="password"
              inputMode="numeric"
              required
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Masukkan 6 digit angka"
              className="w-full px-3 py-2 border-2 border-border rounded font-mono text-center text-base font-bold tracking-widest bg-card"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setPinTarget(null)}>
              Batal
            </Button>
            <Button type="submit" icon={Save} disabled={submitting}>
              Simpan PIN Baru
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteStaff}
        loading={submitting}
        title="Nonaktifkan Akun Kasir?"
        message={`Apakah Anda yakin ingin menonaktifkan akun kasir "${deleteTarget?.nama_lengkap}"?`}
        confirmText="Ya, Nonaktifkan"
        variant="danger"
      />
    </OwnerLayout>
  );
}
