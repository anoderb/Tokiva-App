"use client";

import { cn } from "@/lib/cn";
import Link from "next/link";
import { Sparkles, Store, ShieldCheck, ShoppingCart, CheckCircle2, ArrowRight } from "lucide-react";
import { DemoQuickLogin } from "./demo-quick-login";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface AuthLayoutProps {
  children: React.ReactNode;
  theme?: "green" | "purple";
  title?: string;
  subtitle?: string;
}

export function AuthLayout({
  children,
  theme = "green",
  title = "Sistem Kasir & Inventaris Cerdas Toko Kelontong",
  subtitle = "Tingkatkan efisiensi toko dengan identifikasi produk otomatis AI, pencatatan transaksi real-time, dan manajemen stok terintegrasi.",
}: AuthLayoutProps) {
  const isPurple = theme === "purple";

  return (
    <div className="flex min-h-screen bg-bg">
      {/* LEFT SIDE: Brand & Value Proposition Showcase (Hidden on Mobile/Tablet < 1024px) */}
      <div
        className={cn(
          "hidden lg:flex lg:w-1/2 relative flex-col justify-between p-10 xl:p-14 overflow-hidden text-white",
          isPurple
            ? "bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#4C1D95]"
            : "bg-gradient-to-br from-[#0CAF60] via-[#059669] to-[#065F46]"
        )}
      >
        {/* Decorative Grid Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #ffffff 1.5px, transparent 1.5px)`,
            backgroundSize: "24px 24px",
          }}
        />

        {/* Floating Top Brand Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-white text-fg border-2 border-fg flex items-center justify-center font-heading font-extrabold text-2xl shadow-[3px_3px_0px_#1E293B]">
            {isPurple ? <span className="text-[#7C3AED]">T</span> : <span className="text-[#0CAF60]">T</span>}
          </div>
          <div>
            <span className="font-heading font-extrabold text-2xl tracking-tight leading-none block">
              Tokiva
            </span>
            <span className="text-xs opacity-90 font-medium">
              {isPurple ? "Super Admin Portal" : "Point of Sale & AI Kelontong"}
            </span>
          </div>
        </div>

        {/* Center Main Value Proposition & Floating Feature Cards */}
        <div className="relative z-10 max-w-lg my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isPurple ? "Platform Enterprise Control" : "Next-Gen Retail POS System"}</span>
          </div>

          <h1 className="font-heading font-extrabold text-3xl xl:text-4xl leading-tight mb-4 text-white drop-shadow-sm">
            {title}
          </h1>

          <p className="text-sm xl:text-base text-white/90 leading-relaxed mb-8">
            {subtitle}
          </p>

          {/* Neobrutalism Interactive Floating Badges */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-card/95 backdrop-blur-sm border-2 border-fg rounded-lg p-3 text-fg shadow-[3px_3px_0px_#1E293B]">
              <div className="flex items-center gap-2 font-heading font-bold text-xs text-fg mb-1">
                <span className="text-base">🍜</span>
                <span>AI Vision Recognition</span>
              </div>
              <p className="text-[11px] text-muted-fg leading-snug">
                Deteksi kemasan produk otomatis via webcam kasir dengan akurasi 94.2%.
              </p>
            </div>

            <div className="bg-card/95 backdrop-blur-sm border-2 border-fg rounded-lg p-3 text-fg shadow-[3px_3px_0px_#1E293B]">
              <div className="flex items-center gap-2 font-heading font-bold text-xs text-fg mb-1">
                <span className="text-base">📊</span>
                <span>POS & Multi-Tenant</span>
              </div>
              <p className="text-[11px] text-muted-fg leading-snug">
                Pemisahan inventaris dan laporan finansial independen untuk tiap toko.
              </p>
            </div>

            <div className="bg-card/95 backdrop-blur-sm border-2 border-fg rounded-lg p-3 text-fg shadow-[3px_3px_0px_#1E293B]">
              <div className="flex items-center gap-2 font-heading font-bold text-xs text-fg mb-1">
                <span className="text-base">📦</span>
                <span>1.420+ Master Produk</span>
              </div>
              <p className="text-[11px] text-muted-fg leading-snug">
                Database katalog terpusat langsung siap pakai tanpa input manual.
              </p>
            </div>

            <div className="bg-card/95 backdrop-blur-sm border-2 border-fg rounded-lg p-3 text-fg shadow-[3px_3px_0px_#1E293B]">
              <div className="flex items-center gap-2 font-heading font-bold text-xs text-fg mb-1">
                <span className="text-base">🛡️</span>
                <span>Akses Multi-Pengguna</span>
              </div>
              <p className="text-[11px] text-muted-fg leading-snug">
                Pengelolaan peran Owner dan shift Kasir dengan proteksi sesi aman.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof / Stat */}
        <div className="relative z-10 pt-4 border-t border-white/20 flex items-center justify-between text-xs text-white/80">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Digunakan oleh 128+ toko kelontong aktif</span>
          </div>
          <span className="font-mono text-[11px]">Tokiva Engine v1.4</span>
        </div>
      </div>

      {/* RIGHT SIDE: Auth Form Container */}
      <div className="flex-1 flex flex-col justify-between p-4 sm:p-8 lg:p-12 overflow-y-auto min-h-screen">
        {/* Desktop Top Bar */}
        <div className="hidden lg:flex justify-end mb-2">
          <ThemeToggle />
        </div>

        {/* Mobile Header Brand */}
        <div className="lg:hidden flex items-center justify-between mb-6 pb-3 border-b-2 border-border">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "w-9 h-9 rounded-md border-2 border-fg flex items-center justify-center font-heading font-extrabold text-xl text-white shadow-[2px_2px_0px_#1E293B]",
                isPurple ? "bg-admin" : "bg-accent"
              )}
            >
              T
            </div>
            <div>
              <span className="font-heading font-extrabold text-lg text-fg block leading-tight">
                Tokiva
              </span>
              <span className="text-[10px] text-muted-fg">Sistem Kelontong Modern</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <Link
              href={isPurple ? "/auth/login" : "/auth/admin"}
              className="text-[11px] font-bold text-muted-fg hover:text-fg underline"
            >
              {isPurple ? "Portal Pengguna" : "Portal Admin"}
            </Link>
          </div>
        </div>

        {/* Center Content Form */}
        <div className="flex-1 flex items-center justify-center py-4">
          <div className="w-full max-w-md">{children}</div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-4 border-t border-border/80 text-center text-xs text-muted-fg">
          <span>© 2026 Tokiva Platform. Seluruh hak cipta dilindungi undang-undang.</span>
        </div>
      </div>

      {/* Floating Demo Quick Login Helper (for Defense/Demonstration) */}
      <DemoQuickLogin />
    </div>
  );
}

