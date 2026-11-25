"use client";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { Modal } from "@/components/ui/modal";
import { ProductImage } from "@/components/shared/product-image";
import { useToast } from "@/components/ui/toast";
import { useState, useEffect, useCallback } from "react";
import {
  Package,
  CheckCircle2,
  Search,
  Plus,
  Edit,
  Barcode,
  Tag,
  Trash2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { adminService } from "@/lib/services/admin.service";
import { tokoService } from "@/lib/services/toko.service";
import type { Kategori, ProdukMaster } from "@/types/api";
import { formatNumber, formatRupiah } from "@/lib/format";
import { compressImageFileToBase64 } from "@/lib/utils/image";

const DEFAULT_UNITS = [
  { value: "pcs", label: "Pcs" },
  { value: "bks", label: "Bungkus (bks)" },
  { value: "btl", label: "Botol (btl)" },
  { value: "sachet", label: "Sachet" },
  { value: "kotak", label: "Kotak" },
  { value: "kaleng", label: "Kaleng" },
  { value: "kg", label: "Kg" },
  { value: "liter", label: "Liter" },
  { value: "dus", label: "Dus" },
  { value: "pak", label: "Pak" },
];

export default function AdminProdukGlobalPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProdukMaster[]>([]);
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [merekList, setMerekList] = useState<string[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("Semua");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [verifiedFilter, setVerifiedFilter] = useState<"Semua" | "Terverifikasi" | "Draft">("Semua");
  const [page, setPage] = useState(1);
  const limit = 25;

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProdukMaster | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProdukMaster | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState({
    nama: "",
    merek: "",
    barcode: "",
    kategori_id: "",
    satuan_dasar: "pcs",
    harga_saran: "",
    foto_url: "",
    terverifikasi: true,
    buat_kelas_ai: false,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    adminService
      .getKategoriGlobal()
      .then((cats) => setCategories(cats || []))
      .catch(() => { });
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getProdukMasterList({
        search: debouncedSearch || undefined,
        merek: brandFilter === "Semua" ? undefined : brandFilter,
        kategori_id: categoryFilter === "Semua" ? undefined : categoryFilter,
        terverifikasi:
          verifiedFilter === "Semua"
            ? undefined
            : verifiedFilter === "Terverifikasi",
        page,
        limit,
      });
      setProducts(res.items || []);
      if (Array.isArray(res.merek_list)) {
        setMerekList(res.merek_list);
      }
      setTotalItems(res.pagination?.total ?? res.meta?.total ?? (res.items || []).length);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat katalog produk master global.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, brandFilter, categoryFilter, verifiedFilter, page, toast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const brands = ["Semua", ...merekList];

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      nama: "",
      merek: "",
      barcode: "",
      kategori_id: "",
      satuan_dasar: "pcs",
      harga_saran: "",
      foto_url: "",
      terverifikasi: true,
      buat_kelas_ai: false,
    });
    setFormOpen(true);
  };

  const openEditModal = (item: ProdukMaster) => {
    setEditingItem(item);
    const rawUnit = (item.satuan_dasar || "pcs").trim();
    const matchedUnit = DEFAULT_UNITS.find(
      (u) => u.value.toLowerCase() === rawUnit.toLowerCase()
    );
    setFormData({
      nama: item.nama || "",
      merek: item.merek || "",
      barcode: item.barcode || "",
      kategori_id: item.kategori_id || "",
      satuan_dasar: matchedUnit ? matchedUnit.value : rawUnit,
      harga_saran: item.harga_saran != null ? String(item.harga_saran) : "",
      foto_url: item.foto_url || "",
      terverifikasi: item.terverifikasi ?? true,
      buat_kelas_ai: false,
    });
    setFormOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const base64 = await compressImageFileToBase64(file, {
        maxDim: 800,
        quality: 0.85,
        maxRawBytes: 5 * 1024 * 1024,
      });
      const uploaded = await tokoService.uploadMedia(
        {
          file_base64: base64,
          kategori: "produk",
          nama_file: file.name,
        },
        "admin"
      );
      setFormData((prev) => ({ ...prev, foto_url: uploaded.url }));
      toast.success("Foto produk berhasil diunggah ke Supabase Storage.");
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengunggah foto produk.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nama.trim()) {
      toast.warning("Nama produk wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      const hargaNum =
        formData.harga_saran.trim() === "" ? null : Number(formData.harga_saran);
      const payload = {
        nama: formData.nama.trim(),
        merek: formData.merek.trim() || null,
        barcode: formData.barcode.trim() || null,
        kategori_id: formData.kategori_id.trim() || null,
        satuan_dasar: formData.satuan_dasar || "pcs",
        harga_saran: hargaNum != null && !Number.isNaN(hargaNum) ? hargaNum : null,
        foto_url: formData.foto_url.trim() || null,
        terverifikasi: formData.terverifikasi,
      };
      if (editingItem) {
        await adminService.updateProdukMaster(editingItem.id, payload);
        toast.success(`Produk "${formData.nama}" berhasil diperbarui.`);
      } else {
        const res = await adminService.createProdukMaster({
          ...payload,
          buat_kelas_ai: formData.buat_kelas_ai,
        });
        if (res?.ai_kelas_status === "created") {
          toast.success(`Produk "${formData.nama}" ditambahkan ke katalog global & Kelas AI baru dibuat.`);
        } else if (res?.ai_kelas_status === "linked") {
          toast.success(`Produk "${formData.nama}" ditambahkan ke katalog global & ditautkan ke Kelas AI yang sudah ada.`);
        } else {
          toast.success(`Produk "${formData.nama}" berhasil ditambahkan ke katalog global.`);
        }
      }
      setFormOpen(false);
      loadProducts();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan produk master.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await adminService.deleteProdukMaster(deleteTarget.id);
      toast.success(`Produk "${deleteTarget.nama}" dihapus dari katalog master.`);
      setDeleteTarget(null);
      loadProducts();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menghapus produk master.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const unitOptions = DEFAULT_UNITS.some((u) => u.value === formData.satuan_dasar)
    ? DEFAULT_UNITS
    : [...DEFAULT_UNITS, { value: formData.satuan_dasar, label: formData.satuan_dasar }];

  return (
    <AdminLayout title="Katalog Produk Global" breadcrumb="Panel Admin / Katalog Produk Global">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-heading">
            Master Katalog Produk Kelontong (EAN-13)
          </h2>
          <p className="text-xs sm:text-[13px] text-muted-fg">
            Basis data produk acuan nasional untuk mempermudah onboarding katalog toko baru.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            icon={RefreshCw}
            onClick={loadProducts}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            icon={Plus}
            onClick={openAddModal}
            className="bg-admin hover:bg-purple-700 text-white"
          >
            Tambah Produk Master
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 mb-5">
        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex items-center gap-3">
          <div className="w-10 h-10 rounded-md border-2 border-fg bg-purple-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
            <Package className="w-5 h-5 text-admin" />
          </div>
          <div>
            <div className="font-heading text-xl font-bold">{formatNumber(totalItems)}</div>
            <div className="text-[11px] font-semibold text-muted-fg">Total Produk Master</div>
          </div>
        </div>

        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex items-center gap-3">
          <div className="w-10 h-10 rounded-md border-2 border-fg bg-emerald-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="font-heading text-xl font-bold">
              {formatNumber(products.filter((p) => p.terverifikasi).length)}
            </div>
            <div className="text-[11px] font-semibold text-muted-fg">Terverifikasi Halaman Ini</div>
          </div>
        </div>

        <div className="bg-card border-2 border-fg rounded-md p-3.5 shadow-pop-soft flex items-center gap-3">
          <div className="w-10 h-10 rounded-md border-2 border-fg bg-amber-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B]">
            <Tag className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="font-heading text-xl font-bold">{formatNumber(merekList.length)}</div>
            <div className="text-[11px] font-semibold text-muted-fg">Total Merek Terdaftar</div>
          </div>
        </div>
      </div>

      {/* Main Catalog Table */}
      <SectionCard
        title="Daftar Produk Master"
        desc={`Menampilkan ${products.length} dari total ${formatNumber(totalItems)} produk master.`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mt-2 mb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {(["Semua", "Terverifikasi", "Draft"] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setVerifiedFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${verifiedFilter === st
                    ? "bg-admin text-white border-fg shadow-[2px_2px_0px_#1E293B]"
                    : "bg-card border-border text-muted-fg hover:text-fg hover:bg-muted"
                  }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-muted-fg absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama produk, merek, atau barcode..."
                className="w-full pl-9 pr-3 py-1.5 rounded-md border-2 border-fg bg-card text-xs focus:outline-none"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-md border-2 border-fg bg-card text-xs font-medium"
            >
              <option value="Semua">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama}
                </option>
              ))}
            </select>

            <select
              value={brandFilter}
              onChange={(e) => {
                setBrandFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-md border-2 border-fg bg-card text-xs font-medium"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b === "Semua" ? "Semua Merek" : b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border-2 border-fg rounded-md">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-muted border-b-2 border-fg text-left font-heading text-[10px] uppercase text-muted-fg">
                <th className="p-3">Produk</th>
                <th className="p-3">Barcode (EAN)</th>
                <th className="p-3">Merek / Kategori</th>
                <th className="p-3">Satuan Dasar</th>
                <th className="p-3 text-right">Harga Acuan</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-fg text-xs">
                    {loading
                      ? "Memuat katalog produk master..."
                      : "Tidak ada produk master yang sesuai filter."}
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <ProductImage fotoUrl={p.foto_url} nama={p.nama} size="sm" />
                        <div>
                          <div className="font-bold text-fg">{p.nama}</div>
                          <div className="text-[11px] text-muted-fg font-mono">
                            ID: {p.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {p.barcode ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted border border-border font-mono text-xs">
                          <Barcode className="w-3.5 h-3.5 text-muted-fg" />
                          {p.barcode}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-fg">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-xs">{p.merek || "-"}</div>
                      <div className="text-[11px] text-muted-fg">
                        {p.kategori?.nama || "Umum"}
                      </div>
                    </td>
                    <td className="p-3 text-xs font-medium">{p.satuan_dasar || "pcs"}</td>
                    <td className="p-3 text-right font-bold text-xs">
                      {p.harga_saran != null && p.harga_saran > 0 ? formatRupiah(p.harga_saran) : "-"}
                    </td>
                    <td className="p-3">
                      <Badge variant={p.terverifikasi ? "green" : "yellow"}>
                        {p.terverifikasi ? "Terverifikasi" : "Draft"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Edit}
                          onClick={() => openEditModal(p)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={Trash2}
                          onClick={() => setDeleteTarget(p)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-xs">
          <span className="text-muted-fg">
            Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong> (Total{" "}
            {formatNumber(totalItems)} item)
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Modal Tambah / Edit Produk Master */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingItem ? "Edit Produk Master Global" : "Tambah Produk Master Global"}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={submitting || uploadingPhoto}
              className="bg-admin hover:bg-purple-700 text-white"
            >
              {submitting ? "Menyimpan..." : "Simpan Produk"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Nama Produk Lengkap *</label>
            <input
              type="text"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Contoh: Indomie Goreng Spesial 85g"
              className="w-full p-2 rounded-md border-2 border-fg bg-card"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Kategori</label>
              <select
                value={formData.kategori_id}
                onChange={(e) => setFormData({ ...formData, kategori_id: e.target.value })}
                className="w-full p-2 rounded-md border-2 border-fg bg-card"
              >
                <option value="">Umum / Tanpa Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Merek / Brand</label>
              <input
                type="text"
                value={formData.merek}
                onChange={(e) => setFormData({ ...formData, merek: e.target.value })}
                placeholder="Contoh: Indofood"
                className="w-full p-2 rounded-md border-2 border-fg bg-card"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Kode Barcode (EAN-13)</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="8992388101015"
                className="w-full p-2 rounded-md border-2 border-fg bg-card font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Satuan Dasar</label>
              <select
                value={formData.satuan_dasar}
                onChange={(e) => setFormData({ ...formData, satuan_dasar: e.target.value })}
                className="w-full p-2 rounded-md border-2 border-fg bg-card"
              >
                {unitOptions.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Harga Jual Acuan (Rp)</label>
              <input
                type="number"
                min={0}
                value={formData.harga_saran}
                onChange={(e) => setFormData({ ...formData, harga_saran: e.target.value })}
                placeholder="Kosongkan jika opsional"
                className="w-full p-2 rounded-md border-2 border-fg bg-card"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Foto Produk</label>
            <div className="flex items-center gap-3">
              <ProductImage
                fotoUrl={formData.foto_url}
                nama={formData.nama || "Produk"}
                size="md"
              />
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={formData.foto_url}
                  onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                  placeholder="URL gambar atau unggah file..."
                  className="w-full p-2 rounded-md border-2 border-fg bg-card text-xs"
                />
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 border-fg bg-muted hover:bg-card cursor-pointer font-semibold text-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingPhoto ? "Mengunggah..." : "Unggah Foto"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.terverifikasi}
              onChange={(e) => setFormData({ ...formData, terverifikasi: e.target.checked })}
              className="w-4 h-4 accent-admin"
            />
            <span className="font-semibold">Tandai Terverifikasi di Katalog Global</span>
          </label>

          {!editingItem && (
            <label className="flex items-center gap-2 p-2.5 rounded-md border-2 border-fg bg-purple-50/40 dark:bg-purple-950/20 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.buat_kelas_ai}
                onChange={(e) => setFormData({ ...formData, buat_kelas_ai: e.target.checked })}
                className="w-4 h-4 accent-admin"
              />
              <span className="font-semibold">
                Sekaligus tambahkan ke Kelas Dataset AI (terhubung otomatis)
              </span>
            </label>
          )}
        </div>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Produk Master?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p className="text-xs text-muted-fg">
            Apakah Anda yakin ingin menghapus produk <strong>{deleteTarget.nama}</strong> dari
            katalog master global?
          </p>
        )}
      </Modal>
    </AdminLayout>
  );
}
