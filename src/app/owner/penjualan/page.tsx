"use client";

import { useState } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { PosTerminal } from "@/components/shared/pos-terminal";
import { TransactionHistoryPanel } from "@/components/shared/transaction-history-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { ReceiptText, ShoppingCart } from "lucide-react";

export default function PenjualanOwnerPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pos" | "riwayat">("pos");

  return (
    <OwnerLayout
      title="Penjualan & Riwayat Transaksi Toko"
      desc="Layani transaksi langsung melalui terminal POS atau pantau seluruh riwayat transaksi dari semua kasir."
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="inline-flex p-1 rounded-xl bg-muted border-2 border-fg shadow-[2px_2px_0px_#1E293B]">
          <button
            type="button"
            onClick={() => setActiveTab("pos")}
            className={`px-3.5 py-2 rounded-lg text-xs font-heading font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === "pos"
                ? "bg-accent text-white border-2 border-fg shadow-xs"
                : "text-muted-fg hover:text-fg"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Terminal POS Kasir</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("riwayat")}
            className={`px-3.5 py-2 rounded-lg text-xs font-heading font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === "riwayat"
                ? "bg-accent text-white border-2 border-fg shadow-xs"
                : "text-muted-fg hover:text-fg"
            }`}
          >
            <ReceiptText className="w-4 h-4" />
            <span>Riwayat Seluruh Transaksi</span>
          </button>
        </div>
      </div>

      {activeTab === "pos" ? (
        <PosTerminal mode="owner" cashierName={user?.nama_lengkap || "Owner"} hideOwnerLayout />
      ) : (
        <TransactionHistoryPanel role="owner" active={activeTab === "riwayat"} />
      )}
    </OwnerLayout>
  );
}
