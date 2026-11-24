export const DEFAULT_SATUAN_LIST = [
  "pcs",
  "bungkus",
  "botol",
  "sachet",
  "kg",
  "liter",
  "kotak",
  "kaleng",
  "porsi",
  "pack",
  "karton",
  "butir",
  "lembar",
  "gram",
  "ikat",
  "cup",
  "renteng",
  "roll",
  "pasang",
  "dus",
  "slop",
  "galon",
  "tablet",
  "kapsul",
  "strip",
];

export interface OwnerProdukFormState {
  nama: string;
  merek: string;
  sku: string;
  barcode: string;
  kategori_id: string;
  satuan_dasar: string;
  harga_modal: number;
  harga_jual: number;
  stok: number;
  stok_min: number;
  foto_url: string;
  aktif: boolean;
}

export interface NewSatuanDraft {
  nama_satuan: string;
  isi_konversi: number;
  harga_jual: number;
  barcode: string;
}

export const INITIAL_PRODUK_FORM: OwnerProdukFormState = {
  nama: "",
  merek: "",
  sku: "",
  barcode: "",
  kategori_id: "",
  satuan_dasar: "pcs",
  harga_modal: 0,
  harga_jual: 0,
  stok: 0,
  stok_min: 5,
  foto_url: "",
  aktif: true,
};
