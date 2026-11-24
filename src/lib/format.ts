/**
 * Helper pemformatan mata uang Rupiah, angka, tanggal, dan waktu Indonesia
 */

export function formatRupiah(nominal: number | string | null | undefined, withPrefix = true): string {
  const num = Number(nominal || 0);
  const formatted = Math.round(num).toLocaleString('id-ID');
  return withPrefix ? `Rp${formatted}` : formatted;
}

export function formatNumber(nominal: number | string | null | undefined): string {
  const num = Number(nominal || 0);
  if (Number.isNaN(num)) return '0';
  return Math.round(num).toLocaleString('id-ID');
}

export function formatRupiahSingkat(nominal: number | string | null | undefined): string {
  const num = Number(nominal || 0);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}Rp${(abs / 1_000_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp${(abs / 1_000_000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')}jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp${Math.round(abs / 1_000)}rb`;
  }
  return `${sign}Rp${Math.round(abs).toLocaleString('id-ID')}`;
}

export function formatTanggal(isoString?: string | null): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return String(isoString);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export const formatDate = formatTanggal;

export function formatWaktu(isoString?: string | null): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return String(isoString);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTanggalWaktu(isoString?: string | null): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return String(isoString);
  return `${formatTanggal(isoString)}, ${formatWaktu(isoString)}`;
}

export const formatDateTime = formatTanggalWaktu;

export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'TK';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function hitungDurasi(waktuMulai?: string | null, waktuSelesai?: string | null): string {
  if (!waktuMulai) return '-';
  const start = new Date(waktuMulai).getTime();
  const end = waktuSelesai ? new Date(waktuSelesai).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return '-';
  const diffMinutes = Math.floor((end - start) / 60000);
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
}
