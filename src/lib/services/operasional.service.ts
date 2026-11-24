import { api } from '../api';
import type {
  ArusKas,
  Kulakan,
  PaginatedResponse,
  Pelanggan,
  Pemasok,
  Piutang,
  Transaksi,
} from '@/types/api';

export const operasionalService = {
  // Pelanggan & Piutang Kas Bon
  getPelanggan(params?: {
    search?: string;
    punya_piutang?: boolean;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<Pelanggan>> {
    return api.get<PaginatedResponse<Pelanggan>>('/owner/pelanggan', params);
  },

  getDetailPelanggan(id: string): Promise<Pelanggan> {
    return api.get<Pelanggan>(`/owner/pelanggan/${id}`);
  },

  createPelanggan(payload: {
    nama: string;
    telepon?: string;
    alamat?: string;
    batas_bon?: number;
    catatan?: string;
  }): Promise<Pelanggan> {
    return api.post<Pelanggan>('/owner/pelanggan', payload);
  },

  updatePelanggan(id: string, payload: Partial<Pelanggan>): Promise<Pelanggan> {
    return api.put<Pelanggan>(`/owner/pelanggan/${id}`, payload);
  },

  deletePelanggan(id: string): Promise<void> {
    return api.delete(`/owner/pelanggan/${id}`);
  },

  getPiutang(params?: {
    pelanggan_id?: string;
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<Piutang>> {
    return api.get<PaginatedResponse<Piutang>>('/owner/piutang', params);
  },

  getKartuPiutang(pelangganId: string): Promise<{
    pelanggan: Pelanggan;
    ringkasan?: {
      batas_bon: number;
      total_piutang_berjalan: number;
      sisa_limit_bon: number;
      status_limit: string;
    };
    daftar_bon: Piutang[];
  }> {
    return api.get(`/owner/piutang/kartu/${pelangganId}`);
  },

  bayarPiutang(payload: {
    piutang_id?: string;
    pelanggan_id?: string;
    nominal_bayar: number;
    metode?: 'tunai' | 'qris' | 'transfer';
    catatan?: string;
  }): Promise<any> {
    return api.post('/owner/piutang/bayar', payload);
  },

  // Pemasok & Kulakan
  getPemasok(params?: {
    search?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<Pemasok> | Pemasok[]> {
    return api.get<PaginatedResponse<Pemasok> | Pemasok[]>('/owner/pemasok', params);
  },

  createPemasok(payload: {
    nama: string;
    kontak_person?: string;
    telepon?: string;
    alamat?: string;
    catatan?: string;
  }): Promise<Pemasok> {
    return api.post<Pemasok>('/owner/pemasok', payload);
  },

  getKulakan(params?: {
    search?: string;
    pemasok_id?: string;
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<Kulakan>> {
    return api.get<PaginatedResponse<Kulakan>>('/owner/kulakan', params);
  },

  getDetailKulakan(id: string): Promise<Kulakan> {
    return api.get<Kulakan>(`/owner/kulakan/${id}`);
  },

  createKulakan(payload: {
    pemasok_id?: string | null;
    no_faktur?: string;
    nomor_faktur?: string;
    tgl_beli?: string;
    tanggal_kulakan?: string;
    tgl_terima?: string;
    jenis_bayar?: string;
    metode_bayar?: 'tunai' | 'transfer' | 'tempo';
    status_bayar?: 'lunas' | 'belum_lunas';
    jatuh_tempo?: string | null;
    foto_nota?: string | null;
    catatan?: string;
    items: Array<{
      produk_id: string;
      nama_satuan?: string;
      isi_konversi?: number;
      jumlah: number;
      harga_satuan?: number;
      harga_beli_satuan?: number;
      subtotal?: number;
      update_harga_modal?: boolean;
    }>;
  }): Promise<Kulakan> {
    return api.post<Kulakan>('/owner/kulakan', payload);
  },

  bayarUtangKulakan(
    id: string,
    payload: {
      nominal_bayar: number;
      metode?: 'transfer' | 'tunai';
      tgl_bayar?: string;
      foto_bukti?: string | null;
      catatan?: string | null;
    }
  ): Promise<any> {
    return api.post(`/owner/kulakan/${id}/bayar`, payload);
  },

  getReturKulakan(params?: {
    search?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<any>> {
    return api.get<PaginatedResponse<any>>('/owner/kulakan/retur', params);
  },

  returKulakan(
    id: string,
    payload: {
      alasan: string;
      kompensasi: 'potong_nota' | 'refund_tunai' | 'refund_transfer' | 'tukar_barang';
      tgl_retur?: string;
      items: Array<{
        detail_id?: string;
        produk_id: string;
        jumlah_retur: number;
      }>;
    }
  ): Promise<any> {
    return api.post(`/owner/kulakan/${id}/retur`, payload);
  },

  // Arus Kas Owner
  getArusKas(params?: {
    tipe?: 'masuk' | 'keluar';
    jenis?: 'masuk' | 'keluar';
    kategori?: string;
    tanggal_awal?: string;
    tanggal_akhir?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<ArusKas>> {
    return api.get<PaginatedResponse<ArusKas>>('/owner/arus-kas', params);
  },

  getRingkasanArusKas(params?: {
    bulan?: number;
    tahun?: number;
  }): Promise<{
    total_masuk: number;
    total_keluar: number;
    saldo_bersih: number;
  }> {
    return api.get('/owner/arus-kas/ringkasan', params);
  },

  tambahArusKas(payload: {
    jenis: 'masuk' | 'keluar';
    kategori: string;
    nominal: number;
    keterangan?: string;
  }): Promise<ArusKas> {
    return api.post<ArusKas>('/owner/arus-kas', payload);
  },

  // Transaksi Owner Audit & Void
  getTransaksiOwner(params?: {
    search?: string;
    kasir_id?: string;
    shift_id?: string;
    metode_bayar?: string;
    status?: string;
    tanggal?: string;
    tanggal_mulai?: string;
    tanggal_akhir?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<Transaksi>> {
    return api.get<PaginatedResponse<Transaksi>>('/owner/transaksi', params);
  },

  getDetailTransaksiOwner(id: string): Promise<Transaksi> {
    return api.get<Transaksi>(`/owner/transaksi/${id}`);
  },

  voidTransaksiOwner(id: string, alasan: string): Promise<Transaksi> {
    return api.post<Transaksi>(`/owner/transaksi/${id}/void`, { alasan });
  },

  catatCetakStruk(id: string, rolePrefix: 'kasir' | 'owner' = 'kasir'): Promise<{ id: string; cetak_ke: number }> {
    return api.post<{ id: string; cetak_ke: number }>(`/${rolePrefix}/transaksi/${id}/cetak`, {});
  },
};

