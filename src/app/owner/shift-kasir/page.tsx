"use client";

import { useState, useEffect, useCallback } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { Modal } from "@/components/ui/modal";
import { shiftService } from "@/lib/services/shift.service";
import { formatRupiah, formatTanggal, formatWaktu, hitungDurasi } from "@/lib/format";
import type { ShiftKasir } from "@/types/api";
import {
  Clock,
  Wallet,
  ReceiptText,
  Calculator,
  Eye,
  RefreshCw,
} from "lucide-react";

export default function ShiftKasirPage() {
  const [shifts, setShifts] = useState<ShiftKasir[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<ShiftKasir | null>(null);

  const loadShifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await shiftService.getRiwayatShiftOwner({ limit: 50 });
      setShifts(res?.items || []);
    } catch {
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const activeShifts = shifts.filter((s) => s.status === "terbuka" || (s.status as any) === "buka");
  const totalPenjualanShift = shifts.reduce(
    (sum, s) =>
      sum +
      Number(s.total_penjualan_tunai || 0) +
      Number(s.total_penjualan_non_tunai || 0),
    0
  );

  return (
    <OwnerLayout
      title="Audit Shift Kasir"
      desc="Pantau aktivitas shift kasir, modal awal laci, transaksi tunai/non-tunai, dan selisih kas."
    >
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <StatCard icon={Clock} value={String(activeShifts.length)} label="Shift Aktif" />
        <StatCard icon={Calculator} value={String(shifts.length)} label="Total Sesi Shift" />
        <StatCard
          icon={Wallet}
          value={formatRupiah(activeShifts[0]?.modal_awal || 0)}
          label="Modal Shift Aktif"
        />
        <StatCard
          icon={ReceiptText}
          value={formatRupiah(totalPenjualanShift)}
          label="Akumulasi Penjualan Shift"
        />
      </div>

      {activeShifts.map((aktif) => (
        <div
          key={aktif.id}
          className="bg-lime-50 dark:bg-emerald-950/30 border-2 border-fg rounded-lg p-3 sm:p-4 shadow-pop-soft mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex-1">
            <Badge variant="green" className="mb-1">
              Shift Sedang Berlangsung
            </Badge>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mt-2 text-xs">
              <div>
                <span className="text-muted-fg">Kasir:</span>{" "}
                <strong>{aktif.kasir?.nama_lengkap || "Kasir"}</strong>
              </div>
              <div>
                <span className="text-muted-fg">Mulai:</span>{" "}
                <strong>{formatWaktu(aktif.waktu_buka)}</strong>
              </div>
              <div>
                <span className="text-muted-fg">Durasi:</span>{" "}
                <strong>{hitungDurasi(aktif.waktu_buka)}</strong>
              </div>
              <div>
                <span className="text-muted-fg">Modal Awal:</span>{" "}
                <strong>{formatRupiah(aktif.modal_awal)}</strong>
              </div>
              <div>
                <span className="text-muted-fg">Penjualan Tunai:</span>{" "}
                <strong className="text-accent">
                  {formatRupiah(aktif.total_penjualan_tunai)}
                </strong>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            icon={Eye}
            onClick={() => setSelectedShift(aktif)}
            className="w-full sm:w-auto shrink-0"
          >
            Lihat Detail
          </Button>
        </div>
      ))}

      <SectionCard
        title="Riwayat Seluruh Sesi Shift Kasir"
        customAction={
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={loadShifts}>
            Muat Ulang
          </Button>
        }
      >
        <div className="overflow-x-auto border-2 border-fg rounded-md">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                <th className="p-2.5">Kasir</th>
                <th className="p-2.5">Tanggal</th>
                <th className="p-2.5">Mulai</th>
                <th className="p-2.5">Selesai</th>
                <th className="p-2.5">Modal Awal</th>
                <th className="p-2.5">Total Penjualan</th>
                <th className="p-2.5">Selisih Kas</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-muted-fg">
                    Memuat data shift...
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-muted-fg">
                    Belum ada riwayat shift kasir.
                  </td>
                </tr>
              ) : (
                shifts.map((s) => {
                  const omzet =
                    Number(s.total_penjualan_tunai || 0) +
                    Number(s.total_penjualan_non_tunai || 0);
                  const selisih =
                    s.selisih_kas !== null && s.selisih_kas !== undefined
                      ? Number(s.selisih_kas)
                      : null;

                  return (
                    <tr key={s.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-2.5 font-semibold">
                        {s.kasir?.nama_lengkap || "Kasir"}
                      </td>
                      <td className="p-2.5">{formatTanggal(s.waktu_buka)}</td>
                      <td className="p-2.5">{formatWaktu(s.waktu_buka)}</td>
                      <td className="p-2.5">
                        {s.waktu_tutup ? formatWaktu(s.waktu_tutup) : "-"}
                      </td>
                      <td className="p-2.5">{formatRupiah(s.modal_awal)}</td>
                      <td className="p-2.5 font-semibold text-accent">
                        {formatRupiah(omzet)}
                      </td>
                      <td className="p-2.5 font-bold">
                        {selisih === null ? (
                          "-"
                        ) : selisih === 0 ? (
                          <span className="text-emerald-600">Rp0</span>
                        ) : (
                          <span className={selisih > 0 ? "text-sky-600" : "text-red-600"}>
                            {selisih > 0 ? "+" : ""}
                            {formatRupiah(selisih)}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <Badge variant={s.status === "terbuka" ? "green" : "gray"}>
                          {s.status === "terbuka" ? "Aktif" : "Selesai"}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Eye}
                          onClick={() => setSelectedShift(s)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Modal
        open={Boolean(selectedShift)}
        onClose={() => setSelectedShift(null)}
        title="Rincian Audit Shift Kasir"
        className="max-w-md"
      >
        {selectedShift && (
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded bg-muted border border-border space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-fg">Kasir:</span>
                <strong>{selectedShift.kasir?.nama_lengkap || "Kasir"}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-fg">Waktu Buka:</span>
                <strong>
                  {formatTanggal(selectedShift.waktu_buka)} {formatWaktu(selectedShift.waktu_buka)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-fg">Modal Awal:</span>
                <strong>{formatRupiah(selectedShift.modal_awal)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-fg">Penjualan Tunai:</span>
                <strong className="text-emerald-600">
                  {formatRupiah(selectedShift.total_penjualan_tunai)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-fg">Penjualan Non-Tunai (QRIS):</span>
                <strong className="text-sky-600">
                  {formatRupiah(selectedShift.total_penjualan_non_tunai)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-fg">Kas Keluar:</span>
                <strong className="text-red-600">
                  -{formatRupiah(selectedShift.total_kas_keluar)}
                </strong>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedShift(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </OwnerLayout>
  );
}
