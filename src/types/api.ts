// ============================================================================
// TOKIVA API & DATABASE ENTITY TYPES
// ============================================================================

export type UserRole = 'owner' | 'kasir' | 'superadmin';

export interface Toko {
  id: string;
  kode: string;
  kode_toko?: string;
  nama: string;
  pemilik: string;
  nama_pemilik?: string;
  telepon?: string | null;
  alamat?: string | null;
  kota?: string | null;
  logo_url?: string | null;
  qris_url?: string | null;
  qris_nmid?: string | null;
  qris_merchant?: string | null;
  qris_string?: string | null;
  qris_status?: 'valid' | 'empty' | string | null;
  qris_info?: {
    merchant_name?: string;
    merchant_city?: string;
    merchant_id?: string;
    currency?: string;
    country?: string;
    method?: string;
  } | null;
  qris_aktif?: boolean | null;
  qris_foto_url?: string | null;
  qris_mid?: string | null;
  struk_header?: string | null;
  struk_footer?: string | null;
  lebar_kertas?: string | null;
  status: 'aktif' | 'nonaktif' | 'ditangguhkan';
  dibuat_pada?: string;
  diubah_pada?: string;
}

export interface Pengguna {
  id: string;
  toko_id?: string | null;
  nama_lengkap: string;
  nama?: string;
  email: string;
  telepon?: string | null;
  peran: UserRole;
  foto_url?: string | null;
  avatar_url?: string | null;
  aktif: boolean;
  login_terakhir?: string | null;
  terakhir_login?: string | null;
  dibuat_pada?: string;
  toko?: Pick<Toko, 'id' | 'kode' | 'nama'> | null;
}

export interface AuthSessionResponse {
  user: Pengguna;
  toko: Toko | null;
  token?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}

export interface RegisterResponse {
  requires_verification?: boolean;
  email?: string;
  user?: Pengguna;
  owner?: Pengguna;
  toko: Toko | null;
  token?: AuthSessionResponse['token'];
}

export interface Kategori {
  id: string;
  toko_id?: string | null;
  nama: string;
  ikon?: string | null;
  warna?: string | null;
  urutan?: number;
}

export interface ProdukSatuan {
  id: string;
  produk_id: string;
  nama_satuan: string;
  isi_konversi: number;
  harga_jual: number;
  harga_modal?: number | null;
  barcode?: string | null;
  aktif?: boolean;
}

export interface Produk {
  id: string;
  toko_id: string;
  produk_master_id?: string | null;
  kategori_id?: string | null;
  sku?: string | null;
  barcode?: string | null;
  nama: string;
  merek?: string | null;
  satuan_dasar: string;
  harga_modal: number;
  harga_jual: number;
  stok: number;
  stok_min: number;
  foto_url?: string | null;
  master_id?: string | null;
  ai_kelas_id?: string | null;
  aktif: boolean;
  dibuat_pada?: string;
  diubah_pada?: string;
  kategori?: Kategori | null;
  satuan_tambahan?: ProdukSatuan[];
  produk_satuan?: ProdukSatuan[];
  ai_kelas?: {
    id: string;
    kode_kelas: string;
    nama: string;
    total_foto?: number;
    target_foto?: number;
  } | null;
}

export interface ProdukMaster {
  id: string;
  kategori_id?: string | null;
  barcode?: string | null;
  nama: string;
  merek?: string | null;
  satuan_dasar: string;
  harga_saran: number;
  foto_url?: string | null;
  master_id?: string | null;
  ai_kelas_id?: string | null;
  terverifikasi: boolean;
  dibuat_pada?: string;
  kategori?: Kategori | null;
  sudah_diadopsi?: boolean;
}

export interface Pelanggan {
  id: string;
  toko_id: string;
  nama: string;
  telepon?: string | null;
  alamat?: string | null;
  batas_bon: number;
  total_piutang: number;
  catatan?: string | null;
  aktif: boolean;
  dibuat_pada?: string;
}

