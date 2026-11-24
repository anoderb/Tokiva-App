"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { BarcodeScannerModal } from "@/components/shared/barcode-scanner-modal";
import { DatasetPhotoStudio, type DatasetPhotoItem } from "@/components/shared/dataset-photo-studio";
import type { AIKelas } from "@/types/api";
import { Scan } from "lucide-react";

/** Kumpulan modal pendukung Dataset Master: Tambah Kelas/Sampel, Edit Kuota, Mapping Produk & Scanner */
export function DatasetModals({
  addModalOpen,
  modalMode,
  selectedClassForUpload,
  formNama,
  formKategori,
  formBarcode,
  formTargetFoto,
  selectedFiles,
  autoVerifyAdminUpload,
  submitting,
  onCloseAddModal,
  onChangeFormNama,
  onChangeFormKategori,
  onChangeFormBarcode,
  onChangeFormTargetFoto,
  onChangeSelectedFiles,
  onChangeAutoVerify,
  onOpenFormScanner,
  onUploadSubmit,
  editModalOpen,
  editNamaInput,
  editTargetInput,
  onCloseEditModal,
  onChangeEditNama,
  onChangeEditTarget,
  onSaveEditClass,
  mappingModalOpen,
  selectedUnmapped,
  createNewClassInMap,
  mapTargetClassId,
  newClassNameInMap,
  kelasList,
  onCloseMappingModal,
  onChangeCreateNewMap,
  onChangeMapTargetClassId,
  onChangeNewClassNameInMap,
  onMapProductSubmit,
  searchScannerOpen,
  formScannerOpen,
  onCloseSearchScanner,
  onCloseFormScanner,
  onSearchScanned,
  onFormScanned,
}: {
  addModalOpen: boolean;
  modalMode: "new_class" | "add_samples";
  selectedClassForUpload: AIKelas | null;
  formNama: string;
  formKategori: string;
  formBarcode: string;
  formTargetFoto: number;
  selectedFiles: DatasetPhotoItem[];
  autoVerifyAdminUpload: boolean;
  submitting: boolean;
  onCloseAddModal: () => void;
  onChangeFormNama: (v: string) => void;
  onChangeFormKategori: (v: string) => void;
  onChangeFormBarcode: (v: string) => void;
  onChangeFormTargetFoto: (v: number) => void;
  onChangeSelectedFiles: React.Dispatch<React.SetStateAction<DatasetPhotoItem[]>>;
  onChangeAutoVerify: (v: boolean) => void;
  onOpenFormScanner: () => void;
  onUploadSubmit: () => void;
  editModalOpen: boolean;
  editNamaInput: string;
  editTargetInput: number;
  onCloseEditModal: () => void;
  onChangeEditNama: (v: string) => void;
  onChangeEditTarget: (v: number) => void;
  onSaveEditClass: () => void;
  mappingModalOpen: boolean;
  selectedUnmapped: any | null;
  createNewClassInMap: boolean;
  mapTargetClassId: string;
  newClassNameInMap: string;
  kelasList: AIKelas[];
  onCloseMappingModal: () => void;
  onChangeCreateNewMap: (v: boolean) => void;
  onChangeMapTargetClassId: (v: string) => void;
  onChangeNewClassNameInMap: (v: string) => void;
  onMapProductSubmit: () => void;
  searchScannerOpen: boolean;
  formScannerOpen: boolean;
  onCloseSearchScanner: () => void;
  onCloseFormScanner: () => void;
  onSearchScanned: (code: string) => void;
  onFormScanned: (code: string) => void;
}) {
  return (
    <>
      <Modal
        open={addModalOpen}
        onClose={onCloseAddModal}
        title={modalMode === "new_class" ? "+ Tambah Kelas AI & Unggah Sampel" : `+ Unggah Sampel: ${selectedClassForUpload?.nama}`}
        className="max-w-2xl"
      >
        <div className="space-y-4 text-xs font-body">
          {modalMode === "new_class" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-md border-2 border-fg bg-muted/20">
              <div>
                <label className="block text-[11px] font-bold mb-1">Nama Kelas Produk *</label>
                <input type="text" placeholder="Mis. Indomie Goreng 85g" value={formNama} onChange={(e) => onChangeFormNama(e.target.value)} className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">Kategori</label>
                <input type="text" placeholder="Makanan / Minuman / Sembako" value={formKategori} onChange={(e) => onChangeFormKategori(e.target.value)} className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">Barcode EAN-13 (Opsional)</label>
                <div className="flex gap-1.5">
                  <input type="text" placeholder="899..." value={formBarcode} onChange={(e) => onChangeFormBarcode(e.target.value)} className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card font-mono text-xs focus:outline-none" />
                  <button type="button" onClick={onOpenFormScanner} className="p-1.5 rounded border-2 border-fg bg-muted hover:bg-muted/80 shrink-0" title="Scan Barcode Kamera">
                    <Scan className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">Target Kuota Foto</label>
                <input type="number" min="20" max="1000" value={formTargetFoto} onChange={(e) => onChangeFormTargetFoto(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card font-mono text-xs focus:outline-none" />
              </div>
            </div>
          )}

          <DatasetPhotoStudio active={addModalOpen} items={selectedFiles} onChangeItems={onChangeSelectedFiles} videoFrameCount={15} burstIntervalMs={1000} />

          <label className="flex items-center gap-2 p-2.5 rounded-md border-2 border-fg bg-lime-50/40 dark:bg-lime-950/20 cursor-pointer text-[11px] font-semibold">
            <input type="checkbox" checked={autoVerifyAdminUpload} onChange={(e) => onChangeAutoVerify(e.target.checked)} className="w-4 h-4 accent-accent" />
            <span>Langsung tandai terverifikasi (siap Sync ke Hugging Face tanpa masuk Tab Validasi lagi)</span>
          </label>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCloseAddModal}>Batal</Button>
            <Button type="button" onClick={onUploadSubmit} disabled={submitting || (modalMode === "new_class" && !formNama.trim())} className="font-bold">
              {submitting ? "Memproses..." : `Simpan & Upload (${selectedFiles.length} Foto)`}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={editModalOpen} onClose={onCloseEditModal} title="Edit Kelas AI & Target Kuota" className="max-w-md">
        <div className="space-y-3 text-xs font-body">
          <div>
            <label className="block text-[11px] font-bold mb-1">Nama Kelas</label>
            <input type="text" value={editNamaInput} onChange={(e) => onChangeEditNama(e.target.value)} className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs focus:outline-none" />
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-1">Target Kuota Citra</label>
            <input type="number" min="20" max="1000" value={editTargetInput} onChange={(e) => onChangeEditTarget(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card font-mono text-xs focus:outline-none" />
          </div>
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button variant="outline" onClick={onCloseEditModal}>Batal</Button>
            <Button onClick={onSaveEditClass} disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan Perubahan"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={mappingModalOpen} onClose={onCloseMappingModal} title="Petakan Produk ke Kelas AI" className="max-w-md">
        <div className="space-y-3 text-xs font-body">
          <p className="text-muted-fg">Petakan produk <strong className="text-fg">{selectedUnmapped?.nama}</strong> ke kelas AI klasifikasi:</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold">
              <input type="radio" name="mapMode" checked={!createNewClassInMap} onChange={() => onChangeCreateNewMap(false)} />
              Pilih dari Kelas AI Yang Sudah Ada
            </label>
            {!createNewClassInMap && (
              <select value={mapTargetClassId} onChange={(e) => onChangeMapTargetClassId(e.target.value)} className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs font-bold focus:outline-none">
                {kelasList.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.nama} ({cls.kode_kelas})</option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-2 cursor-pointer font-semibold pt-1">
              <input type="radio" name="mapMode" checked={createNewClassInMap} onChange={() => onChangeCreateNewMap(true)} />
              Buat Kelas AI Baru Sesuai Nama Produk Ini
            </label>
            {createNewClassInMap && (
              <input type="text" value={newClassNameInMap} onChange={(e) => onChangeNewClassNameInMap(e.target.value)} placeholder="Nama Kelas AI Baru" className="w-full px-2.5 py-1.5 rounded border-2 border-fg bg-card text-xs focus:outline-none" />
            )}
          </div>
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button variant="outline" onClick={onCloseMappingModal}>Batal</Button>
            <Button onClick={onMapProductSubmit} disabled={submitting}>{submitting ? "Memetakan..." : "Terapkan Pemetaan"}</Button>
          </div>
        </div>
      </Modal>

      <BarcodeScannerModal open={searchScannerOpen} onClose={onCloseSearchScanner} onScan={onSearchScanned} />
      <BarcodeScannerModal open={formScannerOpen} onClose={onCloseFormScanner} onScan={onFormScanned} />
    </>
  );
}
