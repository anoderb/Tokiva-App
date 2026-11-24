import { api } from '../api';
import type {
  Kategori,
  Pelanggan,
  PaginatedResponse,
  Produk,
  Toko,
  Transaksi,
} from '@/types/api';

export interface CheckoutPayload {
  shift_id?: string | null;
  pelanggan_id?: string | null;
  diskon?: number;
  pajak?: number;
  metode_bayar: 'tunai' | 'qris' | 'split' | 'bon';
  uang_diterima?: number;
  bayar_tunai?: number;
  split_tunai?: number;
  split_qris?: number;
  bayar_qris?: number;
  qris_ref?: string | null;
  uang_muka?: number;
  alokasi_bayar_bon?: number;
  jatuh_tempo_bon?: string;
  catatan?: string;
  items: Array<{
    produk_id: string;
    satuan_id?: string | null;
    nama_satuan?: string;
    konversi_satuan?: number;
    jumlah: number;
    harga_satuan: number;
    diskon_item?: number;
    metode_input?: 'manual' | 'barcode' | 'ai_kamera';
  }>;
}

export const posService = {
  getKategori(): Promise<Kategori[]> {
    return api.get<Kategori[]>('/kasir/kategori');
  },

  getProduk(params?: {
    search?: string;
    kategori_id?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<Produk> | Produk[]> {
    return api.get<PaginatedResponse<Produk> | Produk[]>('/kasir/produk', params);
  },

  scanBarcode(barcode: string): Promise<{
    tipe_scan: 'eceran' | 'grosir';
    produk: Produk;
    satuan_terpilih: {
      satuan_id?: string | null;
      nama: string;
      nama_satuan?: string;
      isi_konversi: number;
      harga_jual: number;
      barcode: string | null;
    };
  }> {
    return api.get(`/kasir/produk/scan/${encodeURIComponent(barcode)}`);
  },

  getPelanggan(search?: string): Promise<PaginatedResponse<Pelanggan> | Pelanggan[]> {
    return api.get<PaginatedResponse<Pelanggan> | Pelanggan[]>('/kasir/pelanggan', {
      search,
      limit: 100,
    });
  },

  createPelanggan(payload: {
    nama: string;
    telepon?: string;
    alamat?: string;
    batas_bon?: number;
  }): Promise<Pelanggan> {
    return api.post<Pelanggan>('/kasir/pelanggan', payload);
  },

  bayarPiutang(payload: {
    pelanggan_id?: string;
    piutang_id?: string;
    nominal_bayar: number;
    metode?: string;
    shift_id?: string | null;
    catatan?: string;
  }): Promise<any> {
    return api.post('/kasir/piutang/bayar', payload);
  },

  checkout(payload: CheckoutPayload): Promise<Transaksi> {
    return api.post<Transaksi>('/kasir/transaksi', payload);
  },

  getRiwayatTransaksi(params?: {
    search?: string;
    metode_bayar?: string;
    status?: string;
    shift_id?: string;
    tanggal_mulai?: string;
    tanggal_akhir?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<Transaksi>> {
    return api.get<PaginatedResponse<Transaksi>>('/kasir/transaksi', params);
  },

  getDetailTransaksi(id: string): Promise<Transaksi> {
    return api.get<Transaksi>(`/kasir/transaksi/${id}`);
  },

  voidTransaksi(id: string, alasan: string, pin: string): Promise<Transaksi> {
    return api.post<Transaksi>(`/kasir/transaksi/${id}/void`, { alasan, pin });
  },

  verifikasiPin(pin: string): Promise<{ valid: boolean }> {
    return api.post<{ valid: boolean }>('/kasir/verifikasi-pin', { pin });
  },

  getProfilToko(): Promise<Toko> {
    return api.get<Toko>('/kasir/toko/profil');
  },

  getQrisStatus(): Promise<{
    qris_status: 'valid' | 'empty' | string;
    qris_aktif: boolean;
    qris_info: any;
    qris_string: string | null;
    qris_foto_url: string | null;
    qris_mid: string | null;
    merchant_name: string;
    merchant_city: string;
  }> {
    return api.get('/kasir/toko/qris/status');
  },

  generateDynamicQris(nominal: number): Promise<{
    qris_dinamis: string;
    qr_image: string;
    nominal: number;
    merchant_name: string;
    merchant_city: string;
    ref_id: string;
    expires_in_seconds: number;
  }> {
    return api.post('/kasir/qris/generate', { nominal });
  },
};

