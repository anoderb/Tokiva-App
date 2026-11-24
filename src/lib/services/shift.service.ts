import { api } from '../api';
import type { ArusKas, PaginatedResponse, ShiftKasir } from '@/types/api';

export const shiftService = {
  // Kasir endpoints
  getShiftAktif(): Promise<ShiftKasir | null> {
    return api.get<ShiftKasir | null>('/kasir/shift/aktif');
  },

  bukaShift(payload: { modal_awal: number; catatan_buka?: string }): Promise<ShiftKasir> {
    return api.post<ShiftKasir>('/kasir/shift/buka', payload);
  },

  tutupShift(
    shiftId: string,
    payload: { uang_fisik_akhir: number; catatan_tutup?: string }
  ): Promise<ShiftKasir> {
    return api.post<ShiftKasir>(`/kasir/shift/${shiftId}/tutup`, payload);
  },

  getRiwayatShiftKasir(params?: {
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<ShiftKasir>> {
    return api.get<PaginatedResponse<ShiftKasir>>('/kasir/shift/riwayat', params);
  },

  getDetailShiftKasir(id: string): Promise<any> {
    return api.get(`/kasir/shift/${id}`);
  },

  getArusKasKasir(params?: {
    jenis?: 'masuk' | 'keluar';
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<ArusKas>> {
    return api.get<PaginatedResponse<ArusKas>>('/kasir/arus-kas', params);
  },

  tambahPengeluaranKasir(payload: {
    jenis?: 'masuk' | 'keluar';
    kategori: string;
    nominal: number;
    keterangan?: string;
    shift_id?: string;
  }): Promise<ArusKas> {
    return api.post<ArusKas>('/kasir/arus-kas', {
      jenis: 'keluar',
      ...payload,
    });
  },

  // Owner endpoints
  getRiwayatShiftOwner(params?: {
    status?: string;
    kasir_id?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<ShiftKasir>> {
    return api.get<PaginatedResponse<ShiftKasir>>('/owner/shift', params);
  },

  getDetailShiftOwner(id: string): Promise<any> {
    return api.get(`/owner/shift/${id}`);
  },
};