export interface Piutang {
  id: string;
  toko_id: string;
  pelanggan_id: string;
  transaksi_id?: string | null;
  total_bon: number;
  terbayar: number;
  sisa_bon: number;
  jatuh_tempo?: string | null;
  status: 'belum_lunas' | 'cicilan' | 'lunas' | 'batal';
  dibuat_pada?: string;
  pelanggan?: Pelanggan | null;
  transaksi?: {
    id: string;
    no_transaksi: string;
    total: number;
    tgl_transaksi: string;
  } | null;
  pembayaran?: Array<{
    id: string;
    nominal_bayar: number;
    metode: string;
    no_bukti?: string | null;
    tgl_bayar: string;
    kasir?: { nama_lengkap?: string } | null;
  }>;
}

export interface ShiftKasir {
  id: string;
  toko_id: string;
  kasir_id: string;
  waktu_buka: string;
  waktu_tutup?: string | null;
  modal_awal: number;
  total_penjualan_tunai: number;
  total_penjualan_non_tunai: number;
  total_kas_masuk: number;
  total_kas_keluar: number;
  uang_fisik_akhir?: number | null;
  selisih_kas?: number | null;
  catatan_buka?: string | null;
  catatan_tutup?: string | null;
  status: 'terbuka' | 'tertutup';
  kasir?: Pick<Pengguna, 'id' | 'nama_lengkap' | 'email'> | null;
}

export interface TransaksiItem {
  id?: string;
  produk_id: string;
  nama_produk: string;
  nama_satuan: string;
  konversi_satuan: number;
  jumlah: number;
  harga_modal_satuan?: number;
  harga_satuan: number;
  diskon_item?: number;
  subtotal: number;
  metode_input?: 'manual' | 'barcode' | 'ai_kamera';
  produk?: Pick<Produk, 'id' | 'nama' | 'foto_url' | 'barcode'> | null;
}

export interface Transaksi {
  id: string;
  toko_id: string;
  shift_id?: string | null;
  kasir_id: string;
  pelanggan_id?: string | null;
  nomor_faktur: string;
  no_transaksi?: string;
  subtotal: number;
  diskon: number;
  pajak?: number;
  total: number;
  metode_bayar: 'tunai' | 'qris' | 'split' | 'bon';
  bayar_tunai: number;
  bayar_qris: number;
  uang_diterima?: number;
  split_tunai?: number;
  split_qris?: number;
  qris_ref?: string | null;
  kembalian: number;
  status: 'selesai' | 'batal';
  alasan_batal?: string | null;
  catatan?: string | null;
  dibuat_pada: string;
  tgl_transaksi?: string;
  kasir?: Pick<Pengguna, 'id' | 'nama_lengkap'> | null;
  pelanggan?: Pick<Pelanggan, 'id' | 'nama' | 'telepon'> | null;
  items?: TransaksiItem[];
  transaksi_item?: TransaksiItem[];
}

export interface Pemasok {
  id: string;
  toko_id: string;
  nama: string;
  kontak_person?: string | null;
  telepon?: string | null;
  alamat?: string | null;
  catatan?: string | null;
  aktif: boolean;
}

export interface Kulakan {
  id: string;
  toko_id: string;
  pemasok_id?: string | null;
  dibuat_oleh?: string | null;
  nomor_faktur: string;
  no_faktur?: string;
  tanggal_kulakan: string;
  tgl_beli?: string;
  total_biaya: number;
  total_beli?: number;
  metode_bayar: 'tunai' | 'transfer' | 'tempo';
  jenis_bayar?: string;
  status_bayar: 'lunas' | 'belum_lunas';
  lunas?: boolean;
  jatuh_tempo?: string | null;
  sisa_utang?: number;
  total_dibayar?: number;
  riwayat_pembayaran?: Array<any>;
  catatan?: string | null;
  dibuat_pada: string;
  pemasok?: Pemasok | null;
  items?: Array<{
    id: string;
    produk_id: string;
    nama_satuan: string;
    isi_konversi: number;
    jumlah: number;
    harga_satuan: number;
    subtotal: number;
    produk?: Pick<Produk, 'id' | 'nama' | 'sku' | 'barcode' | 'satuan_dasar' | 'foto_url'> | null;
  }>;
}

