import { api } from '../api';
import type { Kategori, PaginatedResponse, Pengguna, ProdukMaster, Toko } from '@/types/api';

export interface DashboardAdminData {
  tenant: {
    total_toko: number;
    toko_aktif: number;
    toko_nonaktif: number;
  };
  pengguna: {
    total: number;
    owner: number;
    kasir: number;
  };
  transaksi: {
    total_transaksi: number;
    total_gmv: number;
  };
  produk_master?: {
    total: number;
    merek_unik: number;
  };
  ai: {
    model_aktif: string | null;
    arsitektur?: string | null;
    akurasi_top1: number | null;
    latensi_ms?: number | null;
    total_kelas: number;
    total_sampel: number;
    tersinkron_hf: number;
  };
  pertumbuhan?: {
    labels: string[];
    toko: number[];
    pengguna: number[];
    transaksi: number[];
  };
  kesehatan_layanan?: {
    backend: boolean;
    database: boolean;
    storage: boolean;
    model_aktif: boolean;
    huggingface: boolean;
  };
  toko_terbaru?: Array<
    Toko & {
      jml_pengguna: number;
      jml_transaksi: number;
      total_gmv: number;
    }
  >;
}

export type TokoPlatformItem = Toko & {
  email_owner?: string;
  jml_pengguna: number;
  jml_produk: number;
  jml_transaksi: number;
  total_gmv: number;
  jml_scan_ai?: number;
  akurasi_ai?: number | null;
};

export const adminService = {
  getDashboard(): Promise<DashboardAdminData> {
    return api.get<DashboardAdminData>('/admin/dashboard');
  },

  getTokoList(params?: {
    search?: string;
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<TokoPlatformItem>> {
    return api.get<PaginatedResponse<TokoPlatformItem>>('/admin/toko', params);
  },

  getDetailToko(id: string): Promise<{
    toko: Toko;
    pengguna: Pengguna[];
    statistik: {
      jml_pengguna: number;
      jml_produk: number;
      jml_transaksi: number;
      total_gmv: number;
    };
    transaksi_terbaru: any[];
    shift_terbaru: any[];
  }> {
    return api.get(`/admin/toko/${encodeURIComponent(id)}`);
  },

  createToko(payload: {
    nama_toko: string;
    kode_toko?: string;
    telepon?: string;
    alamat?: string;
    kota?: string;
    nama_owner: string;
    email_owner: string;
    password_owner: string;
    pin_kasir?: string;
  }): Promise<{ toko: Toko; owner: Pengguna }> {
    return api.post('/admin/toko', payload);
  },

  updateStatusToko(
    id: string,
    status: 'aktif' | 'nonaktif' | 'ditangguhkan'
  ): Promise<Toko> {
    return api.put<Toko>(`/admin/toko/${id}/status`, { status });
  },

  getPenggunaList(params?: {
    search?: string;
    peran?: string;
    toko_id?: string;
    aktif?: boolean;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<Pengguna>> {
    return api.get<PaginatedResponse<Pengguna>>('/admin/pengguna', params);
  },

  updateStatusPengguna(id: string, aktif: boolean): Promise<Pengguna> {
    return api.put<Pengguna>(`/admin/pengguna/${id}/status`, { aktif });
  },

  getKategoriGlobal(): Promise<Kategori[]> {
    return api.get<Kategori[]>('/admin/kategori');
  },

  // Katalog Produk Master Global
  getProdukMasterList(params?: {
    search?: string;
    merek?: string;
    kategori_id?: string;
    terverifikasi?: boolean;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<ProdukMaster> & { merek_list?: string[] }> {
    return api.get<PaginatedResponse<ProdukMaster> & { merek_list?: string[] }>(
      '/admin/produk-master',
      params
    );
  },

  createProdukMaster(payload: {
    nama: string;
    merek?: string | null;
    barcode?: string | null;
    kategori_id?: string | null;
    satuan_dasar?: string;
    harga_saran?: number | null;
    foto_url?: string | null;
    terverifikasi?: boolean;
    buat_kelas_ai?: boolean;
  }): Promise<ProdukMaster & { ai_kelas?: any; ai_kelas_status?: 'created' | 'linked' }> {
    return api.post<ProdukMaster & { ai_kelas?: any; ai_kelas_status?: 'created' | 'linked' }>(
      '/admin/produk-master',
      payload
    );
  },

  updateProdukMaster(
    id: string,
    payload: {
      nama?: string;
      merek?: string | null;
      barcode?: string | null;
      kategori_id?: string | null;
      satuan_dasar?: string;
      harga_saran?: number | null;
      foto_url?: string | null;
      terverifikasi?: boolean;
    }
  ): Promise<ProdukMaster> {
    return api.put<ProdukMaster>(`/admin/produk-master/${id}`, payload);
  },

  deleteProdukMaster(id: string): Promise<void> {
    return api.delete(`/admin/produk-master/${id}`);
  },
};
