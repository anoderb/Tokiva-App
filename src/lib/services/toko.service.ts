import { api } from '../api';
import type { PaginatedResponse, Pengguna, Toko } from '@/types/api';

export const tokoService = {
  // Profil & Pengaturan Toko
  getProfilToko(): Promise<Toko> {
    return api.get<Toko>('/owner/toko/profil');
  },

  updateProfilToko(payload: {
    nama?: string;
    pemilik?: string;
    telepon?: string;
    alamat?: string;
    kota?: string;
    logo_url?: string;
  }): Promise<Toko> {
    return api.put<Toko>('/owner/toko/profil', payload);
  },

  updateStruk(payload: {
    struk_header?: string;
    struk_footer?: string;
    lebar_kertas?: '58mm' | '80mm';
    logo_url?: string;
  }): Promise<Toko> {
    return api.put<Toko>('/owner/toko/struk', payload);
  },

  updateQRIS(payload: {
    qris_string?: string;
    qris_foto_url?: string;
    qris_mid?: string;
    qris_url?: string;
    qris_nmid?: string;
    qris_merchant?: string;
  }): Promise<Toko> {
    return api.put<Toko>('/owner/toko/qris', payload);
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
    return api.get('/owner/toko/qris/status');
  },

  // Manajemen Staf Kasir
  getKaryawan(params?: {
    search?: string;
    aktif?: boolean;
  }): Promise<PaginatedResponse<Pengguna> | Pengguna[]> {
    return api.get<PaginatedResponse<Pengguna> | Pengguna[]>('/owner/karyawan', params);
  },

  getDetailKaryawan(id: string): Promise<any> {
    return api.get(`/owner/karyawan/${id}`);
  },

  createKaryawan(payload: {
    nama_lengkap: string;
    email: string;
    telepon?: string;
    password?: string;
    pin_kasir?: string;
    kirim_undangan?: boolean;
  }): Promise<Pengguna & { undangan_terkirim?: boolean }> {
    return api.post<Pengguna & { undangan_terkirim?: boolean }>('/owner/karyawan', payload);
  },

  resendInviteKaryawan(id: string): Promise<{ id: string; email: string; message: string }> {
    return api.post<{ id: string; email: string; message: string }>(`/owner/karyawan/${id}/invite`, {});
  },

  updateKaryawan(
    id: string,
    payload: {
      nama_lengkap?: string;
      telepon?: string;
      aktif?: boolean;
    }
  ): Promise<Pengguna> {
    return api.put<Pengguna>(`/owner/karyawan/${id}`, payload);
  },

  resetPinKaryawan(id: string, pin_baru: string): Promise<{ pin_baru: string; message: string }> {
    return api.post(`/owner/karyawan/${id}/reset-pin`, { pin_baru });
  },

  deleteKaryawan(id: string): Promise<void> {
    return api.delete(`/owner/karyawan/${id}`);
  },

  // Upload Media Gambar (Produk, Logo, QRIS, Bukti)
  uploadMedia(
    payload: {
      file_base64: string;
      kategori?: 'produk' | 'logo' | 'qris' | 'bukti' | 'toko' | 'nota' | 'avatar';
      nama_file?: string;
    },
    rolePrefix: 'kasir' | 'owner' | 'admin' = 'owner'
  ): Promise<{ url: string; path: string; bucket: string }> {
    const folderMap: Record<string, string> = {
      produk: 'produk',
      logo: 'toko',
      toko: 'toko',
      qris: 'qris',
      bukti: 'nota',
      nota: 'nota',
      avatar: 'avatar',
    };
    const folder = folderMap[payload.kategori || 'produk'] || 'produk';

    return api.post(`/${rolePrefix}/media/upload-base64`, {
      gambar: payload.file_base64,
      file_base64: payload.file_base64,
      nama_file: payload.nama_file || 'upload.jpg',
      folder,
      kategori: folder,
    });
  },
};

