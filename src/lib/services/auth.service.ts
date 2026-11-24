import { api, setStoredToken, setCachedSession } from '../api';
import type { AuthSessionResponse, Pengguna, RegisterResponse, Toko } from '@/types/api';

export const authService = {
  async login(email: string, password: string): Promise<AuthSessionResponse> {
    const data = await api.post<AuthSessionResponse>('/auth/login', { email, password });
    if (data.token?.access_token) {
      setStoredToken(data.token.access_token);
    }
    setCachedSession({ user: data.user, toko: data.toko });
    return data;
  },

  async register(payload: {
    nama_toko: string;
    nama_owner: string;
    email: string;
    password: string;
    telepon?: string;
    kota?: string;
    alamat?: string;
    pin_kasir?: string;
  }): Promise<RegisterResponse> {
    const data = await api.post<RegisterResponse>('/auth/register', payload);
    if (data.token?.access_token && data.user) {
      setStoredToken(data.token.access_token);
      setCachedSession({ user: data.user, toko: data.toko });
    }
    return data;
  },

  verifyEmail(payload: {
    token?: string;
    email?: string;
    otp?: string;
  }): Promise<{ verified: boolean; email: string }> {
    return api.post<{ verified: boolean; email: string }>('/auth/verify-email', payload);
  },

  resendVerification(email: string): Promise<{
    sent: boolean;
    already_verified?: boolean;
    cooldown_seconds?: number;
    message?: string;
  }> {
    return api.post('/auth/resend-verification', { email });
  },

  forgotPassword(email: string): Promise<{
    sent: boolean;
    cooldown_seconds?: number;
    message?: string;
  }> {
    return api.post('/auth/forgot-password', { email });
  },

  resetPassword(payload: {
    token?: string;
    email?: string;
    otp?: string;
    password_baru: string;
  }): Promise<{ reset: boolean; email: string }> {
    return api.post<{ reset: boolean; email: string }>('/auth/reset-password', payload);
  },

  getInviteDetails(token: string): Promise<{
    valid: boolean;
    email: string;
    nama_lengkap: string;
    nama_toko: string;
    expires_at: string;
  }> {
    return api.get(`/auth/invite/${encodeURIComponent(token)}`);
  },

  async acceptInvite(payload: {
    token: string;
    password: string;
    pin_kasir: string;
  }): Promise<AuthSessionResponse> {
    const data = await api.post<AuthSessionResponse>('/auth/invite/accept', payload);
    if (data.token?.access_token) {
      setStoredToken(data.token.access_token);
    }
    setCachedSession({ user: data.user, toko: data.toko });
    return data;
  },

  async getMe(): Promise<{ user: Pengguna; toko: Toko | null }> {
    const data = await api.get<{ user: Pengguna; toko: Toko | null }>('/auth/me');
    setCachedSession(data);
    return data;
  },

  async updateProfil(payload: {
    nama?: string;
    nama_lengkap?: string;
    telepon?: string;
    foto_url?: string;
  }): Promise<{ user: Pengguna; toko: Toko | null }> {
    const data = await api.put<{ user: Pengguna; toko: Toko | null }>('/auth/profil', {
      ...payload,
      nama_lengkap: payload.nama_lengkap ?? payload.nama,
    });
    setCachedSession(data);
    return data;
  },

  async updatePassword(payload: {
    password_lama: string;
    password_baru: string;
  }): Promise<{ updated: boolean }> {
    return api.put<{ updated: boolean }>('/auth/password', payload);
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout', {});
    } finally {
      setStoredToken(null);
      setCachedSession(null);
    }
  },
};
