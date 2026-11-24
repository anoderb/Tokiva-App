"use client";

import { useState, useEffect, useCallback } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/components/auth/auth-provider";
import { operasionalService } from "@/lib/services/operasional.service";
import { laporanService, type LaporanLabaRugiData } from "@/lib/services/laporan.service";
import { formatRupiah, formatTanggalWaktu } from "@/lib/format";
import type { ArusKas } from "@/types/api";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Save,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

export default function KeuanganPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [arusKasList, setArusKasList] = useState<ArusKas[]>([]);
  const [ringkasan, setRingkasan] = useState({
    total_masuk: 0,
    total_keluar: 0,
    saldo_bersih: 0,
  });
  const [labaRugi, setLabaRugi] = useState<LaporanLabaRugiData | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Tambah Arus Kas
  const [modalOpen, setModalOpen] = useState(false);
  const [jenis, setJenis] = useState<"masuk" | "keluar">("keluar");
  const [kategori, setKategori] = useState("Biaya Operasional");
  const [nominal, setNominal] = useState<number>(0);
  const [keterangan, setKeterangan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadFinance = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, sumRes, lrRes] = await Promise.all([
        operasionalService.getArusKas({ limit: 50 }),
        operasionalService.getRingkasanArusKas().catch(() => ({
          total_masuk: 0,
          total_keluar: 0,
          saldo_bersih: 0,
        })),
        laporanService.getLaporanLabaRugi().catch(() => null),
      ]);
      setArusKasList(listRes?.items || []);
      setRingkasan(sumRes);
      setLabaRugi(lrRes);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat data keuangan");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && user) {
      loadFinance();
    }
  }, [authLoading, user, loadFinance]);

  const handleSaveArusKas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nominal || nominal <= 0) {
      toast.error("Nominal harus lebih dari Rp0");
      return;
    }
    setSubmitting(true);
    try {
      await operasionalService.tambahArusKas({
        jenis,
        kategori,
        nominal: Number(nominal),
        keterangan: keterangan.trim() || kategori,
      });
      toast.success("Catatan arus kas berhasil disimpan!");
      setModalOpen(false);
      setNominal(0);
      setKeterangan("");
      loadFinance();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan catatan kas");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OwnerLayout
      title="Buku Kas & Laporan Laba Rugi"
      desc="Pantau arus kas masuk/keluar operasional serta perhitungan laba bersih toko."
    >
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <StatCard
          icon={ArrowUpRight}
          value={formatRupiah(ringkasan.total_masuk)}
          label="Total Kas Masuk"
        />
        <StatCard
          icon={ArrowDownRight}
          value={formatRupiah(ringkasan.total_keluar)}
          label="Total Kas Keluar"
        />
        <StatCard
          icon={Wallet}
          value={formatRupiah(ringkasan.saldo_bersih)}
          label="Saldo Kas Bersih"
        />
        <StatCard
          icon={TrendingUp}
          value={formatRupiah(labaRugi?.laba_bersih || 0)}
          label="Estimasi Laba Bersih"
        />
      </div>

      {/* Ringkasan Laba Rugi */}
      {labaRugi && (
        <div className="bg-card border-2 border-fg rounded-xl p-4 shadow-pop-soft mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-muted-fg block">Penjualan Bersih</span>
            <strong className="text-sm font-bold">{formatRupiah(labaRugi.penjualan_bersih)}</strong>
          </div>
          <div>
            <span className="text-muted-fg block">Harga Pokok Penjualan (HPP)</span>
            <strong className="text-sm font-bold text-red-600">
              -{formatRupiah(labaRugi.hpp_total)}
            </strong>
          </div>
          <div>
            <span className="text-muted-fg block">Laba Kotor ({labaRugi.margin_kotor_persen}%)</span>
            <strong className="text-sm font-bold text-emerald-600">
              {formatRupiah(labaRugi.laba_kotor)}
            </strong>
          </div>
          <div>
            <span className="text-muted-fg block">Beban Operasional</span>
            <strong className="text-sm font-bold text-red-600">
              -{formatRupiah(labaRugi.beban_operasional)}
            </strong>
          </div>
        </div>
      )}

      <SectionCard
        title="Jurnal Mutasi Arus Kas"
        customAction={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" icon={RefreshCw} onClick={loadFinance} />
            <Button size="sm" icon={Plus} onClick={() => setModalOpen(true)}>
              Catat Kas Masuk / Keluar
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto border-2 border-fg rounded-md">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                <th className="p-2.5">Waktu</th>
                <th className="p-2.5">Jenis</th>
                <th className="p-2.5">Kategori</th>
                <th className="p-2.5">Keterangan</th>
                <th className="p-2.5 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-fg">
                    Memuat buku kas...
                  </td>
                </tr>
              ) : arusKasList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-fg">
                    Belum ada catatan arus kas.
                  </td>
                </tr>
              ) : (
                arusKasList.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/40">
                    <td className="p-2.5">{formatTanggalWaktu(item.waktu)}</td>
                    <td className="p-2.5">
                      <Badge variant={item.jenis === "masuk" ? "green" : "red"}>
                        {item.jenis === "masuk" ? "Kas Masuk" : "Kas Keluar"}
                      </Badge>
                    </td>
                    <td className="p-2.5 font-semibold">{item.kategori}</td>
                    <td className="p-2.5 text-muted-fg">{item.keterangan || "-"}</td>
                    <td
                      className={`p-2.5 text-right font-bold ${
                        item.jenis === "masuk" ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {item.jenis === "masuk" ? "+" : "-"}
                      {formatRupiah(item.nominal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* MODAL CATAT ARUS KAS */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Catat Kas Masuk / Keluar"
        className="max-w-md"
      >
        <form onSubmit={handleSaveArusKas} className="space-y-3 text-xs">
          <div>
            <label className="font-bold block mb-1">Jenis Mutasi Kas</label>
            <select
              value={jenis}
              onChange={(e) => setJenis(e.target.value as any)}
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            >
              <option value="keluar">Kas Keluar (Pengeluaran / Beban)</option>
              <option value="masuk">Kas Masuk (Pemasukan Tambahan)</option>
            </select>
          </div>
          <div>
            <label className="font-bold block mb-1">Kategori</label>
            <input
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              placeholder="Contoh: Listrik & Air / Gaji / Modal Tambahan"
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            />
          </div>
          <div>
            <label className="font-bold block mb-1">Nominal (Rp) *</label>
            <input
              type="number"
              required
              min={1}
              value={nominal || ""}
              onChange={(e) => setNominal(Number(e.target.value))}
              className="w-full px-3 py-2 border-2 border-border rounded font-bold text-sm bg-card"
            />
          </div>
          <div>
            <label className="font-bold block mb-1">Keterangan</label>
            <input
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="w-full px-3 py-2 border-2 border-border rounded bg-card"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" icon={Save} disabled={submitting}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </OwnerLayout>
  );
}
