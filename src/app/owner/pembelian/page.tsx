"use client";

import dynamic from "next/dynamic";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { usePembelian } from "./usePembelian";
import { PembelianReturTab } from "./PembelianReturTab";
import { PembelianCreateModal } from "./PembelianCreateModal";
import { PembelianReturModal } from "./PembelianReturModal";
import { PembelianSupportModals } from "./PembelianSupportModals";
import { ChevronLeft, ChevronRight, Eye, HandCoins, Plus, ReceiptText, RefreshCw, RotateCcw, Search, Truck } from "lucide-react";

const BarcodeScannerModal = dynamic(
  () => import("@/components/shared/barcode-scanner-modal").then((m) => m.BarcodeScannerModal),
  { ssr: false }
);

export default function PembelianPage() {
  const vm = usePembelian();

  const totalNilaiKulakan = vm.kulakanList.reduce(
    (sum, k) => sum + Number(k.total_beli || (k as any).total_biaya || 0),
    0
  );

  return (
    <OwnerLayout
      title="Pembelian & Kulakan Barang"
      desc="Pencatatan faktur masuk dari pemasok/grosir, konversi multi-satuan, dan pembentukan batch FIFO."
    >
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 mb-4">
        <StatCard icon={ReceiptText} value={String(vm.paginationInfo.total)} label="Total Faktur Kulakan" />
        <StatCard icon={Truck} value={String(vm.pemasokList.length)} label="Pemasok Terdaftar" />
        <StatCard icon={ReceiptText} value={formatRupiah(totalNilaiKulakan)} label="Total Nilai Belanja Halaman Ini" className="col-span-2 xl:col-span-1" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => vm.setActiveTab("kulakan")}
          className={`px-4 py-2 rounded-lg border-2 font-heading font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
            vm.activeTab === "kulakan" ? "bg-accent text-white border-fg shadow-pop-soft" : "bg-card text-fg border-border hover:bg-muted"
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          <span>Daftar Faktur Kulakan</span>
        </button>
        <button
          type="button"
          onClick={() => vm.setActiveTab("retur")}
          className={`px-4 py-2 rounded-lg border-2 font-heading font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
            vm.activeTab === "retur" ? "bg-accent text-white border-fg shadow-pop-soft" : "bg-card text-fg border-border hover:bg-muted"
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Riwayat Retur ke Supplier</span>
          {vm.returList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/20 text-current">{vm.returList.length}</span>
          )}
        </button>
      </div>

      {vm.activeTab === "retur" ? (
        <PembelianReturTab
          returList={vm.returList}
          loadingRetur={vm.loadingRetur}
          returSearch={vm.returSearch}
          onChangeSearch={vm.setReturSearch}
          onRefresh={vm.loadReturData}
        />
      ) : (
        <SectionCard
          title="Riwayat Faktur Belanja Kulakan (Inbound)"
          customAction={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon={Truck} onClick={() => vm.setSupplierModal(true)}>+ Pemasok Baru</Button>
              <Button size="sm" icon={Plus} onClick={vm.handleOpenAdd}>Catat Kulakan Baru</Button>
            </div>
          }
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
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
                placeholder="Cari nomor faktur kulakan..."
                className="w-full pl-9 pr-8 py-2 border-2 border-border rounded-full text-xs outline-none focus:border-accent bg-card font-medium"
              />
              {vm.search && (
                <button
                  type="button"
                  onClick={() => {
                    vm.setSearch("");
                    vm.setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-fg hover:text-fg text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>
            <Button size="sm" variant="ghost" icon={RefreshCw} onClick={vm.loadData} title="Muat Ulang Data" />
          </div>

          <div className="overflow-x-auto border-2 border-fg rounded-md">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                  <th className="p-2.5">No. Faktur</th>
                  <th className="p-2.5">Tanggal</th>
                  <th className="p-2.5">Pemasok</th>
                  <th className="p-2.5">Metode Bayar</th>
                  <th className="p-2.5">Total Belanja</th>
                  <th className="p-2.5">Status Bayar</th>
                  <th className="p-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {vm.loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-fg">Memuat data faktur kulakan...</td></tr>
                ) : vm.kulakanList.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-fg">Belum ada faktur belanja kulakan tercatat. Klik &ldquo;Catat Kulakan Baru&rdquo;.</td></tr>
                ) : (
                  vm.kulakanList.map((k) => {
                    const no = k.no_faktur || (k as any).nomor_faktur || "-";
                    const tgl = k.tgl_beli || (k as any).tanggal_kulakan || k.dibuat_pada;
                    const total = Number(k.total_beli || (k as any).total_biaya || 0);
                    const isLunas = k.lunas || (k as any).status_bayar === "lunas";

                    return (
                      <tr key={k.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                        <td className="p-2.5 font-mono font-bold text-fg">{no}</td>
                        <td className="p-2.5">{formatTanggal(tgl)}</td>
                        <td className="p-2.5 font-semibold">{k.pemasok?.nama || "Grosir Umum / Tanpa Pemasok"}</td>
                        <td className="p-2.5 uppercase font-medium"><Badge variant="blue" className="text-[10px]">{k.jenis_bayar || (k as any).metode_bayar || "Tunai"}</Badge></td>
                        <td className="p-2.5 font-bold text-accent">{formatRupiah(total)}</td>
                        <td className="p-2.5">
                          <div className="space-y-1">
                            <Badge variant={isLunas ? "green" : "yellow"}>{isLunas ? "Lunas" : "Tempo (Belum Lunas)"}</Badge>
                            {k.jatuh_tempo && !isLunas && <div className="text-[10px] text-muted-fg font-mono">Tempo: {formatTanggal(k.jatuh_tempo)}</div>}
                          </div>
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {!isLunas && (
                              <button type="button" onClick={() => vm.handleOpenPayDebt(k)} className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs" title="Bayar / Cicil Utang Faktur ke Supplier">
                                <HandCoins className="w-3.5 h-3.5" /><span>Bayar Utang</span>
                              </button>
                            )}
                            <button type="button" onClick={() => vm.handleOpenReturModal(k)} className="px-2 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 text-rose-700 dark:text-rose-300 hover:text-white border border-rose-300 dark:border-rose-800 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors" title="Retur Barang Rusak / Kedaluwarsa ke Supplier">
                              <RotateCcw className="w-3.5 h-3.5" /><span>Retur</span>
                            </button>
                            <Button size="sm" variant="ghost" icon={Eye} onClick={() => vm.handleViewDetail(k)} title="Lihat Detail Faktur & Rincian Barang" />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border mt-3 text-xs">
            <div className="text-muted-fg">
              Menampilkan <strong className="text-fg">{vm.paginationInfo.total === 0 ? 0 : (vm.currentPage - 1) * vm.PAGE_SIZE + 1}</strong> -{" "}
              <strong className="text-fg">{Math.min(vm.currentPage * vm.PAGE_SIZE, vm.paginationInfo.total)}</strong> dari{" "}
              <strong className="text-fg">{vm.paginationInfo.total}</strong> faktur (Maks 15/halaman)
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" disabled={vm.currentPage <= 1 || vm.loading} onClick={() => vm.setCurrentPage((p) => Math.max(1, p - 1))} className="px-2.5 py-1 text-xs">
                <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />Sebelumnya
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: vm.paginationInfo.total_pages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === vm.paginationInfo.total_pages || Math.abs(p - vm.currentPage) <= 1)
                  .map((pageNo, idx, arr) => (
                    <span key={pageNo} className="flex items-center">
                      {arr[idx - 1] && pageNo - arr[idx - 1] > 1 && <span className="px-1 text-muted-fg">...</span>}
                      <button
                        type="button"
                        onClick={() => vm.setCurrentPage(pageNo)}
                        className={`w-7 h-7 rounded border-2 font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                          pageNo === vm.currentPage ? "bg-accent text-white border-fg shadow-pop-soft" : "border-border bg-card hover:bg-muted text-fg"
                        }`}
                      >
                        {pageNo}
                      </button>
                    </span>
                  ))}
              </div>
              <Button size="sm" variant="outline" disabled={vm.currentPage >= vm.paginationInfo.total_pages || vm.loading} onClick={() => vm.setCurrentPage((p) => Math.min(vm.paginationInfo.total_pages, p + 1))} className="px-2.5 py-1 text-xs">
                Selanjutnya<ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      <PembelianCreateModal
        open={vm.addOpen}
        onClose={() => vm.setAddOpen(false)}
        noFaktur={vm.noFaktur}
        onChangeNoFaktur={vm.setNoFaktur}
        pemasokId={vm.pemasokId}
        onChangePemasokId={vm.setPemasokId}
        pemasokList={vm.pemasokList}
        tglBeli={vm.tglBeli}
        onChangeTglBeli={vm.setTglBeli}
        metodeBayar={vm.metodeBayar}
        onChangeMetodeBayar={vm.setMetodeBayar}
        onChangeStatusBayar={vm.setStatusBayar}
        jatuhTempo={vm.jatuhTempo}
        onChangeJatuhTempo={vm.setJatuhTempo}
        items={vm.items}
        onChangeItems={vm.setItems}
        products={vm.products}
        submitting={vm.submitting}
        onOpenSupplierModal={() => vm.setSupplierModal(true)}
        onOpenScannerModal={() => vm.setScannerOpen(true)}
        onAddNewItemRow={() => vm.handleAddNewItemRow()}
        onSubmit={vm.handleSaveKulakan}
      />

      <PembelianSupportModals
        quickAddModal={vm.quickAddModal}
        onCloseQuickAdd={() => vm.setQuickAddModal(false)}
        quickAddForm={vm.quickAddForm}
        onChangeQuickAddForm={vm.setQuickAddForm}
        categories={vm.categories}
        submittingQuickProduct={vm.submittingQuickProduct}
        onOpenQuickAddScanner={() => vm.setQuickAddScannerOpen(true)}
        onSubmitQuickProduct={vm.handleSaveQuickProduct}
        supplierModal={vm.supplierModal}
        onCloseSupplierModal={() => vm.setSupplierModal(false)}
        newSupplier={vm.newSupplier}
        onChangeNewSupplier={vm.setNewSupplier}
        submitting={vm.submitting}
        onSubmitSupplier={vm.handleCreateSupplier}
        selectedKulakan={vm.selectedKulakan}
        onCloseDetail={() => vm.setSelectedKulakan(null)}
        onOpenPayDebt={vm.handleOpenPayDebt}
        onOpenReturFromDetail={(target) => {
          vm.setSelectedKulakan(null);
          vm.handleOpenReturModal(target);
        }}
        payDebtTarget={vm.payDebtTarget}
        onClosePayDebt={() => vm.setPayDebtTarget(null)}
        payDebtNominal={vm.payDebtNominal}
        onChangePayDebtNominal={vm.setPayDebtNominal}
        payDebtMetode={vm.payDebtMetode}
        onChangePayDebtMetode={vm.setPayDebtMetode}
        payDebtTgl={vm.payDebtTgl}
        onChangePayDebtTgl={vm.setPayDebtTgl}
        payDebtCatatan={vm.payDebtCatatan}
        onChangePayDebtCatatan={vm.setPayDebtCatatan}
        submittingPayDebt={vm.submittingPayDebt}
        onSubmitPayDebt={vm.handleSubmitPayDebt}
      />

      <PembelianReturModal
        returTarget={vm.returTarget}
        returItems={vm.returItems}
        returKompensasi={vm.returKompensasi}
        returAlasan={vm.returAlasan}
        returTgl={vm.returTgl}
        submittingRetur={vm.submittingRetur}
        onClose={() => vm.setReturTarget(null)}
        onChangeReturItems={vm.setReturItems}
        onChangeKompensasi={vm.setReturKompensasi}
        onChangeAlasan={vm.setReturAlasan}
        onChangeTgl={vm.setReturTgl}
        onSubmit={vm.handleSubmitRetur}
      />

      <BarcodeScannerModal open={vm.scannerOpen} onClose={() => vm.setScannerOpen(false)} onScan={(code) => { vm.setScannerOpen(false); vm.handleBarcodeScannedInKulakan(code); }} />
      <BarcodeScannerModal
        open={vm.quickAddScannerOpen}
        onClose={() => vm.setQuickAddScannerOpen(false)}
        onScan={(code) => {
          vm.setQuickAddScannerOpen(false);
          vm.setQuickAddForm((p) => ({ ...p, barcode: code }));
          vm.toast.success(`Barcode ${code} berhasil dipindai!`);
        }}
      />
    </OwnerLayout>
  );
}
