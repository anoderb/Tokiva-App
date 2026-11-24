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
import { operasionalService } from "@/lib/services/operasional.service";
import { formatRupiah, formatTanggal } from "@/lib/format";
import type { Pelanggan, Piutang } from "@/types/api";
import {
  Users,
  BookOpen,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Save,
  RefreshCw,
  Wallet,
} from "lucide-react";

export default function PelangganPage() {
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Pelanggan[]>([]);
  const [customerSummary, setCustomerSummary] = useState<{
    total_pelanggan?: number;
    pelanggan_berutang?: number;
    total_piutang_aktif?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Add / Edit Customer Modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingCust, setEditingCust] = useState<Pelanggan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pelanggan | null>(null);
  const [form, setForm] = useState({
    nama: "",
    telepon: "",
    alamat: "",
    batas_bon: 500000,
    catatan: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Kartu Piutang & Bayar Cicilan Modal
  const [kartuOpen, setKartuOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Pelanggan | null>(null);
  const [daftarPiutang, setDaftarPiutang] = useState<Piutang[]>([]);
  const [payPiutangTarget, setPayPiutangTarget] = useState<Piutang | null>(null);
  const [payNominal, setPayNominal] = useState<number>(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await operasionalService.getPelanggan({
        search: debouncedSearch || undefined,
        limit: 100,
      });
      setCustomers(res?.items || []);
      setCustomerSummary(res?.ringkasan || null);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat daftar pelanggan");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, toast]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const openAdd = () => {
    setEditingCust(null);
    setForm({ nama: "", telepon: "", alamat: "", batas_bon: 500000, catatan: "" });
    setFormOpen(true);
  };

  const openEdit = (c: Pelanggan) => {
    setEditingCust(c);
    setForm({
      nama: c.nama,
      telepon: c.telepon || "",
      alamat: c.alamat || "",
      batas_bon: Number(c.batas_bon || 500000),
      catatan: c.catatan || "",
    });
    setFormOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      toast.error("Nama pelanggan wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      if (editingCust) {
        await operasionalService.updatePelanggan(editingCust.id, form);
        toast.success("Data pelanggan diperbarui!");
      } else {
        await operasionalService.createPelanggan(form);
        toast.success("Pelanggan baru berhasil ditambahkan!");
      }
      setFormOpen(false);
      loadCustomers();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan pelanggan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenKartuPiutang = async (c: Pelanggan) => {
    setSelectedCustomer(c);
    setPayPiutangTarget(null);
    setKartuOpen(true);
    try {
      const res = await operasionalService.getKartuPiutang(c.id);
      if (res?.pelanggan) setSelectedCustomer(res.pelanggan);
      setDaftarPiutang(res?.daftar_bon || []);
    } catch {
      setDaftarPiutang([]);
    }
  };

  const handlePayDebt = async () => {
    if (!payPiutangTarget || payNominal <= 0) return;
    if (payNominal > Number(payPiutangTarget.sisa_bon || 0)) {
      toast.error("Nominal bayar tidak boleh melebihi sisa bon nota");
      return;
    }
    setSubmitting(true);
    try {
      await operasionalService.bayarPiutang({
        piutang_id: payPiutangTarget.id,
        nominal_bayar: Number(payNominal),
        metode: "tunai",
      });
      toast.success("Pembayaran cicilan Kas Bon berhasil dicatat!");
      setPayPiutangTarget(null);
      if (selectedCustomer) {
        const res = await operasionalService.getKartuPiutang(selectedCustomer.id);
        if (res?.pelanggan) setSelectedCustomer(res.pelanggan);
        setDaftarPiutang(res?.daftar_bon || []);
      }
      loadCustomers();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mencatat pembayaran piutang");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await operasionalService.deletePelanggan(deleteTarget.id);
      toast.success(`Pelanggan "${deleteTarget.nama}" berhasil dihapus.`);
      setDeleteTarget(null);
      loadCustomers();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menghapus pelanggan");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPiutangToko =
    customerSummary?.total_piutang_aktif ??
    customers.reduce((sum, c) => sum + Number(c.total_piutang || 0), 0);
  const pelangganBerutang =
    customerSummary?.pelanggan_berutang ??
    customers.filter((c) => Number(c.total_piutang || 0) > 0).length;
  const totalPelangganCount = customerSummary?.total_pelanggan ?? customers.length;

  return (
    <OwnerLayout
      title="Pelanggan & Buku Kas Bon"
      desc="Kelola data pelanggan tetap, batas kredit kas bon, dan pencatatan cicilan piutang."
    >
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 mb-5">
        <StatCard icon={Users} value={String(totalPelangganCount)} label="Total Pelanggan" />
        <StatCard
          icon={BookOpen}
          value={String(pelangganBerutang)}
          label="Pelanggan Memiliki Bon"
        />
        <StatCard
          icon={Wallet}
          value={formatRupiah(totalPiutangToko)}
          label="Total Piutang Aktif"
          className="col-span-2 xl:col-span-1"
        />
      </div>

      <SectionCard
        title="Daftar Pelanggan Toko"
        customAction={
          <Button size="sm" icon={Plus} onClick={openAdd}>
            Tambah Pelanggan
          </Button>
        }
      >
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau nomor telepon..."
              className="w-full pl-9 pr-3 py-2 border-2 border-border rounded-full text-xs outline-none focus:border-accent bg-card"
            />
          </div>
          <Button size="sm" variant="ghost" icon={RefreshCw} onClick={loadCustomers} />
        </div>

        <div className="overflow-x-auto border-2 border-fg rounded-md">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                <th className="p-2.5">Nama Pelanggan</th>
                <th className="p-2.5">No. Telepon</th>
                <th className="p-2.5">Alamat</th>
                <th className="p-2.5">Batas Bon</th>
                <th className="p-2.5">Total Piutang</th>
                <th className="p-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-fg">
                    Memuat data pelanggan...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-fg">
                    Belum ada pelanggan terdaftar.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const piutang = Number(c.total_piutang || 0);
                  return (
                    <tr key={c.id} className="border-b border-border hover:bg-muted/40">
                      <td className="p-2.5 font-semibold">{c.nama}</td>
                      <td className="p-2.5 font-mono">{c.telepon || "-"}</td>
                      <td className="p-2.5 text-muted-fg">{c.alamat || "-"}</td>
                      <td className="p-2.5">{formatRupiah(c.batas_bon)}</td>
                      <td className="p-2.5">
                        {piutang > 0 ? (
                          <span className="font-bold text-red-600">{formatRupiah(piutang)}</span>
                        ) : (
                          <Badge variant="green">Lunas (Rp0)</Badge>
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            icon={Eye}
                            onClick={() => handleOpenKartuPiutang(c)}
                          >
                            Kartu Bon
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Pencil}
                            onClick={() => openEdit(c)}
                            title="Edit Pelanggan"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Trash2}
                            onClick={() => setDeleteTarget(c)}
                            title="Hapus Pelanggan"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* MODAL TAMBAH / EDIT PELANGGAN */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingCust ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
        className="max-w-md"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Nama Lengkap *</label>
            <input
              required
              value={form.nama}
              onChange={(e) => setForm((p) => ({ ...p, nama: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            />
          </div>
          <div>
            <label className="font-bold block mb-1">Nomor Telepon / WhatsApp</label>
            <input
              value={form.telepon}
              onChange={(e) => setForm((p) => ({ ...p, telepon: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            />
          </div>
          <div>
            <label className="font-bold block mb-1">Alamat</label>
            <input
              value={form.alamat}
              onChange={(e) => setForm((p) => ({ ...p, alamat: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            />
          </div>
          <div>
            <label className="font-bold block mb-1">Plafon Maksimal Kas Bon (Rp)</label>
            <input
              type="number"
              value={form.batas_bon}
              onChange={(e) => setForm((p) => ({ ...p, batas_bon: Number(e.target.value) }))}
              className="w-full px-3 py-2 border-2 border-border rounded font-bold bg-card"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button type="submit" icon={Save} disabled={submitting}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL KARTU PIUTANG & PELUNASAN */}
      <Modal
        open={kartuOpen}
        onClose={() => {
          setKartuOpen(false);
          setPayPiutangTarget(null);
        }}
        title={`Kartu Kas Bon: ${selectedCustomer?.nama || ""}`}
        className="max-w-lg"
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded bg-muted border border-border flex justify-between items-center">
            <span>Total Sisa Piutang:</span>
            <strong className="text-base text-red-600">
              {formatRupiah(selectedCustomer?.total_piutang)}
            </strong>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {daftarPiutang.length === 0 ? (
              <div className="py-6 text-center text-muted-fg">
                Tidak ada riwayat catatan kas bon untuk pelanggan ini.
              </div>
            ) : (
              daftarPiutang.map((pt) => (
                <div
                  key={pt.id}
                  className="p-3 rounded border border-border bg-card flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <span>Faktur: {pt.transaksi?.no_transaksi || pt.id.slice(0, 8)}</span>
                      {pt.status === "batal" && <Badge variant="gray">Dibatalkan</Badge>}
                      {pt.status === "lunas" && <Badge variant="green">Lunas</Badge>}
                    </div>
                    <div className="text-[10px] text-muted-fg">
                      Tanggal: {formatTanggal(pt.dibuat_pada)} · Awal: {formatRupiah(pt.total_bon)}
                    </div>
                    <div className="text-[11px] font-bold text-red-600">
                      Sisa: {formatRupiah(pt.sisa_bon)}
                    </div>
                  </div>
                  {pt.status !== "lunas" && pt.status !== "batal" && Number(pt.sisa_bon || 0) > 0 && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setPayPiutangTarget(pt);
                        setPayNominal(Number(pt.sisa_bon));
                      }}
                    >
                      Bayar Cicilan
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>

          {payPiutangTarget && (
            <div className="p-3 rounded-lg border-2 border-accent bg-emerald-50/50 dark:bg-emerald-950/30 space-y-2">
              <div className="font-bold">
                Input Pembayaran Cicilan (Maks: {formatRupiah(payPiutangTarget.sisa_bon)})
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={Number(payPiutangTarget.sisa_bon || 0)}
                  value={payNominal || ""}
                  onChange={(e) => setPayNominal(Number(e.target.value))}
                  className="flex-1 px-3 py-1.5 border-2 border-border rounded font-bold bg-card"
                />
                <Button size="sm" disabled={submitting} onClick={handlePayDebt}>
                  Konfirmasi Bayar
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteCustomer}
        loading={submitting}
        title="Hapus Data Pelanggan?"
        message={`Apakah Anda yakin ingin menghapus pelanggan "${deleteTarget?.nama}"? Pelanggan yang masih memiliki kas bon aktif tidak dapat dihapus.`}
        confirmText="Ya, Hapus"
        variant="danger"
      />
    </OwnerLayout>
  );
}
