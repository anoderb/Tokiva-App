import { api } from '../api';
import type {
  Kategori,
  MutasiStok,
  PaginatedResponse,
  Produk,
  ProdukMaster,
  ProdukSatuan,
} from '@/types/api';

export const produkService = {
  // Kategori
  getKategori(): Promise<Kategori[]> {
    return api.get<Kategori[]>('/owner/kategori');
  },

  createKategori(payload: { nama: string; ikon?: string; warna?: string }): Promise<Kategori> {
    return api.post<Kategori>('/owner/kategori', payload);
  },

  // Produk Owner
  getProduk(params?: {
    search?: string;
    kategori_id?: string;
    stok_menipis?: boolean;
    status_stok?: 'semua' | 'aman' | 'menipis' | 'habis';
    status?: string;
    aktif?: boolean;
    limit?: number;
    page?: number;
  }): Promise<
    PaginatedResponse<Produk> & {
      ringkasan_stok?: {
        total_sku: number;
        aman: number;
        menipis: number;
        habis: number;
        total_valuasi: number;
      };
    }
  > {
    return api.get('/owner/produk', params);
  },

  getDetailProduk(id: string): Promise<Produk> {
    return api.get<Produk>(`/owner/produk/${id}`);
  },

  createProduk(
    payload: Omit<Partial<Produk>, 'satuan_tambahan'> & {
      satuan_tambahan?: Array<Partial<ProdukSatuan>>;
      dataset_fotos?: Array<{ nama_file?: string; base64: string; sudut?: string }>;
    }
  ): Promise<Produk> {
    return api.post<Produk>('/owner/produk', payload);
  },

  updateProduk(id: string, payload: Partial<Produk>): Promise<Produk> {
    return api.put<Produk>(`/owner/produk/${id}`, payload);
  },

  deleteProduk(id: string): Promise<Produk> {
    return api.delete<Produk>(`/owner/produk/${id}`);
  },

  // Multi-Satuan Grosir
  addSatuan(
    produkId: string,
    payload: {
      nama_satuan: string;
      isi_konversi: number;
      harga_jual: number;
      harga_modal?: number;
      barcode?: string;
    }
  ): Promise<ProdukSatuan> {
    return api.post<ProdukSatuan>(`/owner/produk/${produkId}/satuan`, payload);
  },

  removeSatuan(produkId: string, satuanId: string): Promise<void> {
    return api.delete(`/owner/produk/${produkId}/satuan/${satuanId}`);
  },

  // Katalog Master Global
  getProdukMasterList(params?: {
    search?: string;
    kategori_id?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<ProdukMaster>> {
    return api.get<PaginatedResponse<ProdukMaster>>('/owner/produk-master', params);
  },

  getProdukMasterByBarcode(barcode: string): Promise<ProdukMaster> {
    return api.get<ProdukMaster>(`/owner/produk-master/${encodeURIComponent(barcode)}`);
  },

  // Stok Opname & Mutasi Stok
  getStokMenipis(): Promise<Produk[]> {
    return api.get<Produk[]>('/owner/stok/menipis');
  },

  opnameStok(payload: {
    produk_id: string;
    stok_fisik: number;
    alasan?: string;
    jenis?: 'opname' | 'koreksi' | 'rusak';
  }): Promise<any> {
    return api.post('/owner/stok/opname', payload);
  },

  getMutasiStok(params?: {
    produk_id?: string;
    jenis?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<MutasiStok>> {
    return api.get<PaginatedResponse<MutasiStok>>('/owner/mutasi-stok', params);
  },
};

