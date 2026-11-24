import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Users,
  Wallet,
  Clock,
  ChartNoAxesCombined,
  UsersRound,
  Settings,
  Menu,
  Store,
  Brain,
  BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem { label: string; icon: LucideIcon; href?: string; }

export const sidebarMenu: NavItem[] = [
  { label: "Dashboard",   icon: LayoutDashboard,       href: "/owner" },
  { label: "Penjualan",   icon: ShoppingCart,          href: "/owner/penjualan" },
  { label: "Produk",      icon: Package,               href: "/owner/produk" },
  { label: "Persediaan",  icon: Boxes,                 href: "/owner/persediaan" },
  { label: "Pembelian",   icon: Truck,                 href: "/owner/pembelian" },
  { label: "Pelanggan",   icon: Users,                 href: "/owner/pelanggan" },
  { label: "Keuangan",    icon: Wallet,                href: "/owner/keuangan" },
  { label: "Shift Kasir", icon: Clock,                 href: "/owner/shift-kasir" },
  { label: "Laporan",     icon: ChartNoAxesCombined,   href: "/owner/laporan" },
  { label: "Pengguna",    icon: UsersRound,            href: "/owner/pengguna" },
  { label: "Pengaturan",  icon: Settings,              href: "/owner/pengaturan" },
];

export const adminMenu: NavItem[] = [
  { label: "Dashboard",       icon: LayoutDashboard, href: "/admin" },
  { label: "Manajemen Toko",  icon: Store,           href: "/admin/toko" },
  { label: "Pengguna",        icon: UsersRound,      href: "/admin/pengguna" },
  { label: "Katalog Produk",  icon: Package,         href: "/admin/produk" },
  { label: "Manajemen AI",    icon: Brain,           href: "/admin/ai" },
  { label: "Analitik",        icon: BarChart3,       href: "/admin/analitik" },
  { label: "Pengaturan",      icon: Settings,        href: "/admin/pengaturan" },
];

export const bottomNavItems = [
  { label: "Beranda",   icon: LayoutDashboard, href: "/owner" },
  { label: "Penjualan", icon: ShoppingCart,    href: "/owner/penjualan" },
  { label: "Produk",    icon: Package,         href: "/owner/produk" },
  { label: "Stok",      icon: Boxes,           href: "/owner/persediaan" },
  { label: "Lainnya",   icon: Menu },
] as const;

export const morePanel: NavItem[] = [
  { label: "Pembelian",   icon: Truck,               href: "/owner/pembelian" },
  { label: "Pelanggan",   icon: Users,               href: "/owner/pelanggan" },
  { label: "Keuangan",    icon: Wallet,              href: "/owner/keuangan" },
  { label: "Shift Kasir", icon: Clock,               href: "/owner/shift-kasir" },
  { label: "Laporan",     icon: ChartNoAxesCombined, href: "/owner/laporan" },
  { label: "Pengguna",    icon: UsersRound,          href: "/owner/pengguna" },
  { label: "Pengaturan",  icon: Settings,            href: "/owner/pengaturan" },
];
