"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ProductImage } from "@/components/shared/product-image";
import { BarcodeScannerModal } from "@/components/shared/barcode-scanner-modal";
import { produkService } from "@/lib/services/produk.service";
import { formatRupiah, formatTanggalWaktu } from "@/lib/format";
import type { MutasiStok, Produk, Kategori } from "@/types/api";
import {
  Boxes,
  Search,
  AlertTriangle,
  Save,
  Package,
  RefreshCw,
  History,
  Scan,
  ChevronLeft,
  ChevronRight,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Filter,
  X,
  ClipboardList,
} from "lucide-react";

const PAGE_SIZE = 15;

export default function PersediaanPage() {
  const { toast } = useToast();

  // Active Tab: 'stok' = Katalog Stok & Valuasi Persediaan | 'mutasi' = Log Audit Mutasi
  const [activeTab, setActiveTab] = useState<"stok" | "mutasi">("stok");

  // State: Tab Stok Fisik & Valuasi
  const [products, setProducts] = useState<Produk[]>([]);
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"semua" | "menipis" | "habis" | "aman">("semua");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    total_pages: 1,
  });

  // State: Tab Mutasi Stok
  const [mutasiList, setMutasiList] = useState<MutasiStok[]>([]);
  const [loadingMutasi, setLoadingMutasi] = useState(false);
  const [mutasiJenisFilter, setMutasiJenisFilter] = useState<string>("");
  const [mutasiPage, setMutasiPage] = useState(1);
  const [mutasiPagination, setMutasiPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    total_pages: 1,
  });

  // Barcode Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Modal Stok Opname
  const [opnameTarget, setOpnameTarget] = useState<Produk | null>(null);
  const [stokFisik, setStokFisik] = useState<number>(0);
  const [jenisOpname, setJenisOpname] = useState<"opname" | "koreksi" | "rusak">("opname");
  const [alasanOpname, setAlasanOpname] = useState("");
  const [submittingOpname, setSubmittingOpname] = useState(false);

  const [summaryStats, setSummaryStats] = useState({
    total_sku: 0,
    aman: 0,
    menipis: 0,
    habis: 0,
    totalValuasi: 0,
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load Categories once
  useEffect(() => {
    produkService
      .getKategori()
      .then((cats) => setCategories(cats || []))
      .catch(() => {});
  }, []);

  // Fetch Inventory (Tab Stok) with server-side stock filter & store-wide KPI summary
  const loadInventory = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await produkService.getProduk({
        search: debouncedSearch.trim() || undefined,
        kategori_id: categoryFilter || undefined,
        status_stok: statusFilter !== "semua" ? statusFilter : undefined,
        limit: PAGE_SIZE,
        page: currentPage,
      });

      const items = res?.items || [];
      setProducts(items);
      if (res?.ringkasan_stok) {
        setSummaryStats({
          total_sku: Number(res.ringkasan_stok.total_sku || 0),
          aman: Number(res.ringkasan_stok.aman || 0),
          menipis: Number(res.ringkasan_stok.menipis || 0),
          habis: Number(res.ringkasan_stok.habis || 0),
          totalValuasi: Number(res.ringkasan_stok.total_valuasi || 0),
        });
      }
      setPagination({
        total: res?.pagination?.total ?? items.length,
        page: Number(res?.pagination?.page || currentPage),
        limit: Number(res?.pagination?.limit || PAGE_SIZE),
        total_pages: Math.max(1, Number(res?.pagination?.total_pages || 1)),
      });
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat katalog stok");
    } finally {
      setLoadingProducts(false);
    }
  }, [debouncedSearch, categoryFilter, statusFilter, currentPage, toast]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Fetch Mutasi Log (Tab Mutasi) with pagination
  const loadMutasi = useCallback(async () => {
    setLoadingMutasi(true);
    try {
      const res = await produkService.getMutasiStok({
        jenis: mutasiJenisFilter || undefined,
        limit: PAGE_SIZE,
        page: mutasiPage,
      });

      setMutasiList(res?.items || []);
      setMutasiPagination({
        total: res?.pagination?.total ?? (res?.items?.length || 0),
        page: Number(res?.pagination?.page || mutasiPage),
        limit: Number(res?.pagination?.limit || PAGE_SIZE),
        total_pages: Math.max(1, Number(res?.pagination?.total_pages || 1)),
      });
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat log mutasi stok");
    } finally {
      setLoadingMutasi(false);
    }
  }, [mutasiJenisFilter, mutasiPage, toast]);

  useEffect(() => {
    if (activeTab === "mutasi") {
      loadMutasi();
    }
  }, [activeTab, loadMutasi]);

  // Handle Barcode Scan Result
  const handleBarcodeScan = (scannedCode: string) => {
    setSearch(scannedCode);
    setCurrentPage(1);
    toast.success(`Barcode ${scannedCode} dipindai, memfilter stok...`);
  };

  // Open Opname Modal
  const handleOpenOpname = (p: Produk) => {
    setOpnameTarget(p);
    setStokFisik(Number(p.stok || 0));
    setJenisOpname("opname");
    setAlasanOpname("");
  };

  // Submit Opname
  const handleSaveOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opnameTarget) return;
    setSubmittingOpname(true);
    try {
      await produkService.opnameStok({
        produk_id: opnameTarget.id,
        stok_fisik: Number(stokFisik),
        jenis: jenisOpname,
        alasan: alasanOpname.trim() || `Stok opname ${jenisOpname}`,
      });

      toast.success(
        `Stok "${opnameTarget.nama}" berhasil diperbarui menjadi ${stokFisik} ${opnameTarget.satuan_dasar}!`
      );
      setOpnameTarget(null);
      loadInventory();
      if (activeTab === "mutasi") loadMutasi();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan penyesuaian stok");
    } finally {
      setSubmittingOpname(false);
    }
  };

  // Fallback if backend summary wasn't provided yet
  const summary = useMemo(() => {
    if (summaryStats.total_sku > 0 || products.length === 0) {
      return summaryStats;
    }
    let aman = 0;
    let menipis = 0;
    let habis = 0;
    let totalValuasi = 0;

    products.forEach((p) => {
      const stok = Number(p.stok || 0);
      const min = Number(p.stok_min ?? 10);
      const modal = Number(p.harga_modal || 0);

      if (stok <= 0) habis++;
      else if (stok <= min) menipis++;
      else aman++;

      if (stok > 0 && modal > 0) {
        totalValuasi += stok * modal;
      }
    });

    return { total_sku: products.length, aman, menipis, habis, totalValuasi };
  }, [products, summaryStats]);

  // Difference in Opname
  const opnameSelisih = useMemo(() => {
    if (!opnameTarget) return 0;
    return Number(stokFisik || 0) - Number(opnameTarget.stok || 0);
  }, [opnameTarget, stokFisik]);

  return (
    <OwnerLayout
      title="Persediaan & Valuasi Stok"
      desc="Pantau ketersediaan fisik stok toko, valuasi aset persediaan FIFO, dan rekonsiliasi audit opname."
    >
      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
        <StatCard
          icon={Package}
          value={String(summary.total_sku || pagination.total || products.length)}
          label="Total SKU Produk"
        />
        <StatCard
          icon={CheckCircle2}
          value={String(summary.aman)}
          label="Stok Aman"
        />
        <StatCard
          icon={AlertTriangle}
          value={String(summary.menipis)}
          label="Stok Menipis"
        />
        <StatCard
          icon={AlertTriangle}
          value={String(summary.habis)}
          label="Stok Habis (Kosong)"
        />
        <div className="col-span-2 md:col-span-1 xl:col-span-1">
          <StatCard
            icon={DollarSign}
            value={formatRupiah(summary.totalValuasi)}
            label="Valuasi Aset HPP"
          />
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex items-center gap-2 mb-4 border-b-2 border-border pb-2">
        <button
          onClick={() => setActiveTab("stok")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer border-2 ${
            activeTab === "stok"
              ? "bg-accent text-accent-fg border-fg shadow-sm"
              : "bg-card text-muted-fg border-transparent hover:border-border hover:text-fg"
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Katalog Stok & Valuasi Persediaan</span>
        </button>
        <button
          onClick={() => setActiveTab("mutasi")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer border-2 ${
            activeTab === "mutasi"
              ? "bg-accent text-accent-fg border-fg shadow-sm"
              : "bg-card text-muted-fg border-transparent hover:border-border hover:text-fg"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Audit Mutasi Stok</span>
        </button>
      </div>

      {/* TAB 1: KATALOG STOK & VALUASI */}
      {activeTab === "stok" && (
        <SectionCard
          title="Daftar Stok Fisik & Valuasi Barang"
          customAction={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                icon={RefreshCw}
                onClick={loadInventory}
                disabled={loadingProducts}
              >
                Segarkan
              </Button>
            </div>
          }
        >
          {/* SEARCH & FILTERS BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Search with Barcode Scanner Button */}
              <div className="relative flex items-center min-w-[260px] max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari produk, barcode, atau SKU..."
                  className="w-full pl-9 pr-10 py-2 border-2 border-border rounded-full text-xs outline-none focus:border-accent bg-card"
                />
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="absolute right-2 p-1 text-muted-fg hover:text-accent rounded-full transition-colors cursor-pointer"
                  title="Pindai barcode kamera"
                >
                  <Scan className="w-4 h-4" />
                </button>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border-2 border-border rounded-full text-xs font-semibold bg-card outline-none focus:border-accent"
              >
                <option value="semua">Semua Status Stok</option>
                <option value="menipis">⚠️ Stok Menipis</option>
                <option value="habis">🚫 Stok Habis (0)</option>
                <option value="aman">✅ Stok Aman</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border-2 border-border rounded-full text-xs font-semibold bg-card outline-none focus:border-accent"
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama}
                  </option>
                ))}
              </select>

              {(search || statusFilter !== "semua" || categoryFilter) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("semua");
                    setCategoryFilter("");
                    setCurrentPage(1);
                  }}
                  className="p-2 text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Reset Filter"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-muted-fg font-medium">
              Maks. 15 produk per halaman (FIFO Costing)
            </div>
          </div>

          {/* TABLE STOK */}
          <div className="overflow-x-auto border-2 border-fg rounded-lg bg-card">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                  <th className="p-3 w-10 text-center">No</th>
                  <th className="p-3">Produk & Identitas</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3 text-center">Stok Fisik</th>
                  <th className="p-3 text-center">Batas Min</th>
                  <th className="p-3 text-right">HPP Dasar</th>
                  <th className="p-3 text-right">Total Valuasi Aset</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loadingProducts ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-fg">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-accent" />
                      Memuat data katalog stok & persediaan...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-fg">
                      Tidak ada produk yang cocok dengan pencarian atau filter.
                    </td>
                  </tr>
                ) : (
                  products.map((p, idx) => {
                    const rowNumber = (currentPage - 1) * PAGE_SIZE + (idx + 1);
                    const stok = Number(p.stok || 0);
                    const min = Number(p.stok_min ?? 10);
                    const modal = Number(p.harga_modal || 0);
                    const valuasi = stok * modal;

                    const status =
                      stok <= 0 ? "Habis" : stok <= min ? "Menipis" : "Aman";

                    return (
                      <tr
                        key={p.id}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 text-center text-muted-fg font-mono">
                          {rowNumber}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <ProductImage
                              src={p.foto_url}
                              alt={p.nama}
                              className="w-9 h-9 rounded-md border border-border shrink-0 object-cover"
                              iconClassName="w-4 h-4"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-fg truncate">
                                {p.nama}
                              </div>
                              <div className="text-[10px] text-muted-fg font-mono flex items-center gap-1.5 mt-0.5">
                                <span>SKU: {p.sku || "-"}</span>
                                <span>•</span>
                                <span>Barcode: {p.barcode || "-"}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="gray">
                            {p.kategori?.nama || "Umum"}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1 font-bold text-sm">
                            <span
                              className={
                                stok <= 0
                                  ? "text-red-600 font-extrabold"
                                  : stok <= min
                                  ? "text-amber-600 font-bold"
                                  : "text-emerald-700 font-bold"
                              }
                            >
                              {stok}
                            </span>
                            <span className="text-[11px] text-muted-fg font-normal">
                              {p.satuan_dasar}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center text-muted-fg font-mono">
                          {min} {p.satuan_dasar}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-fg">
                          {formatRupiah(modal)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-fg">
                          {formatRupiah(valuasi)}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={
                              status === "Aman"
                                ? "green"
                                : status === "Menipis"
                                ? "yellow"
                                : "red"
                            }
                          >
                            {status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenOpname(p)}
                            className="font-bold text-xs"
                          >
                            Stok Opname
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION TAB 1 (STRICT 15 LIMIT) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-2 border-t border-border text-xs text-muted-fg">
            <div>
              Menampilkan{" "}
              <strong className="text-fg">
                {products.length === 0
                  ? 0
                  : (currentPage - 1) * PAGE_SIZE + 1}
                -
                {(currentPage - 1) * PAGE_SIZE + products.length}
              </strong>{" "}
              dari <strong className="text-fg">{pagination.total}</strong> produk
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1 || loadingProducts}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Sebelumnya
              </Button>
              <span className="px-3 py-1 font-bold text-xs bg-muted border border-border rounded">
                Hal {currentPage} / {pagination.total_pages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= pagination.total_pages || loadingProducts}
                onClick={() =>
                  setCurrentPage((p) => Math.min(pagination.total_pages, p + 1))
                }
              >
                Berikutnya
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* TAB 2: RIWAYAT MUTASI STOK */}
      {activeTab === "mutasi" && (
        <SectionCard
          title="Log Audit & Jejak Pergerakan Stok (Mutasi)"
          customAction={
            <Button
              size="sm"
              variant="outline"
              icon={RefreshCw}
              onClick={loadMutasi}
              disabled={loadingMutasi}
            >
              Segarkan
            </Button>
          }
        >
          {/* FILTER BAR MUTASI */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-fg">Filter Jenis:</span>
              <select
                value={mutasiJenisFilter}
                onChange={(e) => {
                  setMutasiJenisFilter(e.target.value);
                  setMutasiPage(1);
                }}
                className="px-3 py-1.5 border-2 border-border rounded-full text-xs font-semibold bg-card outline-none focus:border-accent"
              >
                <option value="">Semua Pergerakan (All)</option>
                <option value="kulakan">Kulakan / Pembelian (+)</option>
                <option value="penjualan">Penjualan Kasir POS (-)</option>
                <option value="retur">Retur ke Supplier (-)</option>
                <option value="penyesuaian">Penyesuaian Opname (±)</option>
                <option value="batal_jual">Batal Jual (+)</option>
                <option value="rusak">Barang Rusak (-)</option>
              </select>
            </div>

            <div className="text-[11px] text-muted-fg font-medium">
              Audit log real-time • Maks. 15 mutasi per halaman
            </div>
          </div>

          {/* TABLE MUTASI */}
          <div className="overflow-x-auto border-2 border-fg rounded-lg bg-card">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                  <th className="p-3 w-10 text-center">No</th>
                  <th className="p-3">Waktu & Tanggal</th>
                  <th className="p-3">Produk</th>
                  <th className="p-3 text-center">Jenis Aktivitas</th>
                  <th className="p-3 text-center">Stok Sebelum</th>
                  <th className="p-3 text-center">Perubahan (Qty)</th>
                  <th className="p-3 text-center">Stok Sesudah</th>
                  <th className="p-3">Keterangan / Dokumen Referensi</th>
                </tr>
              </thead>
              <tbody>
                {loadingMutasi ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-fg">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-accent" />
                      Memuat catatan riwayat mutasi stok...
                    </td>
                  </tr>
                ) : mutasiList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-fg">
                      Belum ada riwayat mutasi stok yang tercatat.
                    </td>
                  </tr>
                ) : (
                  mutasiList.map((m, idx) => {
                    const rowNumber =
                      (mutasiPage - 1) * PAGE_SIZE + (idx + 1);
                    const diff = Number(m.perubahan || 0);
                    const prodName = m.produk?.nama || "Produk Dihapus / Tidak Ada";
                    const satuan = m.produk?.satuan_dasar || "pcs";
                    const isPositive = diff >= 0;

                    // Badge styling based on mutasi jenis
                    let badgeVariant: "green" | "blue" | "yellow" | "red" | "gray" = "gray";
                    let badgeLabel: string = String(m.jenis);

                    if (m.jenis === "kulakan") {
                      badgeVariant = "green";
                      badgeLabel = "Kulakan (+)";
                    } else if (m.jenis === "penjualan") {
                      badgeVariant = "blue";
                      badgeLabel = "Penjualan POS (-)";
                    } else if (m.jenis === "penyesuaian" || m.jenis === "opname") {
                      badgeVariant = "yellow";
                      badgeLabel = "Stok Opname (±)";
                    } else if (m.jenis === "rusak") {
                      badgeVariant = "red";
                      badgeLabel = "Barang Rusak (-)";
                    } else if (m.jenis === "retur") {
                      badgeVariant = diff === 0 ? "yellow" : "red";
                      badgeLabel = diff === 0 ? "Retur Tukar (0)" : "Retur Supplier (-)";
                    } else if (m.jenis === "batal_jual") {
                      badgeVariant = "green";
                      badgeLabel = "Batal Jual (+)";
                    }

                    return (
                      <tr
                        key={m.id}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 text-center text-muted-fg font-mono">
                          {rowNumber}
                        </td>
                        <td className="p-3 text-muted-fg font-mono whitespace-nowrap">
                          {formatTanggalWaktu(m.waktu)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <ProductImage
                              src={m.produk?.foto_url}
                              alt={prodName}
                              className="w-7 h-7 rounded border border-border shrink-0 object-cover"
                              iconClassName="w-3.5 h-3.5"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-fg block truncate">
                                {prodName}
                              </span>
                              {m.produk?.barcode && (
                                <span className="text-[10px] text-muted-fg font-mono block">
                                  {m.produk.barcode}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
                        </td>
                        <td className="p-3 text-center font-mono text-muted-fg">
                          {m.stok_sebelum} {satuan}
                        </td>
                        <td className="p-3 text-center">
                          <div
                            className={`inline-flex items-center gap-0.5 font-bold font-mono px-2 py-0.5 rounded ${
                              isPositive
                                ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
                                : "text-red-700 bg-red-50 dark:bg-red-950/40"
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />
                            )}
                            <span>{isPositive ? `+${diff}` : diff}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-fg">
                          {m.stok_sesudah} {satuan}
                        </td>
                        <td className="p-3 text-muted-fg">
                          <span className="text-xs">
                            {m.keterangan || (m as any).catatan || "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION TAB 2 (STRICT 15 LIMIT) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-2 border-t border-border text-xs text-muted-fg">
            <div>
              Menampilkan{" "}
              <strong className="text-fg">
                {mutasiList.length === 0
                  ? 0
                  : (mutasiPage - 1) * PAGE_SIZE + 1}
                -
                {(mutasiPage - 1) * PAGE_SIZE + mutasiList.length}
              </strong>{" "}
              dari <strong className="text-fg">{mutasiPagination.total}</strong> riwayat mutasi
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={mutasiPage <= 1 || loadingMutasi}
                onClick={() => setMutasiPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Sebelumnya
              </Button>
              <span className="px-3 py-1 font-bold text-xs bg-muted border border-border rounded">
                Hal {mutasiPage} / {mutasiPagination.total_pages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  mutasiPage >= mutasiPagination.total_pages || loadingMutasi
                }
                onClick={() =>
                  setMutasiPage((p) =>
                    Math.min(mutasiPagination.total_pages, p + 1)
                  )
                }
              >
                Berikutnya
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* MODAL STOK OPNAME */}
      <Modal
        open={Boolean(opnameTarget)}
        onClose={() => setOpnameTarget(null)}
        title={`Stok Opname: ${opnameTarget?.nama || ""}`}
        className="max-w-md"
      >
        {opnameTarget && (
          <form onSubmit={handleSaveOpname} className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-muted border border-border space-y-1">
              <div className="flex justify-between items-center text-muted-fg">
                <span>Stok Sistem Saat Ini:</span>
                <strong className="text-sm text-fg font-mono">
                  {opnameTarget.stok} {opnameTarget.satuan_dasar}
                </strong>
              </div>
              <div className="flex justify-between items-center text-muted-fg text-[11px]">
                <span>HPP Modal Dasar:</span>
                <span className="font-mono">
                  {formatRupiah(opnameTarget.harga_modal)} / {opnameTarget.satuan_dasar}
                </span>
              </div>
            </div>

            <div>
              <label className="font-bold block mb-1">
                Jumlah Stok Fisik Aktual ({opnameTarget.satuan_dasar}) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={stokFisik}
                onChange={(e) => setStokFisik(Number(e.target.value))}
                className="w-full px-3 py-2 border-2 border-border rounded-md font-bold text-base bg-card outline-none focus:border-accent"
              />
            </div>

            {/* LIVE CALCULATION SELISIH */}
            <div className="p-3 rounded-lg border border-border flex items-center justify-between">
              <span className="font-bold text-muted-fg">Selisih Penyesuaian:</span>
              <div className="flex items-center gap-1.5 font-bold font-mono">
                {opnameSelisih > 0 ? (
                  <Badge variant="green">
                    +{opnameSelisih} {opnameTarget.satuan_dasar} (Surplus Fisik)
                  </Badge>
                ) : opnameSelisih < 0 ? (
                  <Badge variant="red">
                    {opnameSelisih} {opnameTarget.satuan_dasar} (Defisit Fisik)
                  </Badge>
                ) : (
                  <Badge variant="gray">
                    0 {opnameTarget.satuan_dasar} (Sesuai Sistem)
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <label className="font-bold block mb-1">Jenis Penyesuaian</label>
              <select
                value={jenisOpname}
                onChange={(e) => setJenisOpname(e.target.value as any)}
                className="w-full px-3 py-2 border-2 border-border rounded-md bg-card font-semibold outline-none focus:border-accent"
              >
                <option value="opname">Opname Fisik Rutin (Audit Rak/Gudang)</option>
                <option value="koreksi">Koreksi Selisih Kasir / Input Salah</option>
                <option value="rusak">Barang Rusak / Kadaluwarsa</option>
              </select>
            </div>

            <div>
              <label className="font-bold block mb-1">Catatan / Alasan</label>
              <input
                value={alasanOpname}
                onChange={(e) => setAlasanOpname(e.target.value)}
                placeholder="Contoh: Selisih hitung fisik rak mingguan"
                className="w-full px-3 py-2 border-2 border-border rounded-md bg-card outline-none focus:border-accent"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpnameTarget(null)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                icon={Save}
                disabled={submittingOpname}
              >
                {submittingOpname ? "Menyimpan..." : "Simpan Penyesuaian"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* BARCODE SCANNER MODAL */}
      <BarcodeScannerModal
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />
    </OwnerLayout>
  );
}
