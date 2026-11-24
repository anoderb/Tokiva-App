"use client";

import { Badge } from "@/components/ui/badge";
import { CashierHeader } from "@/components/layout/cashier-header";
import { TransactionHistoryPanel } from "@/components/shared/transaction-history-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { UserCheck } from "lucide-react";

export default function KasirRiwayatPage() {
  const { user, toko } = useAuth();

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col font-body">
      <CashierHeader cashierName={user?.nama_lengkap} storeName={toko?.nama} />

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-3 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-lg sm:text-xl font-extrabold">
                Riwayat Transaksi Saya
              </h1>
              <Badge variant="green" className="text-[11px] flex items-center gap-1">
                <UserCheck className="w-3 h-3 inline mr-0.5" />
                Kasir: {user?.nama_lengkap || "Kasir Aktif"}
              </Badge>
            </div>
            <p className="text-xs text-muted-fg mt-0.5">
              Menampilkan khusus riwayat faktur penjualan yang dilayani oleh akun kasir Anda.
            </p>
          </div>
        </div>

        <TransactionHistoryPanel role="kasir" />
      </main>
    </div>
  );
}
