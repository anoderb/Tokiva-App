"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CashierHeader } from "@/components/layout/cashier-header";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/components/auth/auth-provider";
import { shiftService } from "@/lib/services/shift.service";
import { formatRupiah, formatTanggal, formatWaktu, hitungDurasi } from "@/lib/format";
import type { ArusKas, ShiftKasir } from "@/types/api";
import {
  Clock,
  Wallet,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Printer,
  RefreshCw,
  ArrowDownRight,
  ReceiptText,
} from "lucide-react";

export default function KasirShiftPage() {
  const { user, toko, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [activeShift, setActiveShift] = useState<ShiftKasir | null>(null);
  const [shiftHistory, setShiftHistory] = useState<ShiftKasir[]>([]);
  const [pettyCashList, setPettyCashList] = useState<ArusKas[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [modalAwalInput, setModalAwalInput] = useState(200000);
  const [catatanBukaInput, setCatatanBukaInput] = useState("");

  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [uangFisikInput, setUangFisikInput] = useState(0);
  const [catatanTutupInput, setCatatanTutupInput] = useState("");

  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState("Operasional Toko");
  const [expenseNominal, setExpenseNominal] = useState(0);
  const [expenseNote, setExpenseNote] = useState("");

  const [detailShift, setDetailShift] = useState<ShiftKasir | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadShiftData = useCallback(async () => {
    setLoading(true);
    try {
      const [aktif, riwayat, arus] = await Promise.all([
        shiftService.getShiftAktif().catch(() => null),
        shiftService.getRiwayatShiftKasir({ limit: 30 }).catch(() => ({ items: [] })),
        shiftService.getArusKasKasir({ jenis: "keluar", limit: 30 }).catch(() => ({ items: [] })),
      ]);

      setActiveShift(aktif);
      setShiftHistory(riwayat?.items || []);
      setPettyCashList(arus?.items || []);

      if (aktif) {
        const expected =
          Number(aktif.modal_awal || 0) +
          Number(aktif.total_penjualan_tunai || 0) +
          Number(aktif.total_kas_masuk || 0) -
          Number(aktif.total_kas_keluar || 0);
        setUangFisikInput(expected);
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat data shift kasir");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && user) {
      loadShiftData();
    }
  }, [authLoading, user, loadShiftData]);

  const handleOpenShift = async () => {
    setSubmitting(true);
    try {
      await shiftService.bukaShift({
        modal_awal: modalAwalInput,
        catatan_buka: catatanBukaInput || undefined,
      });
      toast.success("Shift kasir baru berhasil dibuka!");
      setOpenShiftModal(false);
      setCatatanBukaInput("");
      loadShiftData();
    } catch (err: any) {
      toast.error(err?.message || "Gagal membuka shift");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    setSubmitting(true);
    try {
      await shiftService.tutupShift(activeShift.id, {
        uang_fisik_akhir: uangFisikInput,
        catatan_tutup: catatanTutupInput || undefined,
      });
      toast.success("Shift kasir berhasil ditutup dan direkap!");
      setCloseShiftModal(false);
      setCatatanTutupInput("");
      loadShiftData();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menutup shift");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseNominal || expenseNominal <= 0) {
      toast.error("Nominal pengeluaran harus lebih dari Rp0");
      return;
    }
    setSubmitting(true);
    try {
      await shiftService.tambahPengeluaranKasir({
        jenis: "keluar",
        kategori: expenseCategory,
        nominal: expenseNominal,
        keterangan: expenseNote || expenseCategory,
        shift_id: activeShift?.id,
      });
      toast.success("Pengeluaran kas kecil berhasil dicatat!");
      setExpenseModal(false);
      setExpenseNominal(0);
      setExpenseNote("");
      loadShiftData();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mencatat pengeluaran kas");
    } finally {
      setSubmitting(false);
    }
  };

  const expectedCash = activeShift
    ? Number(activeShift.modal_awal || 0) +
      Number(activeShift.total_penjualan_tunai || 0) +
      Number(activeShift.total_kas_masuk || 0) -
      Number(activeShift.total_kas_keluar || 0)
    : 0;

  const totalSalesActive = activeShift
    ? Number(activeShift.total_penjualan_tunai || 0) +
      Number(activeShift.total_penjualan_non_tunai || 0)
    : 0;

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col font-body">
      <CashierHeader
        cashierName={user?.nama_lengkap}
        storeName={toko?.nama}
        shiftActive={Boolean(activeShift && activeShift.status === "terbuka")}
      />

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-3 sm:p-5 space-y-5">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-extrabold">
              Manajemen Shift & Laci Kasir
            </h1>
            <p className="text-xs text-muted-fg">
              Kelola pembukaan modal laci, pengeluaran kas kecil, dan rekonsiliasi penutupan shift.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={RefreshCw} onClick={loadShiftData}>
              Muat Ulang
            </Button>
            {activeShift ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  icon={PlusCircle}
                  onClick={() => setExpenseModal(true)}
                >
                  Catat Kas Keluar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setCloseShiftModal(true)}
                >
                  Tutup Shift Sekarang
                </Button>
              </>
            ) : (
              <Button size="sm" icon={Clock} onClick={() => setOpenShiftModal(true)}>
                Buka Shift Baru
              </Button>
            )}
          </div>
        </div>

        {/* Active Shift Card */}
        {loading ? (
          <div className="h-36 rounded-lg border-2 border-border bg-card animate-pulse p-4" />
        ) : activeShift ? (
          <div className="bg-lime-50 dark:bg-emerald-950/30 border-2 border-fg rounded-xl p-4 sm:p-5 shadow-pop-soft">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="green">SHIFT AKTIF</Badge>
                <span className="text-xs font-mono text-muted-fg">
                  Dibuka: {formatTanggal(activeShift.waktu_buka)} · {formatWaktu(activeShift.waktu_buka)} (
                  {hitungDurasi(activeShift.waktu_buka)})
                </span>
              </div>
              <span className="text-xs font-semibold">
                Kasir: <strong>{user?.nama_lengkap}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-3 rounded-lg bg-card border-2 border-fg">
                <span className="text-[11px] text-muted-fg block">Modal Awal Laci</span>
                <strong className="font-heading text-base font-extrabold">
                  {formatRupiah(activeShift.modal_awal)}
                </strong>
              </div>
              <div className="p-3 rounded-lg bg-card border-2 border-fg">
                <span className="text-[11px] text-muted-fg block">Penjualan Tunai</span>
                <strong className="font-heading text-base font-extrabold text-emerald-600">
                  {formatRupiah(activeShift.total_penjualan_tunai)}
                </strong>
              </div>
              <div className="p-3 rounded-lg bg-card border-2 border-fg">
                <span className="text-[11px] text-muted-fg block">Non-Tunai (QRIS)</span>
                <strong className="font-heading text-base font-extrabold text-sky-600">
                  {formatRupiah(activeShift.total_penjualan_non_tunai)}
                </strong>
              </div>
              <div className="p-3 rounded-lg bg-card border-2 border-fg">
                <span className="text-[11px] text-muted-fg block">Kas Kecil Keluar</span>
                <strong className="font-heading text-base font-extrabold text-red-600">
                  -{formatRupiah(activeShift.total_kas_keluar)}
                </strong>
              </div>
              <div className="p-3 rounded-lg bg-accent text-white border-2 border-fg col-span-2 sm:col-span-1">
                <span className="text-[11px] text-white/80 block">Uang Tunai Seharusnya</span>
                <strong className="font-heading text-base font-extrabold">
                  {formatRupiah(expectedCash)}
                </strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border-2 border-dashed border-fg rounded-xl p-6 text-center space-y-3">
            <Clock className="w-10 h-10 text-muted-fg mx-auto" />
            <div className="font-heading font-bold text-base">
              Belum Ada Shift Kasir yang Aktif
            </div>
            <p className="text-xs text-muted-fg max-w-md mx-auto">
              Buka shift terlebih dahulu dan masukkan jumlah modal uang kembalian di laci kasir.
            </p>
            <Button onClick={() => setOpenShiftModal(true)}>Buka Shift Kasir</Button>
          </div>
        )}

        {/* Grid: Petty Cash & Shift History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Petty Cash Expenses */}
          <div className="bg-card border-2 border-fg rounded-xl p-4 shadow-pop-soft space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-red-500" />
                <h2 className="font-heading font-bold text-sm">Pengeluaran Kas Kecil</h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!activeShift || activeShift.status !== "terbuka"}
                title={
                  !activeShift || activeShift.status !== "terbuka"
                    ? "Buka shift terlebih dahulu untuk mencatat kas kecil"
                    : undefined
                }
                onClick={() => setExpenseModal(true)}
              >
                + Catat
              </Button>
            </div>

            {pettyCashList.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-fg">
                Belum ada catatan pengeluaran laci kasir.
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {pettyCashList.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-md border border-border bg-muted/40 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{item.keterangan || item.kategori}</div>
                      <div className="text-[10px] text-muted-fg">
                        {item.kategori} · {formatTanggal(item.waktu)} {formatWaktu(item.waktu)}
                      </div>
                    </div>
                    <strong className="text-red-600 font-bold shrink-0">
                      -{formatRupiah(item.nominal)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shift History Table */}
          <div className="lg:col-span-2 bg-card border-2 border-fg rounded-xl p-4 shadow-pop-soft space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-accent" />
                <h2 className="font-heading font-bold text-sm">Riwayat Shift Kasir Toko</h2>
              </div>
              <span className="text-xs text-muted-fg">{shiftHistory.length} sesi tercatat</span>
            </div>

            <div className="overflow-x-auto border-2 border-fg rounded-md">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                    <th className="p-2.5">Waktu Buka</th>
                    <th className="p-2.5">Kasir</th>
                    <th className="p-2.5">Modal Awal</th>
                    <th className="p-2.5">Total Penjualan</th>
                    <th className="p-2.5">Selisih Kas</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftHistory.map((s) => {
                    const omzet =
                      Number(s.total_penjualan_tunai || 0) +
                      Number(s.total_penjualan_non_tunai || 0);
                    const selisih = s.selisih_kas !== null && s.selisih_kas !== undefined
                      ? Number(s.selisih_kas)
                      : null;

                    return (
                      <tr key={s.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-2.5">
                          <div className="font-semibold">{formatTanggal(s.waktu_buka)}</div>
                          <div className="text-[10px] text-muted-fg">
                            {formatWaktu(s.waktu_buka)} - {s.waktu_tutup ? formatWaktu(s.waktu_tutup) : "Aktif"}
                          </div>
                        </td>
                        <td className="p-2.5 font-medium">
                          {s.kasir?.nama_lengkap || "-"}
                        </td>
                        <td className="p-2.5">{formatRupiah(s.modal_awal)}</td>
                        <td className="p-2.5 font-bold text-accent">{formatRupiah(omzet)}</td>
                        <td className="p-2.5 font-bold">
                          {selisih === null ? (
                            <span className="text-muted-fg">-</span>
                          ) : selisih === 0 ? (
                            <span className="text-emerald-600">Sesuai (Rp0)</span>
                          ) : (
                            <span className={selisih > 0 ? "text-sky-600" : "text-red-600"}>
                              {selisih > 0 ? "+" : ""}
                              {formatRupiah(selisih)}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <Badge variant={s.status === "terbuka" || (s.status as any) === "buka" ? "green" : "gray"}>
                            {s.status === "terbuka" || (s.status as any) === "buka" ? "Aktif" : "Selesai"}
                          </Badge>
                        </td>
                        <td className="p-2.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Eye}
                            onClick={() => setDetailShift(s)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {shiftHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-fg">
                        Belum ada riwayat shift kasir.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL BUKA SHIFT */}
      <Modal
        open={openShiftModal}
        onClose={() => setOpenShiftModal(false)}
        title="Buka Shift Kasir Baru"
        className="max-w-md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Modal Awal Laci Kasir (Rp) *</label>
            <input
              type="number"
              value={modalAwalInput}
              onChange={(e) => setModalAwalInput(Number(e.target.value))}
              className="w-full px-3 py-2 border-2 border-border rounded font-bold text-sm bg-card"
            />
          </div>
          <div>
            <label className="font-bold block mb-1">Catatan Pembukaan Shift</label>
            <textarea
              rows={2}
              value={catatanBukaInput}
              onChange={(e) => setCatatanBukaInput(e.target.value)}
              placeholder="Contoh: Uang pecahan kembalian lengkap"
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setOpenShiftModal(false)}>
              Batal
            </Button>
            <Button size="sm" disabled={submitting} onClick={handleOpenShift}>
              {submitting ? "Membuka..." : "Buka Shift"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL TUTUP SHIFT */}
      <Modal
        open={closeShiftModal}
        onClose={() => setCloseShiftModal(false)}
        title="Rekonsiliasi & Tutup Shift Kasir"
        className="max-w-md"
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-md bg-muted border border-border space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-fg">Modal Awal:</span>
              <strong>{formatRupiah(activeShift?.modal_awal)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-fg">Penjualan Tunai:</span>
              <strong className="text-emerald-600">
                +{formatRupiah(activeShift?.total_penjualan_tunai)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-fg">Kas Keluar:</span>
              <strong className="text-red-600">
                -{formatRupiah(activeShift?.total_kas_keluar)}
              </strong>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-border text-sm">
              <span className="font-bold">Saldo Tunai Sistem:</span>
              <strong className="text-accent">{formatRupiah(expectedCash)}</strong>
            </div>
          </div>

          <div>
            <label className="font-bold block mb-1">Hitung Uang Fisik Aktual di Laci (Rp) *</label>
            <input
              type="number"
              value={uangFisikInput}
              onChange={(e) => setUangFisikInput(Number(e.target.value))}
              className="w-full px-3 py-2 border-2 border-border rounded font-bold text-sm bg-card"
            />
            <div className="flex justify-between mt-1 text-[11px]">
              <span className="text-muted-fg">Estimasi Selisih Kas:</span>
              <strong
                className={
                  uangFisikInput - expectedCash === 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }
              >
                {formatRupiah(uangFisikInput - expectedCash)}
              </strong>
            </div>
          </div>

          <div>
            <label className="font-bold block mb-1">Catatan Penutupan Shift</label>
            <textarea
              rows={2}
              value={catatanTutupInput}
              onChange={(e) => setCatatanTutupInput(e.target.value)}
              placeholder="Catatan pergantian shift atau alasan selisih..."
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setCloseShiftModal(false)}>
              Batal
            </Button>
            <Button variant="danger" size="sm" disabled={submitting} onClick={handleCloseShift}>
              {submitting ? "Menutup..." : "Konfirmasi Tutup Shift"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL CATAT PENGELUARAN KAS KECIL */}
      <Modal
        open={expenseModal}
        onClose={() => setExpenseModal(false)}
        title="Catat Pengeluaran Kas Kecil Laci"
        className="max-w-md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Kategori Pengeluaran</label>
            <select
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            >
              <option>Operasional Toko</option>
              <option>Perlengkapan / Kemasan</option>
              <option>Transportasi / Kurir</option>
              <option>Lain-lain</option>
            </select>
          </div>
          <div>
            <label className="font-bold block mb-1">Nominal (Rp) *</label>
            <input
              type="number"
              value={expenseNominal || ""}
              onChange={(e) => setExpenseNominal(Number(e.target.value))}
              placeholder="Contoh: 15000"
              className="w-full px-3 py-2 border-2 border-border rounded font-bold text-sm bg-card"
            />
          </div>
          <div>
            <label className="font-bold block mb-1">Keterangan *</label>
            <input
              value={expenseNote}
              onChange={(e) => setExpenseNote(e.target.value)}
              placeholder="Contoh: Beli kantong kresek & kertas struk"
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setExpenseModal(false)}>
              Batal
            </Button>
            <Button size="sm" disabled={submitting} onClick={handleAddExpense}>
              {submitting ? "Menyimpan..." : "Simpan Pengeluaran"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL DETAIL SHIFT */}
      <Modal
        open={Boolean(detailShift)}
        onClose={() => setDetailShift(null)}
        title="Rincian Sesi Shift Kasir"
        className="max-w-md"
      >
        {detailShift && (
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded bg-muted border border-border space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-fg">Waktu Buka:</span>
                <strong>
                  {formatTanggal(detailShift.waktu_buka)} {formatWaktu(detailShift.waktu_buka)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-fg">Waktu Tutup:</span>
                <strong>
                  {detailShift.waktu_tutup
                    ? `${formatTanggal(detailShift.waktu_tutup)} ${formatWaktu(detailShift.waktu_tutup)}`
                    : "Masih Aktif"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-fg">Modal Awal:</span>
                <strong>{formatRupiah(detailShift.modal_awal)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-fg">Penjualan Tunai:</span>
                <strong className="text-emerald-600">
                  {formatRupiah(detailShift.total_penjualan_tunai)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-fg">Penjualan Non-Tunai:</span>
                <strong className="text-sky-600">
                  {formatRupiah(detailShift.total_penjualan_non_tunai)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-fg">Kas Keluar:</span>
                <strong className="text-red-600">
                  -{formatRupiah(detailShift.total_kas_keluar)}
                </strong>
              </div>
              {detailShift.uang_fisik_akhir !== null && detailShift.uang_fisik_akhir !== undefined && (
                <div className="flex justify-between pt-1.5 border-t border-border">
                  <span className="font-bold">Uang Fisik Akhir:</span>
                  <strong>{formatRupiah(detailShift.uang_fisik_akhir)}</strong>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setDetailShift(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
