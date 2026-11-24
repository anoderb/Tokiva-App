import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";
import { operasionalService } from "@/lib/services/operasional.service";
import { produkService } from "@/lib/services/produk.service";
import { formatRupiah } from "@/lib/format";
import type { Kategori, Kulakan, Pemasok, Produk } from "@/types/api";
import type {
  KulakanRowItem,
  NewSupplierFormState,
  QuickProductFormState,
  ReturRowItem,
} from "./pembelian-types";

const PAGE_SIZE = 15;

/** Hook state & logika manajemen faktur kulakan, pemasok, hutang dagang, dan retur supplier */
export function usePembelian() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [kulakanList, setKulakanList] = useState<Kulakan[]>([]);
  const [pemasokList, setPemasokList] = useState<Pemasok[]>([]);
  const [products, setProducts] = useState<Produk[]>([]);
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState({ total: 0, page: 1, limit: PAGE_SIZE, total_pages: 1 });

  const [selectedKulakan, setSelectedKulakan] = useState<Kulakan | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [noFaktur, setNoFaktur] = useState("");
  const [pemasokId, setPemasokId] = useState("");
  const [tglBeli, setTglBeli] = useState(new Date().toISOString().slice(0, 10));
  const [metodeBayar, setMetodeBayar] = useState<"tunai" | "transfer" | "tempo">("tunai");
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [statusBayar, setStatusBayar] = useState<"lunas" | "belum_lunas">("lunas");
  const [catatan, setCatatan] = useState("");
  const [items, setItems] = useState<KulakanRowItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [quickAddScannerOpen, setQuickAddScannerOpen] = useState(false);

  const [supplierModal, setSupplierModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState<NewSupplierFormState>({
    nama: "", telepon: "", alamat: "", kontak_person: "",
  });

  const [quickAddModal, setQuickAddModal] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState<QuickProductFormState>({
    nama: "", barcode: "", kategori_id: "", satuan_dasar: "pcs", harga_jual: 0, harga_modal: 0, stok_min: 5,
  });
  const [submittingQuickProduct, setSubmittingQuickProduct] = useState(false);

  const [payDebtTarget, setPayDebtTarget] = useState<Kulakan | null>(null);
  const [payDebtNominal, setPayDebtNominal] = useState(0);
  const [payDebtMetode, setPayDebtMetode] = useState<"transfer" | "tunai">("transfer");
  const [payDebtTgl, setPayDebtTgl] = useState(new Date().toISOString().slice(0, 10));
  const [payDebtCatatan, setPayDebtCatatan] = useState("");
  const [submittingPayDebt, setSubmittingPayDebt] = useState(false);

  const [activeTab, setActiveTab] = useState<"kulakan" | "retur">("kulakan");
  const [returList, setReturList] = useState<any[]>([]);
  const [loadingRetur, setLoadingRetur] = useState(false);
  const [returSearch, setReturSearch] = useState("");

  const [returTarget, setReturTarget] = useState<Kulakan | null>(null);
  const [returItems, setReturItems] = useState<ReturRowItem[]>([]);
  const [returKompensasi, setReturKompensasi] = useState<
    "potong_nota" | "refund_tunai" | "refund_transfer" | "tukar_barang"
  >("potong_nota");
  const [returAlasan, setReturAlasan] = useState("Kemasan rusak / bocor");
  const [returTgl, setReturTgl] = useState(new Date().toISOString().slice(0, 10));
  const [submittingRetur, setSubmittingRetur] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kRes, pRes, prodRes, katRes] = await Promise.all([
        operasionalService.getKulakan({ search: search.trim() || undefined, page: currentPage, limit: PAGE_SIZE }),
        operasionalService.getPemasok({ limit: 100 }).catch(() => []),
        produkService.getProduk({ limit: 500 }).catch(() => ({ items: [] })),
        produkService.getKategori().catch(() => []),
      ]);
      setKulakanList(kRes?.items || []);
      setPaginationInfo({
        total: kRes?.pagination?.total || 0,
        page: Number(kRes?.pagination?.page || currentPage),
        limit: Number(kRes?.pagination?.limit || PAGE_SIZE),
        total_pages: Math.max(1, Number(kRes?.pagination?.total_pages || 1)),
      });
      setPemasokList(Array.isArray(pRes) ? pRes : (pRes as any)?.items || []);
      setProducts(prodRes?.items || []);
      setCategories(Array.isArray(katRes) ? katRes : []);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat data faktur kulakan");
    } finally {
      setLoading(false);
    }
  }, [search, currentPage, toast]);

  const loadReturData = useCallback(async () => {
    setLoadingRetur(true);
    try {
      const res = await operasionalService.getReturKulakan({ search: returSearch.trim() || undefined, limit: 50 });
      setReturList(res?.items || []);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat riwayat retur pemasok");
    } finally {
      setLoadingRetur(false);
    }
  }, [returSearch, toast]);

  useEffect(() => {
    if (authLoading || !user) return;
    const timer = setTimeout(() => loadData(), search.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [authLoading, user, search, currentPage, loadData]);

  useEffect(() => {
    if (!authLoading && user && activeTab === "retur") {
      const timer = setTimeout(() => loadReturData(), returSearch.trim() ? 300 : 0);
      return () => clearTimeout(timer);
    }
  }, [authLoading, user, activeTab, returSearch, loadReturData]);

  const handleViewDetail = async (k: Kulakan) => {
    try {
      setSelectedKulakan(await operasionalService.getDetailKulakan(k.id));
    } catch {
      setSelectedKulakan(k);
    }
  };

  const handleOpenPayDebt = (k: Kulakan) => {
    setPayDebtTarget(k);
    const total = Number(k.total_beli || (k as any).total_biaya || 0);
    setPayDebtNominal(k.sisa_utang !== undefined ? Number(k.sisa_utang) : total);
    setPayDebtMetode("transfer");
    setPayDebtTgl(new Date().toISOString().slice(0, 10));
    setPayDebtCatatan("");
  };

  const handleSubmitPayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payDebtTarget) return;
    if (payDebtNominal <= 0) {
      toast.error("Nominal pembayaran harus lebih dari 0");
      return;
    }
    setSubmittingPayDebt(true);
    try {
      await operasionalService.bayarUtangKulakan(payDebtTarget.id, {
        nominal_bayar: payDebtNominal,
        metode: payDebtMetode,
        tgl_bayar: payDebtTgl,
        catatan: payDebtCatatan.trim() || undefined,
      });
      toast.success(`Pembayaran utang faktur ${payDebtTarget.no_faktur || ""} sebesar Rp${payDebtNominal.toLocaleString("id-ID")} berhasil dicatat ke Arus Kas!`);
      setPayDebtTarget(null);
      if (selectedKulakan?.id === payDebtTarget.id) setSelectedKulakan(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mencatat pembayaran utang kulakan");
    } finally {
      setSubmittingPayDebt(false);
    }
  };

  const handleOpenReturModal = async (k: Kulakan) => {
    try {
      const full = await operasionalService.getDetailKulakan(k.id);
      const rawItems = (full as any).items || [];
      if (rawItems.length === 0) {
        toast.warning("Faktur ini tidak memiliki rincian barang untuk diretur.");
        return;
      }
      const isLunas = Boolean(full.lunas || (full as any).status_bayar === "lunas");
      setReturTarget(full);
      setReturKompensasi(isLunas ? "refund_tunai" : "potong_nota");
      setReturAlasan("Kemasan rusak / bocor");
      setReturTgl(new Date().toISOString().slice(0, 10));
      setReturItems(
        rawItems.map((it: any) => ({
          detail_id: it.id,
          produk_id: it.produk_id,
          nama_produk: it.produk?.nama || it.nama_produk || "Produk",
          nama_satuan: it.nama_satuan || "pcs",
          isi_konversi: Number(it.isi_konversi || 1),
          jumlah_beli: Number(it.jumlah || 0),
          harga_satuan: Number(it.harga_satuan || 0),
          jumlah_retur: 0,
        }))
      );
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat rincian faktur untuk retur");
    }
  };

  const handleSubmitRetur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returTarget) return;
    const picked = returItems.filter((it) => Number(it.jumlah_retur) > 0);
    if (picked.length === 0) {
      toast.warning("Isi jumlah retur minimal pada 1 barang.");
      return;
    }
    if (!returAlasan.trim()) {
      toast.warning("Alasan retur wajib diisi.");
      return;
    }
    setSubmittingRetur(true);
    try {
      const res = await operasionalService.returKulakan(returTarget.id, {
        alasan: returAlasan.trim(),
        kompensasi: returKompensasi,
        tgl_retur: returTgl,
        items: picked.map((it) => ({ detail_id: it.detail_id, produk_id: it.produk_id, jumlah_retur: Number(it.jumlah_retur) })),
      });
      toast.success(`Retur faktur ${returTarget.no_faktur || ""} senilai ${formatRupiah(Number(res?.total_nilai_retur || 0))} berhasil diproses!`);
      setReturTarget(null);
      if (selectedKulakan?.id === returTarget.id) handleViewDetail(returTarget);
      loadData();
      loadReturData();
    } catch (err: any) {
      toast.error(err?.message || "Gagal memproses retur barang ke supplier");
    } finally {
      setSubmittingRetur(false);
    }
  };

  const handleOpenAdd = () => {
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    setNoFaktur(`KB-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`);
    setPemasokId(pemasokList[0]?.id || "");
    setTglBeli(new Date().toISOString().slice(0, 10));
    setMetodeBayar("tunai");
    setJatuhTempo("");
    setStatusBayar("lunas");
    setCatatan("");
    setItems(
      products.length > 0
        ? [{ id: `item-${Date.now()}-1`, produk_id: products[0].id, nama_satuan: products[0].satuan_dasar || "pcs", isi_konversi: 1, jumlah: 1, harga_beli_satuan: Number(products[0].harga_modal || 0) }]
        : []
    );
    setAddOpen(true);
  };

  const handleAddNewItemRow = (prodId?: string) => {
    const targetProd = prodId ? products.find((p) => p.id === prodId) : products[0];
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        produk_id: targetProd ? targetProd.id : "",
        nama_satuan: targetProd ? targetProd.satuan_dasar : "pcs",
        isi_konversi: 1,
        jumlah: 1,
        harga_beli_satuan: targetProd ? Number(targetProd.harga_modal || 0) : 0,
      },
    ]);
  };

  const handleBarcodeScannedInKulakan = async (scannedCode: string) => {
    const code = scannedCode.trim();
    if (!code) return;
    const existing = products.find((p) => p.barcode === code || (p.satuan_tambahan || p.produk_satuan || []).some((s) => s.barcode === code));
    if (existing) {
      const matchedUnit = (existing.satuan_tambahan || existing.produk_satuan || []).find((s) => s.barcode === code);
      setItems((prev) => [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          produk_id: existing.id,
          nama_satuan: matchedUnit ? matchedUnit.nama_satuan : existing.satuan_dasar,
          isi_konversi: matchedUnit ? Number(matchedUnit.isi_konversi || 1) : 1,
          jumlah: 1,
          harga_beli_satuan: matchedUnit ? Number(existing.harga_modal || 0) * Number(matchedUnit.isi_konversi || 1) : Number(existing.harga_modal || 0),
        },
      ]);
      toast.success(`Produk "${existing.nama}" berhasil ditambahkan ke faktur!`);
      return;
    }
    try {
      const master = await produkService.getProdukMasterByBarcode(code);
      if (master) {
        setQuickAddForm({
          nama: master.nama || "",
          barcode: code,
          kategori_id: master.kategori_id || categories[0]?.id || "",
          satuan_dasar: master.satuan_dasar || "pcs",
          harga_jual: Number(master.harga_saran || 0),
          harga_modal: Math.round(Number(master.harga_saran || 0) * 0.85),
          stok_min: 5,
        });
        setQuickAddModal(true);
        toast.info(`Produk "${master.nama}" ditemukan di Master! Silakan konfirmasi untuk menambah ke toko & faktur.`);
        return;
      }
    } catch {}
    setQuickAddForm({ nama: "", barcode: code, kategori_id: categories[0]?.id || "", satuan_dasar: "pcs", harga_jual: 0, harga_modal: 0, stok_min: 5 });
    setQuickAddModal(true);
    toast.info(`Barcode "${code}" baru. Silakan lengkapi info produk.`);
  };

  const handleSaveQuickProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddForm.nama.trim()) return void toast.error("Nama produk wajib diisi");
    if (quickAddForm.harga_jual <= 0) return void toast.error("Rencana harga jual harus lebih dari Rp0");
    setSubmittingQuickProduct(true);
    try {
      const created = await produkService.createProduk({
        nama: quickAddForm.nama.trim(),
        barcode: quickAddForm.barcode.trim() || undefined,
        kategori_id: quickAddForm.kategori_id || undefined,
        satuan_dasar: quickAddForm.satuan_dasar.trim() || "pcs",
        harga_jual: Number(quickAddForm.harga_jual),
        harga_modal: Number(quickAddForm.harga_modal || 0),
        stok: 0,
        stok_min: Number(quickAddForm.stok_min || 5),
        aktif: true,
      });
      setProducts((prev) => [created, ...prev]);
      handleAddNewItemRow(created.id);
      toast.success(`Produk "${created.nama}" berhasil dibuat & dimasukkan ke daftar kulakan!`);
      setQuickAddModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Gagal membuat produk baru");
    } finally {
      setSubmittingQuickProduct(false);
    }
  };

  const handleSaveKulakan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return void toast.error("Tambahkan minimal 1 item barang yang dibeli");
    for (const it of items) {
      if (!it.produk_id) return void toast.error("Setiap baris barang wajib memilih produk");
      if (it.jumlah <= 0) return void toast.error("Jumlah beli harus lebih dari 0");
      if (it.isi_konversi <= 0) return void toast.error("Isi konversi per satuan harus minimal 1");
    }
    setSubmitting(true);
    try {
      await operasionalService.createKulakan({
        pemasok_id: pemasokId || null,
        no_faktur: noFaktur.trim(),
        tgl_beli: tglBeli,
        tgl_terima: tglBeli,
        jenis_bayar: metodeBayar,
        jatuh_tempo: metodeBayar === "tempo" ? jatuhTempo || null : null,
        status_bayar: statusBayar,
        catatan: catatan.trim() || undefined,
        items: items.map((it) => ({
          produk_id: it.produk_id,
          nama_satuan: it.nama_satuan,
          isi_konversi: it.isi_konversi,
          jumlah: it.jumlah,
          harga_satuan: it.harga_beli_satuan,
          subtotal: it.jumlah * it.harga_beli_satuan,
        })),
      });
      toast.success("Faktur kulakan berhasil dicatat! Stok fisik bertambah & batch FIFO tercatat.");
      setAddOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mencatat faktur kulakan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.nama.trim()) return;
    setSubmitting(true);
    try {
      const created = await operasionalService.createPemasok(newSupplier);
      toast.success(`Pemasok "${created.nama}" berhasil ditambahkan!`);
      setPemasokList((prev) => [...prev, created]);
      setPemasokId(created.id);
      setSupplierModal(false);
      setNewSupplier({ nama: "", telepon: "", alamat: "", kontak_person: "" });
    } catch (err: any) {
      toast.error(err?.message || "Gagal menambah pemasok");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    PAGE_SIZE, kulakanList, pemasokList, products, categories, loading, search, setSearch,
    currentPage, setCurrentPage, paginationInfo, selectedKulakan, setSelectedKulakan,
    addOpen, setAddOpen, noFaktur, setNoFaktur, pemasokId, setPemasokId, tglBeli, setTglBeli,
    metodeBayar, setMetodeBayar, jatuhTempo, setJatuhTempo, statusBayar, setStatusBayar,
    catatan, setCatatan, items, setItems, submitting, scannerOpen, setScannerOpen,
    quickAddScannerOpen, setQuickAddScannerOpen, supplierModal, setSupplierModal, newSupplier, setNewSupplier,
    quickAddModal, setQuickAddModal, quickAddForm, setQuickAddForm, submittingQuickProduct,
    payDebtTarget, setPayDebtTarget, payDebtNominal, setPayDebtNominal, payDebtMetode, setPayDebtMetode,
    payDebtTgl, setPayDebtTgl, payDebtCatatan, setPayDebtCatatan, submittingPayDebt,
    activeTab, setActiveTab, returList, loadingRetur, returSearch, setReturSearch,
    returTarget, setReturTarget, returItems, setReturItems, returKompensasi, setReturKompensasi,
    returAlasan, setReturAlasan, returTgl, setReturTgl, submittingRetur,
    loadData, loadReturData, handleViewDetail, handleOpenPayDebt, handleSubmitPayDebt,
    handleOpenReturModal, handleSubmitRetur, handleOpenAdd, handleAddNewItemRow,
    handleBarcodeScannedInKulakan, handleSaveQuickProduct, handleSaveKulakan, handleCreateSupplier, toast,
  };
}
