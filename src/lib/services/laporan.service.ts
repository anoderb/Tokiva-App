import { api } from '../api';

export interface DashboardOwnerData {
  hari_ini: {
    tanggal?: string;
    omzet: number;
    laba_kotor?: number;
    jumlah_transaksi: number;
    rata_rata_keranjang: number;
    laba_kotor_estimasi: number;
    pertumbuhan_persen?: number;
  };
  inventaris: {
    total_produk_aktif: number;
    jumlah_stok_menipis: number;
    produk_stok_menipis: Array<{
      id: string;
      nama: string;
      sku?: string;
      stok: number;
      stok_min: number;
      satuan_dasar: string;
      foto_url?: string | null;
    }>;
  };
  keuangan: {
    total_piutang_aktif: number;
    jumlah_pelanggan_bon: number;
  };
  shift_aktif: Array<{
    id: string;
    waktu_buka: string;
    modal_awal: number;
    total_penjualan_tunai: number;
    total_penjualan_non_tunai: number;
    kasir?: { id: string; nama_lengkap: string } | null;
  }>;
  grafik_7_hari?: Array<{
    tanggal: string;
    omzet: number;
    laba_kotor: number;
    jumlah_transaksi: number;
  }>;
  per_metode_bayar?: Record<string, { jumlah_transaksi: number; total_nominal: number }>;
  produk_terlaris: Array<{
    produk_id: string;
    nama_produk: string;
    foto_url?: string | null;
    satuan_dasar?: string;
    total_qty: number;
    total_omzet: number;
  }>;
}

export interface LaporanPenjualanData {
  periode: { tanggal_mulai: string; tanggal_akhir: string };
  ringkasan: {
    total_omzet: number;
    total_diskon: number;
    total_laba_kotor?: number;
    jumlah_transaksi: number;
    rata_rata_transaksi: number;
    total_item_terjual: number;
  };
  per_metode_bayar: Record<string, { jumlah_transaksi: number; total_nominal: number }>;
  tren_harian: Array<{
    tanggal: string;
    omzet: number;
    laba_kotor?: number;
    jumlah_transaksi: number;
  }>;
  produk_terlaris: Array<{
    produk_id: string;
    nama_produk: string;
    total_qty: number;
    total_omzet: number;
  }>;
}

export interface LaporanLabaRugiData {
  periode: { tanggal_mulai: string; tanggal_akhir: string };
  penjualan_kotor: number;
  potongan_diskon: number;
  penjualan_bersih: number;
  hpp_total: number;
  laba_kotor: number;
  margin_kotor_persen: number;
  beban_operasional: number;
  pendapatan_lain: number;
  laba_bersih: number;
  margin_bersih_persen: number;
}

export const laporanService = {
  getDashboardOwner(): Promise<DashboardOwnerData> {
    return api.get<DashboardOwnerData>('/owner/dashboard');
  },

  getLaporanPenjualan(params?: {
    tanggal_awal?: string;
    tanggal_mulai?: string;
    tanggal_akhir?: string;
  }): Promise<LaporanPenjualanData> {
    const queryParams = params
      ? {
          ...params,
          tanggal_awal: params.tanggal_awal || params.tanggal_mulai,
        }
      : undefined;
    return api.get<LaporanPenjualanData>('/owner/laporan/penjualan', queryParams);
  },

  getLaporanLabaRugi(params?: {
    tanggal_awal?: string;
    tanggal_mulai?: string;
    tanggal_akhir?: string;
  }): Promise<LaporanLabaRugiData> {
    const queryParams = params
      ? {
          ...params,
          tanggal_awal: params.tanggal_awal || params.tanggal_mulai,
        }
      : undefined;
    return api.get<LaporanLabaRugiData>('/owner/laporan/laba-rugi', queryParams);
  },
};