export interface ArusKas {
  id: string;
  toko_id: string;
  shift_id?: string | null;
  pengguna_id?: string | null;
  jenis: 'masuk' | 'keluar';
  kategori: string;
  nominal: number;
  keterangan?: string | null;
  referensi_id?: string | null;
  waktu: string;
  pengguna?: Pick<Pengguna, 'id' | 'nama_lengkap'> | null;
}

export interface MutasiStok {
  id: string;
  toko_id: string;
  produk_id: string;
  pengguna_id?: string | null;
  jenis: 'penjualan' | 'kulakan' | 'opname' | 'koreksi' | 'rusak' | 'batal_jual' | 'penyesuaian' | string;
  perubahan: number;
  stok_sebelum: number;
  stok_sesudah: number;
  referensi_id?: string | null;
  keterangan?: string | null;
  catatan?: string | null;
  waktu: string;
  produk?: Pick<Produk, 'id' | 'nama' | 'sku' | 'barcode' | 'satuan_dasar' | 'foto_url'> | null;
  pengguna?: Pick<Pengguna, 'id' | 'nama_lengkap'> | null;
}

export interface AIModel {
  id: string;
  versi: string;
  nama_model?: string;
  arsitektur: string;
  jml_kelas: number;
  total_kelas?: number;
  ukuran_input?: number;
  akurasi_top1: number;
  akurasi_top3?: number;
  f1_score?: number;
  ukuran_mb?: number;
  ukuran_model_mb?: number;
  latensi_ms?: number;
  model_json_url: string;
  class_json_url?: string | null;
  path_model_json?: string | null;
  path_bobot_bin?: string | null;
  path_label?: string | null;
  daftar_kelas?: string[] | Record<string, string> | null;
  labels?: string[] | null;
  threshold_config?: {
    high_threshold: number;
    medium_threshold: number;
    auto_add_high_confidence: boolean;
    show_top3_candidates: boolean;
    fallback_barcode_on_low: boolean;
    updated_at?: string;
  } | null;
  ringkasan_training?: Record<string, any> | null;
  confidence_threshold?: number;
  aktif: boolean;
  status?: string;
  tgl_rilis?: string | null;
  dirilis_pada?: string;
  dibuat_pada?: string;
}

export interface AIKelas {
  id: string;
  kode_kelas: string;
  nama: string;
  nama_kelas?: string;
  kategori?: string | null;
  barcode?: string | null;
  sku?: string | null;
  master_id?: string | null;
  foto_url?: string | null;
  indeks_label?: number | null;
  indeks_kelas?: number | null;
  target_foto: number;
  total_foto: number;
  foto_terkumpul?: number;
  jml_terverifikasi: number;
  jml_hf: number;
  foto_tersinkron_hf?: number;
  aktif: boolean;
  status?: string;
  persentase_target?: number;
  status_kuota?: string;
  produk_master?: Pick<ProdukMaster, 'id' | 'nama' | 'foto_url' | 'barcode'> | null;
  master?: any;
}

export interface AISampel {
  id: string;
  kelas_id: string;
  toko_id?: string | null;
  diunggah_oleh?: string | null;
  nama_file: string;
  storage_path: string;
  path_file?: string;
  foto_url: string;
  sudut_ambil?: string | null;
  sudut?: string | null;
  sumber?: string | null;
  status?: 'menunggu' | 'diterima' | 'ditolak';
  terverifikasi?: boolean;
  alasan_tolak?: string | null;
  tersinkron_hf: boolean;
  lokasi_simpan?: 'supabase' | 'huggingface';
  hf_path?: string | null;
  dibuat_pada: string;
  kelas?: Pick<AIKelas, 'id' | 'kode_kelas' | 'nama' | 'nama_kelas' | 'kategori'> | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  ringkasan?: Record<string, number>;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages?: number;
  };
}

