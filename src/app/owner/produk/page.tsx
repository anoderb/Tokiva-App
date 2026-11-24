"use client";

import dynamic from "next/dynamic";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { ProductImage } from "@/components/shared/product-image";
import { formatRupiah } from "@/lib/format";
import { useOwnerProduk } from "./useOwnerProduk";
import { ProdukFormModal } from "./ProdukFormModal";
import { ProdukMasterAdoptModal } from "./ProdukMasterAdoptModal";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Scan,
  Search,
} from "lucide-react";

const BarcodeScannerModal = dynamic(
  () => import("@/components/shared/barcode-scanner-modal").then((m) => m.BarcodeScannerModal),
  { ssr: false }
);

export default function OwnerProdukPage() {
  const vm = useOwnerProduk();

  const totalAktif = vm.products.filter((p) => p.aktif).length;
  const totalMultiSatuan = vm.products.filter(
    (p) => (p.satuan_tambahan || p.produk_satuan || []).length > 0
  ).length;
  const totalLowStock = vm.products.filter(
    (p) => Number(p.stok) <= Number(p.stok_min ?? 10)
  ).length;

  return (
    <OwnerLayout
      title="Katalog Produk & Multi-Satuan"
      desc="Kelola daftar barang dagangan, konversi satuan eceran/grosir, dan foto produk."
    >
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <StatCard icon={Package} value={String(vm.paginationInfo.total)} label="Total Produk" />
        <StatCard icon={CheckCircle2} value={String(totalAktif)} label="Produk Aktif (Halaman Ini)" />
        <StatCard icon={Layers} value={String(totalMultiSatuan)} label="Multi-Satuan Grosir" />
        <StatCard icon={AlertTriangle} value={String(totalLowStock)} label="Stok Menipis" />
      </div>

      <SectionCard
        title="Daftar Produk Toko"
        customAction={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" icon={Boxes} onClick={vm.handleOpenMasterCatalog}>
              Adopsi Katalog Master
            </Button>
            <Button size="sm" icon={Plus} onClick={vm.openAddModal}>
              Tambah Produk Baru
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-fg pointer-events-none" />
            <input
              value={vm.search}
              onChange={(e) => {
                vm.setSearch(e.target.value);
                vm.setCurrentPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  vm.loadData();
                }
              }}
              placeholder="Cari nama produk, SKU, barcode..."
              className="w-full pl-9 pr-8 py-2 border-2 border-border rounded-full text-xs outline-none focus:border-accent bg-card font-medium"
            />
            {
              vm.search && (
                <button
                  type="button"
                  onClick={() => {
                    vm.setSearch("");
                    vm.setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-fg hover:text-fg text-xs font-bold"
                  title="Hapus pencarian"
                >
                  ×
                </button>
              )
            }
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-2 border-fg rounded-full flex items-center gap-1.5 px-3 py-2 text-xs font-bold shadow-[2px_2px_0px_#1E293B] hover:bg-muted shrink-0"
            onClick={() => vm.setSearchScannerOpen(true)}
            title="Scan Barcode untuk Cari Produk"
          >
            <Scan className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">Scan Barcode</span>
          </Button>

          <select
            value={vm.categoryFilter}
            onChange={(e) => {
              vm.setCategoryFilter(e.target.value);
              vm.setCurrentPage(1);
            }}
            className="px-3 py-2 border-2 border-border rounded-full text-xs bg-card font-medium outline-none focus:border-accent shrink-0"
          >
            <option value="">Semua Kategori</option>
            {
              vm.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nama}</option>
              ))
            }
          </select>

          <select
            value={vm.statusFilter}
            onChange={(e) => {
              vm.setStatusFilter(e.target.value);
              vm.setCurrentPage(1);
            }}
            className="px-3 py-2 border-2 border-border rounded-full text-xs bg-card font-semibold outline-none focus:border-accent shrink-0"
          >
            <option value="semua">Semua Status</option>
            <option value="aktif">Status: Aktif</option>
            <option value="nonaktif">Status: Nonaktif</option>
          </select>

          <Button size="sm" variant="ghost" icon={RefreshCw} onClick={vm.loadData} title="Muat Ulang Data" />
        </div>

        <div className="overflow-x-auto border-2 border-fg rounded-md">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                <th className="p-2.5">Produk</th>
                <th className="p-2.5">Kategori</th>
                <th className="p-2.5">Harga Modal</th>
                <th className="p-2.5">Harga Jual</th>
                <th className="p-2.5">Multi-Satuan</th>
                <th className="p-2.5">Stok Fisik</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {
                vm.loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-fg">Memuat data produk...</td>
                  </tr>
                ) : vm.products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-fg">
                      Belum ada produk yang sesuai filter. Klik &ldquo;Tambah Produk Baru&rdquo; atau &ldquo;Adopsi Katalog Master&rdquo;.
                    </td>
                  </tr>
                ) : (
                  vm.products.map((p) => {
                    const multi = p.satuan_tambahan || p.produk_satuan || [];
                    const isLow = Number(p.stok) <= Number(p.stok_min ?? 10);
                    return (
                      <tr key={p.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                        <td className="p-2.5">
                          <div className="flex items-center gap-2.5">
                            <ProductImage src={p.foto_url} alt={p.nama} className="w-10 h-10 rounded border border-border shrink-0" />
                            <div>
                              <div className="font-semibold text-fg">{p.nama}</div>
                              <div className="text-[10px] text-muted-fg font-mono">{p.barcode || p.sku || "-"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2.5">{p.kategori?.nama || "-"}</td>
                        <td className="p-2.5 text-muted-fg">{formatRupiah(p.harga_modal)}</td>
                        <td className="p-2.5 font-bold text-accent">
                          {formatRupiah(p.harga_jual)}{" "}
                          <span className="text-[10px] text-muted-fg font-normal">/{p.satuan_dasar}</span>
                        </td>
                        <td className="p-2.5">
                          {multi.length === 0 ? (
                            <span className="text-muted-fg text-[11px]">Eceran saja</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {multi.map((m) => (
                                <Badge key={m.id} variant="yellow">
                                  {m.nama_satuan} ({m.isi_konversi} {p.satuan_dasar})
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className={`font-bold ${isLow ? "text-red-600" : "text-fg"}`}>
                            {p.stok} {p.satuan_dasar}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <Badge variant={p.aktif ? "green" : "gray"}>{p.aktif ? "Aktif" : "Nonaktif"}</Badge>
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={p.aktif}
                              onClick={() => vm.handleToggleAktif(p)}
                              disabled={vm.togglingId === p.id}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-fg transition-colors duration-200 ease-in-out focus:outline-none ${p.aktif ? "bg-accent" : "bg-slate-300 dark:bg-slate-700"
                                } ${vm.togglingId === p.id ? "opacity-50 cursor-wait" : ""}`}
                              title={p.aktif ? "Status Aktif (Klik switch untuk Nonaktifkan)" : "Status Nonaktif (Klik switch untuk Aktifkan)"}
                            >
                              <span
                                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md border border-fg/30 ring-0 transition duration-200 ease-in-out mt-[1px] ${p.aktif ? "translate-x-4" : "translate-x-0.5"
                                  }`}
                              />
                            </button>
                            <Button size="sm" variant="ghost" icon={Pencil} onClick={() => vm.openEditModal(p)} title="Ubah Data Produk" />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border mt-3 text-xs font-body">
          <div className="text-muted-fg">
            Menampilkan{" "}
            <strong className="text-fg">{vm.paginationInfo.total === 0 ? 0 : (vm.currentPage - 1) * vm.PAGE_SIZE + 1}</strong> -{" "}
            <strong className="text-fg">{Math.min(vm.currentPage * vm.PAGE_SIZE, vm.paginationInfo.total)}</strong> dari{" "}
            <strong className="text-fg">{vm.paginationInfo.total}</strong> produk (Maks 15 per halaman)
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={vm.currentPage <= 1 || vm.loading}
              onClick={() => vm.setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
              Sebelumnya
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: vm.paginationInfo.total_pages }, (_, i) => i + 1)
                .filter((pageNo) => pageNo === 1 || pageNo === vm.paginationInfo.total_pages || Math.abs(pageNo - vm.currentPage) <= 1)
                .map((pageNo, idx, arr) => {
                  const prevPage = arr[idx - 1];
                  const showEllipsis = prevPage && pageNo - prevPage > 1;
                  return (
                    <span key={pageNo} className="flex items-center">
                      {showEllipsis && <span className="px-1 text-muted-fg">...</span>}
                      <button
                        type="button"
                        onClick={() => vm.setCurrentPage(pageNo)}
                        className={`w-7 h-7 rounded border-2 font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${pageNo === vm.currentPage ? "bg-accent text-white border-fg shadow-pop-soft" : "border-border bg-card hover:bg-muted text-fg"
                          }`}
                      >
                        {pageNo}
                      </button>
                    </span>
                  );
                })}
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={vm.currentPage >= vm.paginationInfo.total_pages || vm.loading}
              onClick={() => vm.setCurrentPage((p) => Math.min(vm.paginationInfo.total_pages, p + 1))}
              className="px-2.5 py-1 text-xs"
            >
              Selanjutnya
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      </SectionCard>

      <ProdukFormModal
        open={vm.formOpen}
        editingProduct={vm.editingProduct}
        submitting={vm.submitting}
        formData={vm.formData}
        categories={vm.categories}
        satuanList={vm.satuanList}
        newSatuan={vm.newSatuan}
        datasetFiles={vm.datasetFiles}
        katDropdownRef={vm.katDropdownRef}
        katDropdownOpen={vm.katDropdownOpen}
        katSearchQuery={vm.katSearchQuery}
        isAddingKat={vm.isAddingKat}
        satuanDropdownRef={vm.satuanDropdownRef}
        satuanDropdownOpen={vm.satuanDropdownOpen}
        satuanSearchQuery={vm.satuanSearchQuery}
        satuanListOptions={vm.satuanListOptions}
        namaDropdownRef={vm.namaDropdownRef}
        namaDropdownOpen={vm.namaDropdownOpen}
        loadingSuggestions={vm.loadingSuggestions}
        masterSuggestions={vm.masterSuggestions}
        onClose={vm.handleCloseModal}
        onChangeFormData={vm.setFormData}
        onChangeNewSatuan={vm.setNewSatuan}
        onChangeDatasetFiles={vm.setDatasetFiles}
        onOpenBarcodeScanner={() => vm.setBarcodeScannerOpen(true)}
        onBarcodeLookupMaster={vm.handleBarcodeLookupMaster}
        onToggleKatDropdown={() => vm.setKatDropdownOpen((o) => !o)}
        onChangeKatSearch={vm.setKatSearchQuery}
        onAddNewCategory={vm.handleAddNewCategory}
        onCloseKatDropdown={() => vm.setKatDropdownOpen(false)}
        onToggleSatuanDropdown={() => vm.setSatuanDropdownOpen((o) => !o)}
        onChangeSatuanSearch={vm.setSatuanSearchQuery}
        onSelectSatuan={vm.handleSelectSatuan}
        onAddNewSatuan={() => vm.handleAddNewSatuan()}
        onSetNamaDropdownOpen={vm.setNamaDropdownOpen}
        onSelectMasterSuggestion={vm.handleSelectMasterSuggestion}
        onSetCoverPhoto={vm.handleSetCoverPhoto}
        onRemoveDatasetItem={vm.handleRemoveDatasetItem}
        onClearAllDataset={vm.handleClearAllDataset}
        onDeleteCoverPhoto={vm.handleDeleteCoverPhoto}
        onPhotoUpload={vm.handlePhotoUpload}
        onAddSatuan={vm.handleAddSatuanInModal}
        onRemoveSatuan={vm.handleRemoveSatuanInModal}
        onSubmit={vm.handleSaveProduct}
      />

      <BarcodeScannerModal
        open={vm.barcodeScannerOpen}
        onClose={() => vm.setBarcodeScannerOpen(false)}
        onScan={vm.handleBarcodeScanned}
      />

      <ProdukMasterAdoptModal
        open={vm.masterOpen}
        masterSearch={vm.masterSearch}
        masterCatalog={vm.masterCatalog}
        onClose={() => vm.setMasterOpen(false)}
        onChangeSearch={vm.setMasterSearch}
        onSearch={vm.handleOpenMasterCatalog}
        onAdopt={vm.handleAdoptMaster}
      />

      <BarcodeScannerModal
        open={vm.searchScannerOpen}
        onClose={() => vm.setSearchScannerOpen(false)}
        onScan={(scannedCode) => {
          vm.setSearch(scannedCode);
          vm.setCurrentPage(1);
          vm.setSearchScannerOpen(false);
          vm.toast.success(`Mencari produk dengan barcode: ${scannedCode}`);
        }}
      />
    </OwnerLayout>
  );
}
