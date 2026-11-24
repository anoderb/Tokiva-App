import { useState, useEffect, useCallback, useRef } from "react";
import type { DatasetPhotoItem } from "@/components/shared/dataset-photo-studio";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";
import { produkService } from "@/lib/services/produk.service";
import { tokoService } from "@/lib/services/toko.service";
import { compressImageFileToBase64 } from "@/lib/utils/image";
import type { Kategori, Produk, ProdukMaster, ProdukSatuan } from "@/types/api";
import {
  DEFAULT_SATUAN_LIST,
  INITIAL_PRODUK_FORM,
  type NewSatuanDraft,
  type OwnerProdukFormState,
} from "./produk-types";

const PAGE_SIZE = 15;

/** Hook manajemen katalog produk owner: CRUD produk, multi-satuan grosir, adopsi master, & dataset AI */
export function useOwnerProduk() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Produk[]>([]);
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [masterCatalog, setMasterCatalog] = useState<ProdukMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState({ total: 0, page: 1, limit: PAGE_SIZE, total_pages: 1 });
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchScannerOpen, setSearchScannerOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produk | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<OwnerProdukFormState>(INITIAL_PRODUK_FORM);

  const [satuanList, setSatuanList] = useState<Array<Partial<ProdukSatuan>>>([]);
  const [newSatuan, setNewSatuan] = useState<NewSatuanDraft>({
    nama_satuan: "Dus",
    isi_konversi: 24,
    harga_jual: 0,
    barcode: "",
  });

  const [masterOpen, setMasterOpen] = useState(false);
  const [masterSearch, setMasterSearch] = useState("");
  const [datasetFiles, setDatasetFiles] = useState<DatasetPhotoItem[]>([]);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);

  const [katDropdownOpen, setKatDropdownOpen] = useState(false);
  const [katSearchQuery, setKatSearchQuery] = useState("");
  const [isAddingKat, setIsAddingKat] = useState(false);
  const katDropdownRef = useRef<HTMLDivElement | null>(null);

  const [satuanListOptions, setSatuanListOptions] = useState<string[]>(DEFAULT_SATUAN_LIST);
  const [satuanDropdownOpen, setSatuanDropdownOpen] = useState(false);
  const [satuanSearchQuery, setSatuanSearchQuery] = useState("");
  const satuanDropdownRef = useRef<HTMLDivElement | null>(null);

  const [namaDropdownOpen, setNamaDropdownOpen] = useState(false);
  const [masterSuggestions, setMasterSuggestions] = useState<ProdukMaster[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const namaDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (katDropdownRef.current && !katDropdownRef.current.contains(e.target as Node)) setKatDropdownOpen(false);
      if (satuanDropdownRef.current && !satuanDropdownRef.current.contains(e.target as Node)) setSatuanDropdownOpen(false);
      if (namaDropdownRef.current && !namaDropdownRef.current.contains(e.target as Node)) setNamaDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!namaDropdownOpen || !formData.nama || formData.nama.trim().length < 2) {
      setMasterSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await produkService.getProdukMasterList({ search: formData.nama.trim(), limit: 6 });
        setMasterSuggestions(res?.items || []);
      } catch {
        setMasterSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.nama, namaDropdownOpen]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, katRes] = await Promise.all([
        produkService.getProduk({
          search: search.trim() || undefined,
          kategori_id: categoryFilter || undefined,
          status: statusFilter === "semua" ? undefined : statusFilter,
          page: currentPage,
          limit: PAGE_SIZE,
        }),
        produkService.getKategori().catch(() => []),
      ]);
      setProducts(prodRes?.items || []);
      setPaginationInfo({
        total: prodRes?.pagination?.total || 0,
        page: Number(prodRes?.pagination?.page || currentPage),
        limit: Number(prodRes?.pagination?.limit || PAGE_SIZE),
        total_pages: Math.max(1, Number(prodRes?.pagination?.total_pages || 1)),
      });
      setCategories(Array.isArray(katRes) ? katRes : []);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat katalog produk");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, currentPage, toast]);

  useEffect(() => {
    if (authLoading || !user) return;
    const timer = setTimeout(() => loadData(), search.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [authLoading, user, search, categoryFilter, statusFilter, currentPage, loadData]);

  const handleCloseModal = () => {
    setKatDropdownOpen(false);
    setSatuanDropdownOpen(false);
    setNamaDropdownOpen(false);
    setBarcodeScannerOpen(false);
    setFormOpen(false);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ ...INITIAL_PRODUK_FORM, kategori_id: categories[0]?.id || "" });
    setSatuanList([]);
    setDatasetFiles([]);
    setKatDropdownOpen(false);
    setKatSearchQuery("");
    setSatuanDropdownOpen(false);
    setSatuanSearchQuery("");
    setNamaDropdownOpen(false);
    setBarcodeScannerOpen(false);
    setFormOpen(true);
  };

  const openEditModal = (p: Produk) => {
    setEditingProduct(p);
    const baseSatuan = p.satuan_dasar || "pcs";
    setSatuanListOptions((prev) => (prev.includes(baseSatuan) ? prev : [...prev, baseSatuan]));
    setFormData({
      nama: p.nama,
      merek: p.merek || "",
      sku: p.sku || "",
      barcode: p.barcode || "",
      kategori_id: p.kategori_id || "",
      satuan_dasar: baseSatuan,
      harga_modal: Number(p.harga_modal || 0),
      harga_jual: Number(p.harga_jual || 0),
      stok: Number(p.stok || 0),
      stok_min: Number(p.stok_min ?? 5),
      foto_url: p.foto_url || "",
      aktif: p.aktif,
    });
    setSatuanList(p.satuan_tambahan || p.produk_satuan || []);
    setDatasetFiles([]);
    setKatDropdownOpen(false);
    setKatSearchQuery("");
    setSatuanDropdownOpen(false);
    setSatuanSearchQuery("");
    setNamaDropdownOpen(false);
    setBarcodeScannerOpen(false);
    setFormOpen(true);
  };

  const handleRemoveDatasetItem = (idx: number) => {
    setDatasetFiles((prev) => {
      const removed = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      if (formData.foto_url === removed?.base64) setFormData((p) => ({ ...p, foto_url: next[0]?.base64 || "" }));
      return next;
    });
  };

  const handleSetCoverPhoto = (base64: string) => {
    setFormData((p) => ({ ...p, foto_url: base64 }));
    toast.success("Foto dipilih sebagai sampul katalog utama!");
  };

  const handleDeleteCoverPhoto = () => {
    setFormData((p) => ({ ...p, foto_url: "" }));
    toast.info("Foto sampul utama dikosongkan.");
  };

  const handleClearAllDataset = () => {
    setDatasetFiles([]);
    toast.info("Semua frame citra dataset dibersihkan.");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const compressedBase64 = await compressImageFileToBase64(file, { maxDim: 800, quality: 0.85 });
      const res = await tokoService.uploadMedia({ file_base64: compressedBase64, kategori: "produk", nama_file: file.name }, "owner");
      setFormData((prev) => ({ ...prev, foto_url: res.url }));
      toast.success("Foto produk berhasil diunggah!");
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengunggah foto produk");
    }
  };

  const applyMasterToForm = (master: ProdukMaster, overrideBarcode?: string) => {
    setFormData((prev) => ({
      ...prev,
      barcode: overrideBarcode ?? (master.barcode || prev.barcode),
      nama: master.nama || prev.nama,
      merek: master.merek || prev.merek,
      satuan_dasar: master.satuan_dasar || prev.satuan_dasar,
      harga_jual: Number(master.harga_saran || prev.harga_jual),
      foto_url: master.foto_url || prev.foto_url,
      kategori_id: master.kategori_id || prev.kategori_id,
    }));
  };

  const handleBarcodeScanned = async (code: string) => {
    setBarcodeScannerOpen(false);
    setFormData((prev) => ({ ...prev, barcode: code }));
    toast.success(`Barcode "${code}" berhasil dipindai!`);
    try {
      const master = await produkService.getProdukMasterByBarcode(code);
      if (master) {
        applyMasterToForm(master, code);
        toast.success(`Data produk "${master.nama}" otomatis terisi dari Katalog Master!`);
      }
    } catch {
      toast.info(`Barcode ${code} dicatat. Silakan lengkapi nama produk & kategori.`);
    }
  };

  const handleBarcodeLookupMaster = async () => {
    if (!formData.barcode.trim()) return;
    try {
      const master = await produkService.getProdukMasterByBarcode(formData.barcode.trim());
      applyMasterToForm(master);
      toast.success(`Data produk "${master.nama}" diisi otomatis dari Katalog Master!`);
    } catch {
      toast.info("Barcode belum ada di Katalog Master, silakan isi manual.");
    }
  };

  const handleAddNewCategory = async () => {
    const trimmed = katSearchQuery.trim();
    if (!trimmed) return;
    setIsAddingKat(true);
    try {
      const created = await produkService.createKategori({ nama: trimmed });
      setCategories((prev) => [...prev, created]);
      setFormData((prev) => ({ ...prev, kategori_id: created.id }));
      setKatSearchQuery("");
      setKatDropdownOpen(false);
      toast.success(`Kategori "${created.nama}" berhasil dibuat & dipilih!`);
    } catch (err: any) {
      toast.error(err?.message || "Gagal membuat kategori baru");
    } finally {
      setIsAddingKat(false);
    }
  };

  const handleSelectSatuan = (unit: string) => {
    setFormData((p) => ({ ...p, satuan_dasar: unit }));
    setSatuanDropdownOpen(false);
    setSatuanSearchQuery("");
  };

  const handleAddNewSatuan = (customUnit?: string) => {
    const raw = (customUnit || satuanSearchQuery).trim().toLowerCase();
    if (!raw) return;
    if (!satuanListOptions.includes(raw)) setSatuanListOptions((prev) => [...prev, raw]);
    setFormData((p) => ({ ...p, satuan_dasar: raw }));
    setSatuanSearchQuery("");
    setSatuanDropdownOpen(false);
    toast.success(`Satuan "${raw}" berhasil dipilih!`);
  };

  const handleSelectMasterSuggestion = (m: ProdukMaster) => {
    applyMasterToForm(m);
    setNamaDropdownOpen(false);
    toast.success(`Data produk "${m.nama}" diterapkan dari Katalog Master!`);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) return void toast.error("Nama produk wajib diisi");
    if (formData.harga_jual <= 0) return void toast.error("Harga jual harus lebih dari Rp0");
    if (!editingProduct && datasetFiles.length === 0 && !formData.foto_url) {
      return void toast.error("Wajib menyertakan minimal 1 foto produk atau video 360° untuk bahan latih AI Vision!");
    }

    setSubmitting(true);
    try {
      const payload = {
        nama: formData.nama.trim(),
        merek: formData.merek.trim() || undefined,
        sku: formData.sku.trim() || undefined,
        barcode: formData.barcode.trim() || undefined,
        kategori_id: formData.kategori_id || undefined,
        satuan_dasar: formData.satuan_dasar || "pcs",
        harga_modal: Number(formData.harga_modal || 0),
        harga_jual: Number(formData.harga_jual),
        stok: Number(formData.stok || 0),
        stok_min: Number(formData.stok_min || 5),
        foto_url: formData.foto_url || undefined,
        aktif: formData.aktif,
      };
      if (editingProduct) {
        await produkService.updateProduk(editingProduct.id, payload);
        toast.success(`Produk "${formData.nama}" berhasil diperbarui!`);
      } else {
        await produkService.createProduk({
          ...payload,
          satuan_tambahan: satuanList,
          dataset_fotos: datasetFiles.length > 0 ? datasetFiles.map((f) => ({ nama_file: f.name, base64: f.base64, sudut: f.sudut })) : undefined,
        });
        toast.success(`Produk "${formData.nama}" berhasil ditambahkan & dataset AI dikirim ke verifikasi!`);
      }
      setFormOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan produk");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSatuanInModal = async () => {
    if (!newSatuan.nama_satuan.trim() || newSatuan.isi_konversi <= 1 || newSatuan.harga_jual <= 0) {
      return void toast.error("Nama satuan, isi konversi (>1), dan harga jual wajib diisi.");
    }
    if (editingProduct) {
      try {
        const created = await produkService.addSatuan(editingProduct.id, {
          nama_satuan: newSatuan.nama_satuan.trim(),
          isi_konversi: Number(newSatuan.isi_konversi),
          harga_jual: Number(newSatuan.harga_jual),
          barcode: newSatuan.barcode.trim() || undefined,
        });
        setSatuanList((prev) => [...prev, created]);
        toast.success(`Satuan ${created.nama_satuan} ditambahkan`);
      } catch (err: any) {
        toast.error(err?.message || "Gagal menambah satuan");
      }
    } else {
      setSatuanList((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, nama_satuan: newSatuan.nama_satuan.trim(), isi_konversi: Number(newSatuan.isi_konversi), harga_jual: Number(newSatuan.harga_jual), barcode: newSatuan.barcode.trim() || undefined },
      ]);
    }
    setNewSatuan({ nama_satuan: "Dus", isi_konversi: 24, harga_jual: 0, barcode: "" });
  };

  const handleRemoveSatuanInModal = async (sat: Partial<ProdukSatuan>) => {
    if (editingProduct && sat.id && !String(sat.id).startsWith("temp-")) {
      try {
        await produkService.removeSatuan(editingProduct.id, sat.id);
        toast.success("Satuan grosir dihapus");
      } catch (err: any) {
        toast.error(err?.message || "Gagal menghapus satuan");
        return;
      }
    }
    setSatuanList((prev) => prev.filter((s) => s.id !== sat.id));
  };

  const handleOpenMasterCatalog = async () => {
    setMasterOpen(true);
    try {
      const res = await produkService.getProdukMasterList({ search: masterSearch || undefined, limit: 50 });
      setMasterCatalog(res?.items || []);
    } catch {
      setMasterCatalog([]);
    }
  };

  const handleAdoptMaster = (m: ProdukMaster) => {
    setMasterOpen(false);
    setEditingProduct(null);
    const baseSatuan = m.satuan_dasar || "pcs";
    setSatuanListOptions((prev) => (prev.includes(baseSatuan) ? prev : [...prev, baseSatuan]));
    setFormData({
      nama: m.nama,
      merek: m.merek || "",
      sku: "",
      barcode: m.barcode || "",
      kategori_id: m.kategori_id || categories[0]?.id || "",
      satuan_dasar: baseSatuan,
      harga_modal: Math.round(Number(m.harga_saran || 0) * 0.85),
      harga_jual: Number(m.harga_saran || 0),
      stok: 20,
      stok_min: 5,
      foto_url: m.foto_url || "",
      aktif: true,
    });
    setSatuanList([]);
    setSatuanDropdownOpen(false);
    setSatuanSearchQuery("");
    setKatDropdownOpen(false);
    setNamaDropdownOpen(false);
    setFormOpen(true);
  };

  const handleToggleAktif = async (p: Produk) => {
    const nextAktif = !p.aktif;
    setTogglingId(p.id);
    setProducts((prev) => prev.map((item) => (item.id === p.id ? { ...item, aktif: nextAktif } : item)));
    try {
      await produkService.updateProduk(p.id, { aktif: nextAktif });
      toast.success(`Produk "${p.nama}" berhasil ${nextAktif ? "diaktifkan" : "dinonaktifkan"}!`);
    } catch (err: any) {
      setProducts((prev) => prev.map((item) => (item.id === p.id ? { ...item, aktif: p.aktif } : item)));
      toast.error(err?.message || "Gagal mengubah status produk");
    } finally {
      setTogglingId(null);
    }
  };

  return {
    PAGE_SIZE, products, categories, masterCatalog, loading, search, setSearch,
    categoryFilter, setCategoryFilter, statusFilter, setStatusFilter, currentPage, setCurrentPage,
    paginationInfo, togglingId, searchScannerOpen, setSearchScannerOpen,
    formOpen, editingProduct, submitting, formData, setFormData,
    satuanList, newSatuan, setNewSatuan, masterOpen, setMasterOpen, masterSearch, setMasterSearch,
    datasetFiles, setDatasetFiles, barcodeScannerOpen, setBarcodeScannerOpen,
    katDropdownOpen, setKatDropdownOpen, katSearchQuery, setKatSearchQuery, isAddingKat, katDropdownRef,
    satuanListOptions, satuanDropdownOpen, setSatuanDropdownOpen, satuanSearchQuery, setSatuanSearchQuery, satuanDropdownRef,
    namaDropdownOpen, setNamaDropdownOpen, masterSuggestions, loadingSuggestions, namaDropdownRef,
    loadData, handleCloseModal, openAddModal, openEditModal, handleRemoveDatasetItem, handleSetCoverPhoto,
    handleDeleteCoverPhoto, handleClearAllDataset, handlePhotoUpload, handleBarcodeScanned, handleBarcodeLookupMaster,
    handleAddNewCategory, handleSelectSatuan, handleAddNewSatuan, handleSelectMasterSuggestion, handleSaveProduct,
    handleAddSatuanInModal, handleRemoveSatuanInModal, handleOpenMasterCatalog, handleAdoptMaster, handleToggleAktif, toast,
  };
}
