"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/components/auth/auth-provider";
import { operasionalService } from "@/lib/services/operasional.service";
import { posService } from "@/lib/services/pos.service";
import { tokoService } from "@/lib/services/toko.service";
import { formatRupiah, formatTanggal, formatWaktu } from "@/lib/format";
import {
  mapTransaksiToReceiptData,
  TransactionDetailModal,
  TransactionVoidModal,
} from "@/components/shared/transaction-history-modals";
import type { ReceiptData } from "@/components/shared/thermal-receipt-modal";
import type { Pengguna, Transaksi } from "@/types/api";
import {
  Search,
  RefreshCw,
  Eye,
  Printer,
  RotateCcw,
  Users,
  Calendar,
} from "lucide-react";

const ThermalReceiptModal = dynamic(
  () => import("@/components/shared/thermal-receipt-modal").then((m) => m.ThermalReceiptModal),
  { ssr: false }
);

/** Panel riwayat transaksi bersama untuk Owner (audit toko) dan Kasir (riwayat pribadi). */
export function TransactionHistoryPanel({
  role,
  active = true,
  refreshSignal,
}: {
  role: "owner" | "kasir";
  active?: boolean;
  refreshSignal?: number;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const isOwner = role === "owner";

  const [transactions, setTransactions] = useState<Transaksi[]>([]);
  const [txSummary, setTxSummary] = useState<Record<string, number> | null>(null);
  const [cashierList, setCashierList] = useState<Pengguna[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [kasirFilter, setKasirFilter] = useState("");
  const [metodeFilter, setMetodeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");

  const [selectedTx, setSelectedTx] = useState<Transaksi | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const [voidTarget, setVoidTarget] = useState<Transaksi | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [voidLoading, setVoidLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!isOwner || !active || authLoading || !user) return;
    tokoService
      .getKaryawan()
      .then((res) => setCashierList(Array.isArray(res) ? res : res?.items || []))
      .catch(() => {});
  }, [isOwner, active, authLoading, user]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const query = {
        search: debouncedSearch || undefined,
        kasir_id: isOwner ? kasirFilter || undefined : undefined,
        metode_bayar: metodeFilter || undefined,
        status: statusFilter || undefined,
        tanggal_mulai: tanggalMulai || undefined,
        tanggal_akhir: tanggalAkhir || undefined,
        limit: 100,
      };
      const res = isOwner
        ? await operasionalService.getTransaksiOwner(query)
        : await posService.getRiwayatTransaksi(query);
      setTransactions(res?.items || []);
      setTxSummary(res?.ringkasan || null);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat riwayat transaksi");
    } finally {
      setLoading(false);
    }
  }, [isOwner, debouncedSearch, kasirFilter, metodeFilter, statusFilter, tanggalMulai, tanggalAkhir, toast]);

  useEffect(() => {
    if (!active || authLoading || !user) return;
    fetchTransactions();
  }, [active, authLoading, user, fetchTransactions, refreshSignal]);

  const loadFullTx = (id: string) =>
    isOwner ? operasionalService.getDetailTransaksiOwner(id) : posService.getDetailTransaksi(id);

  const handleViewDetail = async (tx: Transaksi) => {
    try {
      setSelectedTx(await loadFullTx(tx.id));
    } catch {
      setSelectedTx(tx);
    }
  };

  const handlePrintReceipt = async (tx: Transaksi) => {
    try {
      const fullTx = await loadFullTx(tx.id);
      const fallback = isOwner ? "Petugas Toko" : user?.nama_lengkap || "Kasir";
      setReceiptData(mapTransaksiToReceiptData(fullTx, fallback));
      setReceiptOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat detail struk");
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidTarget) return;
    if (!isOwner && !/^\d{6}$/.test(pinInput)) {
      toast.error("Masukkan PIN 6-digit untuk otorisasi pembatalan transaksi");
      return;
    }
    if (!voidReason.trim()) {
      toast.error("Alasan pembatalan nota wajib diisi");
      return;
    }

    setVoidLoading(true);
    try {
      if (isOwner) {
        await operasionalService.voidTransaksiOwner(voidTarget.id, voidReason.trim());
      } else {
        await posService.voidTransaksi(voidTarget.id, voidReason.trim(), pinInput);
      }
      const noFaktur = voidTarget.no_transaksi || voidTarget.nomor_faktur || "";
      toast.success(`Transaksi ${noFaktur} berhasil dibatalkan & stok dikembalikan.`);
      setVoidTarget(null);
      setVoidReason("");
      setPinInput("");
      fetchTransactions();
    } catch (err: any) {
      toast.error(err?.message || "Gagal membatalkan transaksi");
    } finally {
      setVoidLoading(false);
    }
  };

  const completedTx = transactions.filter((t) => t.status === "selesai");
  const voidedTx = transactions.filter((t) => t.status === "batal");
  const totalFaktur = txSummary?.total_faktur ?? transactions.length;
  const totalSelesai = txSummary?.total_selesai ?? completedTx.length;
  const totalVoid = txSummary?.total_batal ?? voidedTx.length;
  const totalOmzet = txSummary?.total_omzet ?? completedTx.reduce((s, t) => s + Number(t.total || 0), 0);
  const totalLaba =
    txSummary?.total_laba_kotor ?? completedTx.reduce((s, t) => s + Number((t as any).laba_kotor || 0), 0);

  const hasFilter = Boolean(search || kasirFilter || metodeFilter || statusFilter || tanggalMulai || tanggalAkhir);

  return (
    <div className="space-y-4 font-body">
      {/* KPI Summary */}
      <div className={`grid gap-2.5 ${isOwner ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"}`}>
        <div className="p-3 rounded-xl bg-card border-2 border-fg shadow-pop-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] text-muted-fg block">
              {isOwner ? "Total Nota Terfilter" : "Total Transaksi Saya"}
            </span>
            <strong className="font-heading text-lg font-extrabold text-fg">{totalFaktur} Faktur</strong>
            {isOwner && (
              <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                {totalSelesai} Transaksi Selesai
              </span>
            )}
          </div>
          {!isOwner && <Badge variant="purple">{totalSelesai} Berhasil</Badge>}
        </div>

        <div className="p-3 rounded-xl bg-card border-2 border-fg shadow-pop-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] text-muted-fg block">
              {isOwner ? "Total Nilai Penjualan" : "Total Penjualan Bersih"}
            </span>
            <strong className="font-heading text-lg font-extrabold text-accent">
              {formatRupiah(totalOmzet)}
            </strong>
            {isOwner && (
              <span className="text-[10px] text-muted-fg block mt-0.5">Seluruh Kasir &amp; Owner</span>
            )}
          </div>
          {!isOwner && <Badge variant="green">Selesai</Badge>}
        </div>

        {isOwner && (
          <div className="p-3 rounded-xl bg-card border-2 border-fg shadow-pop-soft">
            <span className="text-[11px] text-muted-fg block">Estimasi Laba Kotor</span>
            <strong className="font-heading text-lg font-extrabold text-emerald-600">
              {formatRupiah(totalLaba)}
            </strong>
            <span className="text-[10px] text-muted-fg block mt-0.5">Penjualan dikurangi HPP</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-card border-2 border-fg shadow-pop-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] text-muted-fg block">Dibatalkan (Void)</span>
            <strong className="font-heading text-lg font-extrabold text-red-600">{totalVoid} Faktur</strong>
            {isOwner && (
              <span className="text-[10px] text-muted-fg block mt-0.5">Stok otomatis dikembalikan</span>
            )}
          </div>
          {!isOwner && <Badge variant="red">Void</Badge>}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-card p-3 rounded-xl border-2 border-fg shadow-pop-soft">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor faktur..."
            className="w-full pl-9 pr-3 py-2 border-2 border-border rounded-full text-xs outline-none focus:border-accent bg-card"
          />
        </div>

        {isOwner && (
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-muted-fg hidden sm:inline" />
            <select
              value={kasirFilter}
              onChange={(e) => setKasirFilter(e.target.value)}
              className="px-3 py-2 border-2 border-border rounded-full text-xs bg-card font-medium"
            >
              <option value="">Semua Kasir &amp; Owner</option>
              {user?.id && <option value={user.id}>{user.nama_lengkap} (Owner)</option>}
              {cashierList
                .filter((c) => c.id !== user?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama_lengkap} (Kasir)
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="w-3.5 h-3.5 text-muted-fg hidden sm:inline" />
          <input
            type="date"
            value={tanggalMulai}
            onChange={(e) => setTanggalMulai(e.target.value)}
            className="px-2.5 py-1.5 border-2 border-border rounded-full text-xs bg-card"
            title="Tanggal Mulai"
          />
          <span className="text-muted-fg">–</span>
          <input
            type="date"
            value={tanggalAkhir}
            onChange={(e) => setTanggalAkhir(e.target.value)}
            className="px-2.5 py-1.5 border-2 border-border rounded-full text-xs bg-card"
            title="Tanggal Akhir"
          />
        </div>

        <select
          value={metodeFilter}
          onChange={(e) => setMetodeFilter(e.target.value)}
          className="px-3 py-2 border-2 border-border rounded-full text-xs bg-card font-medium"
        >
          <option value="">Semua Metode Bayar</option>
          <option value="tunai">Tunai</option>
          <option value="qris">QRIS</option>
          <option value="split">Split (Gabungan)</option>
          <option value="bon">Kas Bon (Piutang)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border-2 border-border rounded-full text-xs bg-card font-medium"
        >
          <option value="">Semua Status</option>
          <option value="selesai">Selesai</option>
          <option value="batal">Dibatalkan (Void)</option>
        </select>

        <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchTransactions}>
          Muat Ulang
        </Button>

        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setKasirFilter("");
              setMetodeFilter("");
              setStatusFilter("");
              setTanggalMulai("");
              setTanggalAkhir("");
            }}
            className="px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-muted/80 text-xs font-bold text-muted-fg hover:text-fg cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border-2 border-fg rounded-xl overflow-hidden shadow-pop-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                <th className="p-3">No. Faktur</th>
                <th className="p-3">Waktu</th>
                {isOwner && <th className="p-3">Petugas / Kasir</th>}
                <th className="p-3">Pelanggan</th>
                <th className="p-3">Metode</th>
                <th className="p-3">Total Belanja</th>
                {isOwner && <th className="p-3">Laba Kotor</th>}
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isOwner ? 9 : 7} className="p-8 text-center text-muted-fg">
                    Memuat riwayat transaksi...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 9 : 7} className="p-8 text-center text-muted-fg">
                    Tidak ada transaksi ditemukan pada filter ini.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isOwnerTx = tx.kasir_id === user?.id;
                  return (
                    <tr key={tx.id} className="border-b border-border hover:bg-muted/40">
                      <td className="p-3 font-mono font-bold">
                        {tx.no_transaksi || tx.nomor_faktur || tx.id}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {formatTanggal(tx.tgl_transaksi || tx.dibuat_pada)} ·{" "}
                        {formatWaktu(tx.tgl_transaksi || tx.dibuat_pada)}
                      </td>
                      {isOwner && (
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">
                              {tx.kasir?.nama_lengkap || (isOwnerTx ? "Owner" : "Kasir")}
                            </span>
                            <Badge variant={isOwnerTx ? "purple" : "gray"} className="text-[9px]">
                              {isOwnerTx ? "Owner" : "Kasir"}
                            </Badge>
                          </div>
                        </td>
                      )}
                      <td className="p-3 font-medium">{tx.pelanggan?.nama || "Pelanggan Umum"}</td>
                      <td className="p-3 uppercase font-semibold">{tx.metode_bayar}</td>
                      <td className="p-3 font-bold text-accent">{formatRupiah(tx.total)}</td>
                      {isOwner && (
                        <td className="p-3 font-semibold text-emerald-600">
                          {formatRupiah(Number((tx as any).laba_kotor || 0))}
                        </td>
                      )}
                      <td className="p-3">
                        <Badge variant={tx.status === "selesai" ? "green" : "red"}>
                          {tx.status === "selesai" ? "Berhasil" : "Dibatalkan"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button size="sm" variant="ghost" icon={Eye} onClick={() => handleViewDetail(tx)} title="Detail Faktur" />
                          <Button size="sm" variant="ghost" icon={Printer} onClick={() => handlePrintReceipt(tx)} title="Cetak Ulang Struk" />
                          {tx.status === "selesai" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={RotateCcw}
                              onClick={() => {
                                setVoidTarget(tx);
                                setVoidReason("");
                                setPinInput("");
                              }}
                              title="Batalkan / Void Transaksi"
                            />
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
      </div>

      <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} onPrintReceipt={handlePrintReceipt} />

      <TransactionVoidModal
        target={voidTarget}
        requirePin={!isOwner}
        reason={voidReason}
        pin={pinInput}
        loading={voidLoading}
        onChangeReason={setVoidReason}
        onChangePin={setPinInput}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleConfirmVoid}
      />

      <ThermalReceiptModal open={receiptOpen} onClose={() => setReceiptOpen(false)} data={receiptData} />
    </div>
  );
}
