"use client";

import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { DatasetPhotoStudio, type DatasetPhotoItem } from "@/components/shared/dataset-photo-studio";
import { formatRupiah } from "@/lib/format";
import type { Kategori, Produk, ProdukMaster, ProdukSatuan } from "@/types/api";
import type { NewSatuanDraft, OwnerProdukFormState } from "./produk-types";
import { KategoriDropdown, ProdukNamaCombobox, SatuanDasarDropdown } from "./ProdukDropdowns";
import { Camera, Image as ImageIcon, Layers, Save, Trash2, Upload } from "lucide-react";

interface ProdukFormModalProps {
  open: boolean;
  editingProduct: Produk | null;
  submitting: boolean;
  formData: OwnerProdukFormState;
  categories: Kategori[];
  satuanList: Array<Partial<ProdukSatuan>>;
  newSatuan: NewSatuanDraft;
  datasetFiles: DatasetPhotoItem[];
  katDropdownRef: React.RefObject<HTMLDivElement | null>;
  katDropdownOpen: boolean;
  katSearchQuery: string;
  isAddingKat: boolean;
  satuanDropdownRef: React.RefObject<HTMLDivElement | null>;
  satuanDropdownOpen: boolean;
  satuanSearchQuery: string;
  satuanListOptions: string[];
  namaDropdownRef: React.RefObject<HTMLDivElement | null>;
  namaDropdownOpen: boolean;
  loadingSuggestions: boolean;
  masterSuggestions: ProdukMaster[];
  onClose: () => void;
  onChangeFormData: React.Dispatch<React.SetStateAction<OwnerProdukFormState>>;
  onChangeNewSatuan: React.Dispatch<React.SetStateAction<NewSatuanDraft>>;
  onChangeDatasetFiles: React.Dispatch<React.SetStateAction<DatasetPhotoItem[]>>;
  onOpenBarcodeScanner: () => void;
  onBarcodeLookupMaster: () => void;
  onToggleKatDropdown: () => void;
  onChangeKatSearch: (q: string) => void;
  onAddNewCategory: () => void;
  onCloseKatDropdown: () => void;
  onToggleSatuanDropdown: () => void;
  onChangeSatuanSearch: (q: string) => void;
  onSelectSatuan: (u: string) => void;
  onAddNewSatuan: () => void;
  onSetNamaDropdownOpen: (v: boolean) => void;
  onSelectMasterSuggestion: (m: ProdukMaster) => void;
  onSetCoverPhoto: (b64: string) => void;
  onRemoveDatasetItem: (idx: number) => void;
  onClearAllDataset: () => void;
  onDeleteCoverPhoto: () => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddSatuan: () => void;
  onRemoveSatuan: (sat: Partial<ProdukSatuan>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** Modal Tambah & Edit Produk Toko lengkap dengan Dataset AI Vision & Multi-Satuan Grosir */
export function ProdukFormModal(props: ProdukFormModalProps) {
  const {
    open, editingProduct, submitting, formData, categories, satuanList, newSatuan, datasetFiles,
    onClose, onChangeFormData, onChangeNewSatuan, onChangeDatasetFiles, onOpenBarcodeScanner,
    onBarcodeLookupMaster, onSubmit,
  } = props;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingProduct ? `Edit Produk: ${editingProduct.nama}` : "Tambah Produk Baru"}
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={onSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-bold block mb-1">Barcode EAN-13 Eceran</label>
            <div className="flex gap-1.5">
              <input
                value={formData.barcode}
                onChange={(e) => onChangeFormData((p) => ({ ...p, barcode: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onBarcodeLookupMaster();
                  }
                }}
                placeholder="899... (Tekan Enter utk Auto-Isi)"
                className="flex-1 px-3 py-2 border-2 border-border rounded font-mono bg-card"
              />
              <Button type="button" size="sm" variant="outline" className="border-2 border-fg font-bold flex items-center gap-1.5 shrink-0 bg-accent/10 hover:bg-accent hover:text-accent-fg" onClick={onOpenBarcodeScanner} title="Buka kamera untuk scan barcode otomatis">
                <Camera className="w-4 h-4 text-accent" />
                <span>Pindai Barcode</span>
              </Button>
            </div>
          </div>

          <div>
            <label className="font-bold block mb-1">Kode SKU Toko</label>
            <input value={formData.sku} onChange={(e) => onChangeFormData((p) => ({ ...p, sku: e.target.value }))} placeholder="Otomatis jika dikosongkan" className="w-full px-3 py-2 border-2 border-border rounded font-mono bg-card" />
          </div>

          <ProdukNamaCombobox
            nama={formData.nama}
            dropdownRef={props.namaDropdownRef}
            open={props.namaDropdownOpen}
            loadingSuggestions={props.loadingSuggestions}
            suggestions={props.masterSuggestions}
            onFocusOpen={() => { if (formData.nama.trim().length >= 2) props.onSetNamaDropdownOpen(true); }}
            onChangeNama={(val) => {
              onChangeFormData((p) => ({ ...p, nama: val }));
              props.onSetNamaDropdownOpen(true);
            }}
            onSelectSuggestion={props.onSelectMasterSuggestion}
            onCloseDropdown={() => props.onSetNamaDropdownOpen(false)}
          />

          <KategoriDropdown
            kategoriId={formData.kategori_id}
            categories={categories}
            dropdownRef={props.katDropdownRef}
            open={props.katDropdownOpen}
            searchQuery={props.katSearchQuery}
            isAdding={props.isAddingKat}
            onToggle={props.onToggleKatDropdown}
            onChangeSearch={props.onChangeKatSearch}
            onSelectCategory={(id) => {
              onChangeFormData((p) => ({ ...p, kategori_id: id }));
              props.onCloseKatDropdown();
            }}
            onAddNewCategory={props.onAddNewCategory}
          />

          <SatuanDasarDropdown
            selectedUnit={formData.satuan_dasar}
            options={props.satuanListOptions}
            dropdownRef={props.satuanDropdownRef}
            open={props.satuanDropdownOpen}
            searchQuery={props.satuanSearchQuery}
            onToggle={props.onToggleSatuanDropdown}
            onChangeSearch={props.onChangeSatuanSearch}
            onSelectUnit={props.onSelectSatuan}
            onAddUnit={props.onAddNewSatuan}
          />

          <div>
            <label className="font-bold block mb-1">Harga Modal Dasar (Rp)</label>
            <input type="number" value={formData.harga_modal} onChange={(e) => onChangeFormData((p) => ({ ...p, harga_modal: Number(e.target.value) }))} className="w-full px-3 py-2 border-2 border-border rounded bg-card font-bold" />
          </div>
          <div>
            <label className="font-bold block mb-1">Harga Jual Dasar (Rp) *</label>
            <input type="number" required value={formData.harga_jual} onChange={(e) => onChangeFormData((p) => ({ ...p, harga_jual: Number(e.target.value) }))} className="w-full px-3 py-2 border-2 border-border rounded bg-card font-bold text-accent" />
          </div>
          <div>
            <label className="font-bold block mb-1">Stok Saat Ini ({formData.satuan_dasar})</label>
            <input type="number" value={formData.stok} onChange={(e) => onChangeFormData((p) => ({ ...p, stok: Number(e.target.value) }))} className="w-full px-3 py-2 border-2 border-border rounded bg-card font-bold" />
          </div>
          <div>
            <label className="font-bold block mb-1">Batas Minimum Peringatan Stok</label>
            <input type="number" min={0} value={formData.stok_min} onChange={(e) => onChangeFormData((p) => ({ ...p, stok_min: Math.max(0, Number(e.target.value)) }))} className="w-full px-3 py-2 border-2 border-border rounded bg-card" />
          </div>
        </div>

        <div className="p-3.5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-3">
          <DatasetPhotoStudio
            active={open}
            items={datasetFiles}
            onChangeItems={onChangeDatasetFiles}
            title="Metode Pengambilan Citra (Bahan Latih AI)"
            subtitle="Wajib minimal 1 foto / frame untuk mengenalkan produk pada AI Vision kasir"
            videoFrameCount={10}
            burstIntervalMs={1200}
            requiredHint={!editingProduct}
            allowCoverSelect
            coverBase64={formData.foto_url}
            onSelectCover={props.onSetCoverPhoto}
            onRemoveItem={props.onRemoveDatasetItem}
            onClearAll={props.onClearAllDataset}
          />

          <div className="p-3 rounded-lg border-2 border-fg/80 bg-muted/20 flex items-center justify-between gap-3 mt-2">
            <div className="flex items-center gap-3 min-w-0">
              {formData.foto_url ? (
                <div className="relative group w-14 h-14 rounded-md border-2 border-fg overflow-hidden shrink-0 bg-muted shadow-pop-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.foto_url} alt="Sampul" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-md border-2 border-dashed border-fg/40 flex flex-col items-center justify-center shrink-0 bg-muted text-muted-fg">
                  <ImageIcon className="w-5 h-5 text-muted-fg/60" />
                  <span className="text-[8px] font-bold mt-0.5">Belum Ada</span>
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-black text-xs text-fg">Foto Sampul Utama POS</span>
                  <Badge variant={formData.foto_url ? "green" : "yellow"} className="text-[9px] px-1.5 py-0.2">
                    {formData.foto_url ? "★ Terpilih" : "Otomatis dari Dataset"}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-fg mt-0.5 leading-tight truncate">
                  {formData.foto_url ? "Digunakan sebagai visual utama pada terminal kasir POS & struk." : "Frame pertama dataset di atas otomatis jadi sampul, atau klik ★ pada citra."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {formData.foto_url && (
                <button type="button" onClick={props.onDeleteCoverPhoto} title="Hapus foto sampul ini" className="px-2.5 py-1.5 rounded border border-red-500 text-red-600 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Sampul</span>
                </button>
              )}
              <label className="px-2.5 py-1.5 rounded border-2 border-fg bg-card hover:bg-muted font-bold text-xs cursor-pointer inline-flex items-center gap-1 transition-colors">
                <Upload className="w-3.5 h-3.5 text-accent" />
                <span>{formData.foto_url ? "Ganti Sampul" : "Unggah Sampul"}</span>
                <input type="file" accept="image/*" onChange={props.onPhotoUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border-2 border-border space-y-2.5">
          <div className="font-heading font-bold text-xs flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-accent" />
            <span>Konversi Multi-Satuan Grosir (Dus / Renceng / Karton)</span>
          </div>
          {satuanList.length > 0 && (
            <div className="space-y-1.5">
              {satuanList.map((s) => (
                <div key={s.id || s.nama_satuan} className="flex items-center justify-between p-2 rounded bg-muted border border-border">
                  <div>
                    <strong>1 {s.nama_satuan}</strong> = {s.isi_konversi} {formData.satuan_dasar} · Harga: <strong className="text-accent">{formatRupiah(s.harga_jual)}</strong>
                  </div>
                  <button type="button" onClick={() => props.onRemoveSatuan(s)} className="text-red-500 hover:underline font-bold text-[11px] cursor-pointer">Hapus</button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
            <input value={newSatuan.nama_satuan} onChange={(e) => onChangeNewSatuan((p) => ({ ...p, nama_satuan: e.target.value }))} placeholder="Nama (Dus/Renceng)" className="px-2.5 py-1.5 border border-border rounded bg-card" />
            <input type="number" min={2} value={newSatuan.isi_konversi || ""} onChange={(e) => onChangeNewSatuan((p) => ({ ...p, isi_konversi: Number(e.target.value) }))} placeholder={`Isi (${formData.satuan_dasar})`} className="px-2.5 py-1.5 border border-border rounded bg-card" />
            <input type="number" value={newSatuan.harga_jual || ""} onChange={(e) => onChangeNewSatuan((p) => ({ ...p, harga_jual: Number(e.target.value) }))} placeholder="Harga Jual Grosir" className="px-2.5 py-1.5 border border-border rounded bg-card" />
            <Button type="button" size="sm" variant="outline" onClick={props.onAddSatuan}>+ Satuan</Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" icon={Save} disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan Produk"}</Button>
        </div>
      </form>
    </Modal>
  );
}
