"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { AIKelas } from "@/types/api";
import { CloudUpload, ExternalLink, FolderKanban, Plus, RefreshCw, ShoppingBag } from "lucide-react";
import { useDatasetMaster } from "./dataset/useDatasetMaster";
import { DatasetKelasGrid } from "./dataset/DatasetKelasGrid";
import { DatasetUnmappedTab } from "./dataset/DatasetUnmappedTab";
import { DatasetGalleryModal } from "./dataset/DatasetGalleryModal";
import { DatasetModals } from "./dataset/DatasetModals";

interface TabDatasetMasterProps {
  kelasList: AIKelas[];
  totalSampel: number;
  hfStats: any;
  onRefresh: () => void;
}

export function TabDatasetMaster({ kelasList, totalSampel, hfStats, onRefresh }: TabDatasetMasterProps) {
  const vm = useDatasetMaster({ kelasList, onRefresh });
  const totalSyncedHf = (hfStats?.total_tersinkron_hf ?? hfStats?.total_synced) || 0;

  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤗</span>
              <h4 className="font-heading font-bold text-base">Hugging Face Dataset Sync Engine</h4>
              <Badge variant="purple">{hfStats?.repo_hf || "Private HF Hub"}</Badge>
            </div>
            <p className="text-xs text-muted-fg">
              Sinkronisasi batch sampel citra terverifikasi dari Supabase Storage ke Hugging Face Hub untuk automated training pipeline Kaggle.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hfStats?.repo_hf && (
              <a
                href={`https://huggingface.co/datasets/${hfStats.repo_hf}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md border-2 border-fg bg-muted hover:bg-muted/80 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                Buka Hub <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <Button type="button" onClick={() => vm.handleSyncHuggingFace()} disabled={vm.isSyncingHf} className="text-xs font-bold">
              {vm.isSyncingHf ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Menyinkronkan...
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5 mr-1.5" /> Sync ke Hugging Face Now
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border text-xs">
          <div>
            <span className="text-muted-fg block">Total Citra Sistem:</span>
            <span className="font-bold font-mono">{totalSampel.toLocaleString("id-ID")} Foto</span>
          </div>
          <div>
            <span className="text-muted-fg block">Tersinkron ke Hub:</span>
            <span className="font-bold font-mono text-sky-600 dark:text-sky-400">{totalSyncedHf.toLocaleString("id-ID")} Foto</span>
          </div>
          <div>
            <span className="text-muted-fg block">Pending Sync Supabase:</span>
            <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
              {Math.max(0, totalSampel - totalSyncedHf).toLocaleString("id-ID")} Foto
            </span>
          </div>
          <div>
            <span className="text-muted-fg block">Status Repository:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">🟢 Terhubung &amp; Valid</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-b-2 border-border pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => vm.setSubTab("classes")}
            className={`px-3 py-1.5 rounded-md border-2 border-fg text-xs font-bold transition-all ${vm.subTab === "classes" ? "bg-accent text-accent-fg shadow-pop-soft" : "bg-card text-muted-fg hover:text-fg"
              }`}
          >
            <FolderKanban className="w-3.5 h-3.5 inline mr-1.5" />
            Master Kelas AI ({kelasList.length})
          </button>
          <button
            type="button"
            onClick={() => vm.setSubTab("unmapped")}
            className={`px-3 py-1.5 rounded-md border-2 border-fg text-xs font-bold transition-all ${vm.subTab === "unmapped" ? "bg-accent text-accent-fg shadow-pop-soft" : "bg-card text-muted-fg hover:text-fg"
              }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 inline mr-1.5" />
            Produk Belum Ter-mapping ({vm.unmappedProducts.length})
          </button>
        </div>

        {vm.subTab === "classes" && (
          <Button
            size="sm"
            onClick={() => {
              vm.setModalMode("new_class");
              vm.setSelectedClassForUpload(null);
              vm.setFormNama("");
              vm.setFormBarcode("");
              vm.setSelectedFiles([]);
              vm.setAddModalOpen(true);
            }}
            className="text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> + Tambah Kelas AI Baru
          </Button>
        )}
      </div>

      {vm.subTab === "classes" ? (
        <DatasetKelasGrid
          filteredClasses={vm.filteredClasses}
          searchTerm={vm.searchTerm}
          quotaFilter={vm.quotaFilter}
          onChangeSearch={vm.setSearchTerm}
          onOpenSearchScanner={() => vm.setSearchScannerOpen(true)}
          onChangeQuotaFilter={vm.setQuotaFilter}
          onOpenGallery={(cls) => vm.handleOpenGallery(cls)}
          onOpenAddSamples={(cls) => {
            vm.setModalMode("add_samples");
            vm.setSelectedClassForUpload(cls);
            vm.setSelectedFiles([]);
            vm.setAddModalOpen(true);
          }}
          onOpenEditClass={(cls) => {
            vm.setEditingKelas(cls);
            vm.setEditNamaInput(cls.nama);
            vm.setEditTargetInput(cls.target_foto || 200);
            vm.setEditModalOpen(true);
          }}
          onDeleteClass={vm.handleDeleteClass}
        />
      ) : (
        <DatasetUnmappedTab
          unmappedProducts={vm.unmappedProducts}
          loadingUnmapped={vm.loadingUnmapped}
          onRefresh={vm.loadUnmapped}
          onSelectMapping={(p) => {
            vm.setSelectedUnmapped(p);
            vm.setCreateNewClassInMap(kelasList.length === 0);
            vm.setMapTargetClassId(kelasList[0]?.id || "");
            vm.setNewClassNameInMap(p.nama || "");
            vm.setMappingModalOpen(true);
          }}
        />
      )}

      <DatasetGalleryModal
        open={vm.galleryModalOpen}
        galleryClass={vm.galleryClass}
        galleryPhotos={vm.galleryPhotos}
        loadingGallery={vm.loadingGallery}
        galleryFilter={vm.galleryFilter}
        galleryPage={vm.galleryPage}
        galleryPageSize={vm.galleryPageSize}
        galleryTotal={vm.galleryTotal}
        galleryTotalPages={vm.galleryTotalPages}
        selectedPhotoIds={vm.selectedPhotoIds}
        submitting={vm.submitting}
        isSyncingHf={vm.isSyncingHf}
        lightboxPhoto={vm.lightboxPhoto}
        onClose={() => vm.setGalleryModalOpen(false)}
        onCloseLightbox={() => vm.setLightboxPhoto(null)}
        onOpenLightbox={vm.setLightboxPhoto}
        onChangeFilter={(filter) => {
          vm.setGalleryFilter(filter);
          vm.setGalleryPage(1);
          if (vm.galleryClass) vm.fetchGalleryPage(vm.galleryClass, { page: 1, limit: vm.galleryPageSize, filter });
        }}
        onChangePageSize={(size) => {
          vm.setGalleryPageSize(size);
          vm.setGalleryPage(1);
          if (vm.galleryClass) vm.fetchGalleryPage(vm.galleryClass, { page: 1, limit: size, filter: vm.galleryFilter });
        }}
        onChangePage={(page) => {
          vm.setGalleryPage(page);
          if (vm.galleryClass) vm.fetchGalleryPage(vm.galleryClass, { page, limit: vm.galleryPageSize, filter: vm.galleryFilter });
        }}
        onToggleSelectAll={(checked) => vm.setSelectedPhotoIds(checked ? vm.galleryPhotos.map((x) => x.id) : [])}
        onToggleSelectOne={(id, checked) =>
          vm.setSelectedPhotoIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
        }
        onVerifyBatch={vm.handleVerifyBatchPhotos}
        onDeleteBatch={vm.handleDeleteBatchPhotos}
        onSyncClass={(kelasId) => vm.handleSyncHuggingFace(kelasId)}
      />

      <DatasetModals
        addModalOpen={vm.addModalOpen}
        modalMode={vm.modalMode}
        selectedClassForUpload={vm.selectedClassForUpload}
        formNama={vm.formNama}
        formKategori={vm.formKategori}
        formBarcode={vm.formBarcode}
        formTargetFoto={vm.formTargetFoto}
        selectedFiles={vm.selectedFiles}
        autoVerifyAdminUpload={vm.autoVerifyAdminUpload}
        submitting={vm.submitting}
        onCloseAddModal={() => vm.setAddModalOpen(false)}
        onChangeFormNama={vm.setFormNama}
        onChangeFormKategori={vm.setFormKategori}
        onChangeFormBarcode={vm.setFormBarcode}
        onChangeFormTargetFoto={vm.setFormTargetFoto}
        onChangeSelectedFiles={vm.setSelectedFiles}
        onChangeAutoVerify={vm.setAutoVerifyAdminUpload}
        onOpenFormScanner={() => vm.setFormScannerOpen(true)}
        onUploadSubmit={vm.handleUploadSubmit}
        editModalOpen={vm.editModalOpen}
        editNamaInput={vm.editNamaInput}
        editTargetInput={vm.editTargetInput}
        onCloseEditModal={() => vm.setEditModalOpen(false)}
        onChangeEditNama={vm.setEditNamaInput}
        onChangeEditTarget={vm.setEditTargetInput}
        onSaveEditClass={vm.handleSaveEditClass}
        mappingModalOpen={vm.mappingModalOpen}
        selectedUnmapped={vm.selectedUnmapped}
        createNewClassInMap={vm.createNewClassInMap}
        mapTargetClassId={vm.mapTargetClassId}
        newClassNameInMap={vm.newClassNameInMap}
        kelasList={kelasList}
        onCloseMappingModal={() => vm.setMappingModalOpen(false)}
        onChangeCreateNewMap={vm.setCreateNewClassInMap}
        onChangeMapTargetClassId={vm.setMapTargetClassId}
        onChangeNewClassNameInMap={vm.setNewClassNameInMap}
        onMapProductSubmit={vm.handleMapProductSubmit}
        searchScannerOpen={vm.searchScannerOpen}
        formScannerOpen={vm.formScannerOpen}
        onCloseSearchScanner={() => vm.setSearchScannerOpen(false)}
        onCloseFormScanner={() => vm.setFormScannerOpen(false)}
        onSearchScanned={(code) => {
          vm.setSearchTerm(code);
          vm.setSearchScannerOpen(false);
          vm.toast.success(`Barcode ${code} berhasil dipindai!`);
        }}
        onFormScanned={(code) => {
          vm.setFormBarcode(code);
          vm.setFormScannerOpen(false);
          vm.toast.success(`Barcode ${code} berhasil dimasukkan!`);
        }}
      />

      <ConfirmModal
        open={Boolean(vm.confirmState)}
        onClose={() => vm.setConfirmState(null)}
        onConfirm={async () => {
          if (!vm.confirmState) return;
          const act = vm.confirmState.action;
          vm.setConfirmState(null);
          await act();
        }}
        loading={vm.submitting}
        title={vm.confirmState?.title || "Konfirmasi"}
        message={vm.confirmState?.message}
        confirmText={vm.confirmState?.confirmText || "Ya, Lanjutkan"}
        variant="danger"
      />
    </div>
  );
}
