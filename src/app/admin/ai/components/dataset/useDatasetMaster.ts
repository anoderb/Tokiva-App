import { useState, useEffect, useCallback } from "react";
import type { DatasetPhotoItem } from "@/components/shared/dataset-photo-studio";
import { useToast } from "@/components/ui/toast";
import { aiService } from "@/lib/services/ai.service";
import type { AIKelas, AISampel } from "@/types/api";

/** Hook state & aksi kurasi dataset kelas AI, sinkronisasi HF, galeri sampel, & mapping produk */
export function useDatasetMaster({ kelasList, onRefresh }: { kelasList: AIKelas[]; onRefresh: () => void }) {
  const { toast } = useToast();

  const [subTab, setSubTab] = useState<"classes" | "unmapped">("classes");
  const [searchTerm, setSearchTerm] = useState("");
  const [quotaFilter, setQuotaFilter] = useState<"all" | "low" | "medium" | "complete">("all");
  const [isSyncingHf, setIsSyncingHf] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmText: string;
    action: () => Promise<void>;
  } | null>(null);

  const [unmappedProducts, setUnmappedProducts] = useState<any[]>([]);
  const [loadingUnmapped, setLoadingUnmapped] = useState(false);
  const [selectedUnmapped, setSelectedUnmapped] = useState<any | null>(null);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [mapTargetClassId, setMapTargetClassId] = useState("");
  const [createNewClassInMap, setCreateNewClassInMap] = useState(false);
  const [newClassNameInMap, setNewClassNameInMap] = useState("");

  const [searchScannerOpen, setSearchScannerOpen] = useState(false);
  const [formScannerOpen, setFormScannerOpen] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"new_class" | "add_samples">("new_class");
  const [selectedClassForUpload, setSelectedClassForUpload] = useState<AIKelas | null>(null);
  const [formNama, setFormNama] = useState("");
  const [formKategori, setFormKategori] = useState("Makanan & Minuman");
  const [formBarcode, setFormBarcode] = useState("");
  const [formTargetFoto, setFormTargetFoto] = useState(200);
  const [selectedFiles, setSelectedFiles] = useState<DatasetPhotoItem[]>([]);
  const [autoVerifyAdminUpload, setAutoVerifyAdminUpload] = useState(true);
  const [createMasterCatalog, setCreateMasterCatalog] = useState(false);

  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryClass, setGalleryClass] = useState<AIKelas | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<AISampel[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<"semua" | "supabase" | "huggingface">("semua");
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryPageSize, setGalleryPageSize] = useState(36);
  const [galleryTotal, setGalleryTotal] = useState(0);
  const [galleryTotalPages, setGalleryTotalPages] = useState(1);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [lightboxPhoto, setLightboxPhoto] = useState<AISampel | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingKelas, setEditingKelas] = useState<AIKelas | null>(null);
  const [editTargetInput, setEditTargetInput] = useState(200);
  const [editNamaInput, setEditNamaInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadUnmapped = useCallback(async () => {
    setLoadingUnmapped(true);
    try {
      setUnmappedProducts((await aiService.getUnmappedProduk("admin")) || []);
    } catch {
      setUnmappedProducts([]);
    } finally {
      setLoadingUnmapped(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === "unmapped") loadUnmapped();
  }, [subTab, loadUnmapped]);

  const handleSyncHuggingFace = async (kelasId?: string) => {
    setIsSyncingHf(true);
    try {
      await aiService.syncHuggingFace({ kelas_id: kelasId, batch_limit: 100 }, "admin");
      toast.success("Sinkronisasi ke Hugging Face Hub berhasil dikirim!");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal sinkronisasi ke Hugging Face");
    } finally {
      setIsSyncingHf(false);
    }
  };

  const fetchGalleryPage = useCallback(
    async (cls: AIKelas, opts?: { page?: number; limit?: number; filter?: "semua" | "supabase" | "huggingface" }) => {
      const targetPage = opts?.page ?? galleryPage;
      const targetLimit = opts?.limit ?? galleryPageSize;
      const targetFilter = opts?.filter ?? galleryFilter;
      setLoadingGallery(true);
      setSelectedPhotoIds([]);
      try {
        const res = await aiService.getSampelList(
          { kelas_id: cls.id, lokasi_simpan: targetFilter === "semua" ? undefined : targetFilter, page: targetPage, limit: targetLimit },
          "admin"
        );
        const items = res.items || [];
        const total = res.pagination?.total ?? res.meta?.total ?? items.length;
        const totalPages = res.pagination?.total_pages ?? res.meta?.totalPages ?? Math.max(1, Math.ceil(total / targetLimit));
        setGalleryPhotos(items);
        setGalleryTotal(total);
        setGalleryTotalPages(Math.max(1, totalPages));
      } catch {
        setGalleryPhotos([]);
        setGalleryTotal(0);
        setGalleryTotalPages(1);
      } finally {
        setLoadingGallery(false);
      }
    },
    [galleryPage, galleryPageSize, galleryFilter]
  );

  const handleOpenGallery = async (cls: AIKelas) => {
    setGalleryClass(cls);
    setGalleryFilter("semua");
    setGalleryPage(1);
    setGalleryModalOpen(true);
    await fetchGalleryPage(cls, { page: 1, limit: galleryPageSize, filter: "semua" });
  };

  const handleDeleteBatchPhotos = () => {
    if (selectedPhotoIds.length === 0) return;
    setConfirmState({
      title: "Hapus Foto Terpilih?",
      message: `Hapus ${selectedPhotoIds.length} foto terpilih dari dataset? Tindakan ini bersifat permanen.`,
      confirmText: "Ya, Hapus Foto",
      action: async () => {
        setSubmitting(true);
        try {
          await aiService.deleteSampelBatch(selectedPhotoIds, "admin");
          toast.success(`${selectedPhotoIds.length} foto berhasil dihapus!`);
          setSelectedPhotoIds([]);
          if (galleryClass) await fetchGalleryPage(galleryClass, { page: galleryPage, limit: galleryPageSize, filter: galleryFilter });
          onRefresh();
        } catch (err: any) {
          toast.error(err?.message || "Gagal menghapus sampel");
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const handleVerifyBatchPhotos = async () => {
    if (selectedPhotoIds.length === 0) return;
    setSubmitting(true);
    try {
      await aiService.verifikasiSampel({ sampel_ids: selectedPhotoIds, status: "diterima" }, "admin");
      toast.success(`${selectedPhotoIds.length} foto berhasil diverifikasi!`);
      setSelectedPhotoIds([]);
      if (galleryClass) await fetchGalleryPage(galleryClass, { page: galleryPage, limit: galleryPageSize, filter: galleryFilter });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal memverifikasi sampel");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = (cls: AIKelas) => {
    setConfirmState({
      title: `Hapus Kelas "${cls.nama}"?`,
      message: `Hapus kelas "${cls.nama}" beserta seluruh sampel fotonya? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Ya, Hapus Kelas",
      action: async () => {
        setSubmitting(true);
        try {
          await aiService.deleteKelas(cls.id, "admin");
          toast.success(`Kelas "${cls.nama}" berhasil dihapus.`);
          onRefresh();
        } catch (err: any) {
          toast.error(err?.message || "Gagal menghapus kelas");
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const handleSaveEditClass = async () => {
    if (!editingKelas) return;
    setSubmitting(true);
    try {
      await aiService.updateKelas(editingKelas.id, { nama: editNamaInput.trim() || editingKelas.nama, target_foto: editTargetInput }, "admin");
      toast.success("Kelas berhasil diperbarui!");
      setEditModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengubah kelas");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadSubmit = async () => {
    let targetClassId = selectedClassForUpload?.id;
    if (modalMode === "new_class") {
      if (!formNama.trim()) return void toast.error("Nama kelas produk wajib diisi");
      setSubmitting(true);
      try {
        const newCls = await aiService.createKelas(
          {
            nama: formNama.trim(),
            kategori: formKategori,
            barcode: formBarcode.trim() || undefined,
            target_foto: formTargetFoto,
            buat_produk_master: createMasterCatalog,
          },
          "admin"
        );
        targetClassId = newCls.id;
        if (newCls.produk_master_status === "created") {
          toast.success(`Kelas "${newCls.nama}" dibuat & ditambahkan ke Katalog Produk Master!`);
        } else if (newCls.produk_master_status === "linked") {
          toast.success(`Kelas "${newCls.nama}" dibuat & ditautkan ke Katalog Produk Master yang sudah ada!`);
        } else {
          toast.success(`Kelas "${newCls.nama}" berhasil dibuat!`);
        }
      } catch (err: any) {
        toast.error(err?.message || "Gagal membuat kelas baru");
        setSubmitting(false);
        return;
      }
    }
    if (!targetClassId) return void toast.error("Kelas target tidak ditentukan");

    if (selectedFiles.length > 0) {
      setSubmitting(true);
      try {
        const res = await aiService.uploadBurstSampel(
          {
            kelas_id: targetClassId,
            sudut_ambil: selectedFiles[0]?.sudut || "Depan (Front)",
            sumber: "admin_dataset",
            terverifikasi: autoVerifyAdminUpload,
            fotos: selectedFiles.map((f) => ({ base64: f.base64, nama_file: f.name, sudut_ambil: f.sudut })),
          },
          "admin"
        );
        toast.success(
          autoVerifyAdminUpload
            ? `${res.jumlah_berhasil || selectedFiles.length} foto diunggah & langsung terverifikasi (siap Sync HF)!`
            : `${res.jumlah_berhasil || selectedFiles.length} foto diunggah ke antrean validasi.`
        );
        setSelectedFiles([]);
        setCreateMasterCatalog(false);
        setAddModalOpen(false);
        onRefresh();
      } catch (err: any) {
        toast.error(err?.message || "Gagal mengunggah foto ke dataset");
      } finally {
        setSubmitting(false);
      }
    } else {
      setCreateMasterCatalog(false);
      setAddModalOpen(false);
      onRefresh();
      setSubmitting(false);
    }
  };

  const handleMapProductSubmit = async () => {
    if (!selectedUnmapped) return;
    setSubmitting(true);
    try {
      await aiService.mapProdukKeKelas(
        {
          produk_id: selectedUnmapped.id,
          kelas_id: createNewClassInMap ? undefined : mapTargetClassId,
          buat_kelas_baru: createNewClassInMap,
          nama_kelas: createNewClassInMap ? newClassNameInMap.trim() : undefined,
          barcode: selectedUnmapped.barcode || undefined,
        },
        "admin"
      );
      toast.success("Produk berhasil dipetakan ke kelas AI!");
      setMappingModalOpen(false);
      setSelectedUnmapped(null);
      loadUnmapped();
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal memetakan produk");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClasses = kelasList.filter((cls) => {
    const matchesSearch =
      cls.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cls.barcode && cls.barcode.includes(searchTerm)) ||
      (cls.kode_kelas && cls.kode_kelas.toLowerCase().includes(searchTerm.toLowerCase()));
    const currentTotal = cls.total_foto || cls.foto_terkumpul || 0;
    const target = cls.target_foto || 200;
    const pct = target > 0 ? (currentTotal / target) * 100 : 0;
    if (quotaFilter === "low" && pct >= 50) return false;
    if (quotaFilter === "medium" && (pct < 50 || pct >= 100)) return false;
    if (quotaFilter === "complete" && pct < 100) return false;
    return matchesSearch;
  });

  return {
    subTab, setSubTab, searchTerm, setSearchTerm, quotaFilter, setQuotaFilter, isSyncingHf,
    confirmState, setConfirmState, unmappedProducts, loadingUnmapped, selectedUnmapped, setSelectedUnmapped,
    mappingModalOpen, setMappingModalOpen, mapTargetClassId, setMapTargetClassId, createNewClassInMap, setCreateNewClassInMap,
    newClassNameInMap, setNewClassNameInMap, searchScannerOpen, setSearchScannerOpen, formScannerOpen, setFormScannerOpen,
    addModalOpen, setAddModalOpen, modalMode, setModalMode, selectedClassForUpload, setSelectedClassForUpload,
    formNama, setFormNama, formKategori, setFormKategori, formBarcode, setFormBarcode, formTargetFoto, setFormTargetFoto,
    selectedFiles, setSelectedFiles, autoVerifyAdminUpload, setAutoVerifyAdminUpload,
    createMasterCatalog, setCreateMasterCatalog, galleryModalOpen, setGalleryModalOpen,
    galleryClass, galleryPhotos, loadingGallery, galleryFilter, setGalleryFilter, galleryPage, setGalleryPage,
    galleryPageSize, setGalleryPageSize, galleryTotal, galleryTotalPages, selectedPhotoIds, setSelectedPhotoIds,
    lightboxPhoto, setLightboxPhoto, editModalOpen, setEditModalOpen, editingKelas, setEditingKelas,
    editTargetInput, setEditTargetInput, editNamaInput, setEditNamaInput, submitting, filteredClasses,
    loadUnmapped, handleSyncHuggingFace, fetchGalleryPage, handleOpenGallery, handleDeleteBatchPhotos,
    handleVerifyBatchPhotos, handleDeleteClass, handleSaveEditClass, handleUploadSubmit, handleMapProductSubmit, toast,
  };
}
