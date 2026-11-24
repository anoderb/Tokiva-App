export interface KulakanRowItem {
  id: string;
  produk_id: string;
  nama_satuan: string;
  isi_konversi: number;
  jumlah: number;
  harga_beli_satuan: number;
}

export interface ReturRowItem {
  detail_id: string;
  produk_id: string;
  nama_produk: string;
  nama_satuan: string;
  isi_konversi: number;
  jumlah_beli: number;
  harga_satuan: number;
  jumlah_retur: number;
}

export interface QuickProductFormState {
  nama: string;
  barcode: string;
  kategori_id: string;
  satuan_dasar: string;
  harga_jual: number;
  harga_modal: number;
  stok_min: number;
}

export interface NewSupplierFormState {
  nama: string;
  telepon: string;
  alamat: string;
  kontak_person: string;
}
