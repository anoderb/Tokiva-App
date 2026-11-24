"use client";

import dynamic from "next/dynamic";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { CashierHeader } from "@/components/layout/cashier-header";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { AlertTriangle, ShoppingCart, Store } from "lucide-react";
import type { PosMode } from "./pos/pos-types";
import { usePosTerminal } from "./pos/usePosTerminal";
import { PosProductCatalog } from "./pos/pos-product-catalog";
import { PosCartSidebar } from "./pos/pos-cart-sidebar";
import { PosPaymentModal } from "./pos/pos-payment-modal";
import { PosUtilityModals } from "./pos/pos-utility-modals";

export type { PosMode };

const BarcodeScannerModal = dynamic(
  () => import("@/components/shared/barcode-scanner-modal").then((m) => m.BarcodeScannerModal),
  { ssr: false }
);
const AiVisionModal = dynamic(
  () => import("@/components/shared/ai-vision-modal").then((m) => m.AiVisionModal),
  { ssr: false }
);
const ThermalReceiptModal = dynamic(
  () => import("@/components/shared/thermal-receipt-modal").then((m) => m.ThermalReceiptModal),
  { ssr: false }
);

function PosShell({
  mode,
  cashierName,
  storeName,
  isShiftActive,
  hideOwnerLayout = false,
  children,
}: {
  mode: PosMode;
  cashierName: string;
  storeName: string;
  isShiftActive: boolean;
  hideOwnerLayout?: boolean;
  children: React.ReactNode;
}) {
  if (mode === "owner") {
    if (hideOwnerLayout) return <>{children}</>;
    return (
      <OwnerLayout
        title="POS Penjualan"
        desc="Transaksi langsung oleh Owner. Stok produk dan laporan penjualan tercatat otomatis."
      >
        {children}
      </OwnerLayout>
    );
  }
  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col font-body">
      <CashierHeader cashierName={cashierName} storeName={storeName} shiftActive={isShiftActive} />
      {children}
    </div>
  );
}

export function PosTerminal({
  mode = "kasir",
  cashierName: cashierNameProp,
  hideOwnerLayout = false,
}: {
  mode?: PosMode;
  cashierName?: string;
  hideOwnerLayout?: boolean;
}) {
  const pos = usePosTerminal({ mode, cashierNameProp });

  return (
    <PosShell
      mode={mode}
      cashierName={pos.cashierName}
      storeName={pos.storeName}
      isShiftActive={Boolean(pos.activeShift && pos.activeShift.status === "terbuka")}
      hideOwnerLayout={hideOwnerLayout}
    >
      <div className={`flex-1 min-w-0 max-w-[1700px] w-full mx-auto ${mode === "kasir" ? "p-3 sm:p-4" : ""}`}>
          {!pos.loadingCatalog && !pos.activeShift && mode === "kasir" && (
        <div className="mb-3 p-3 rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/40 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Shift kasir belum dibuka. Anda tetap dapat bertransaksi atau membuka shift terlebih dahulu.</span>
          </div>
            <Button size="sm" onClick={() => pos.setIsShiftModalOpen(true)}>
              Buka Shift Sekarang
            </Button>
        </div>
        )}

        <div className="lg:hidden flex items-center p-1 bg-muted border-2 border-fg rounded-xl mb-3 shadow-[2px_2px_0px_#1E293B]">
          <button
            type="button"
            onClick={() => pos.setMobileTab("katalog")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${pos.mobileTab === "katalog" ? "bg-accent text-white border-2 border-fg shadow-sm" : "text-muted-fg hover:text-fg"
              }`}
          >
            <Store className="w-4 h-4" />
            <span>Katalog Produk</span>
          </button>
          <button
            type="button"
            onClick={() => pos.setMobileTab("keranjang")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${pos.mobileTab === "keranjang" ? "bg-accent text-white border-2 border-fg shadow-sm" : "text-muted-fg hover:text-fg"
              }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Keranjang</span>
              {
                pos.cartTotalQty > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-red-500 text-white border border-white ml-0.5">
                    {pos.cartTotalQty}
                  </span>
                )
              }
          </button>
        </div>

        <div className="flex gap-3 sm:gap-4 max-lg:flex-col min-w-0">
              <PosProductCatalog
                visible={pos.mobileTab === "katalog"}
                products={pos.filteredProducts}
                categories={pos.categories}
                selectedCategory={pos.selectedCategory}
                searchQuery={pos.searchQuery}
                loadingCatalog={pos.loadingCatalog}
                pendingCount={pos.pendingOrders.length}
                onChangeSearch={pos.setSearchQuery}
                onBarcodeEnter={(code) => {
                  pos.handleBarcodeScan(code);
                  pos.setSearchQuery("");
                }}
                onSelectCategory={pos.setSelectedCategory}
                onOpenBarcodeModal={() => pos.setIsBarcodeModalOpen(true)}
                onOpenAiModal={() => pos.setIsAiModalOpen(true)}
                onOpenPendingModal={() => pos.setIsPendingListModalOpen(true)}
                onRefresh={pos.fetchPosData}
                onAddToCart={(product, unit) => pos.addToCart(product, unit, 1, "manual")}
              />

          <PosCartSidebar
            visible={pos.mobileTab === "keranjang"}
            mode={mode}
            cart={pos.cart}
            cartTotalQty={pos.cartTotalQty}
            cartGrandTotal={pos.cartGrandTotal}
            pendingCount={pos.pendingOrders.length}
            customers={pos.customers}
            selectedCustomerId={pos.selectedCustomerId}
            selectedCustomer={pos.selectedCustomer}
            processingCheckout={pos.processingCheckout}
            onBackToCatalog={() => pos.setMobileTab("katalog")}
            onOpenPendingList={() => pos.setIsPendingListModalOpen(true)}
            onOpenClearCart={() => pos.setIsClearCartModalOpen(true)}
            onOpenAddCustomer={() => pos.setIsAddCustomerModalOpen(true)}
            onSelectCustomer={pos.setSelectedCustomerId}
            onOpenPayDebt={pos.handleOpenPayDebt}
            onUpdateCartQty={pos.updateCartQty}
            onOpenHoldModal={pos.handleOpenHoldModal}
            onOpenPayment={pos.handleOpenPayment}
          />
        </div>
      </div>

      <BarcodeScannerModal
        open={pos.isBarcodeModalOpen}
        onClose={() => pos.setIsBarcodeModalOpen(false)}
        onScan={pos.handleBarcodeScan}
        quickShortcuts={pos.barcodeShortcuts}
      />

      <AiVisionModal
        open={pos.isAiModalOpen}
        onClose={() => pos.setIsAiModalOpen(false)}
        products={pos.products}
        cart={pos.cart}
        onSelectProduct={(prod, unit, metode) => pos.addToCart(prod, unit || "base", 1, metode || "ai_kamera")}
        onUpdateCartQty={pos.updateCartQty}
      />

      <PosPaymentModal
        open={pos.isPaymentModalOpen}
        paymentStep={pos.paymentStep}
        paymentMethod={pos.paymentMethod}
        cartGrandTotal={pos.cartGrandTotal}
        cashReceived={pos.cashReceived}
        splitCashAmount={pos.splitCashAmount}
        debtDownPayment={pos.debtDownPayment}
        selectedCustomer={pos.selectedCustomer}
        allocateDebtPayment={pos.allocateDebtPayment}
        debtAllocatedAmount={pos.debtAllocatedAmount}
        processingCheckout={pos.processingCheckout}
        generatingQr={pos.generatingQr}
        qrStatus={pos.qrStatus}
        qrRemainingSec={pos.qrRemainingSec}
        qrRefId={pos.qrRefId}
        dynamicQrImage={pos.dynamicQrImage}
        dynamicQrMerchant={pos.dynamicQrMerchant}
        dynamicQrCity={pos.dynamicQrCity}
        storeName={pos.storeName}
        isQrZoomModalOpen={pos.isQrZoomModalOpen}
        onClose={() => {
          pos.setIsPaymentModalOpen(false);
          pos.setPaymentStep("form");
        }}
            onSelectMethod={pos.setPaymentMethod}
            onChangeCashReceived={pos.setCashReceived}
            onChangeSplitCash={pos.setSplitCashAmount}
            onChangeDebtDownPayment={pos.setDebtDownPayment}
            onToggleAllocateDebt={pos.handleToggleAllocateDebt}
            onChangeDebtAllocated={pos.setDebtAllocatedAmount}
            onConfirmPayment={pos.handleConfirmPayment}
            onRegenerateQr={pos.generateAndShowDynamicQris}
            onBackToForm={() => pos.setPaymentStep("form")}
            onFinalizePayment={pos.executeFinalizePayment}
            onOpenQrZoom={() => pos.setIsQrZoomModalOpen(true)}
            onCloseQrZoom={() => pos.setIsQrZoomModalOpen(false)}
      />

      <ThermalReceiptModal
        open={pos.isReceiptModalOpen}
        onClose={() => pos.setIsReceiptModalOpen(false)}
        data={pos.completedTransaction}
      />

          <PosUtilityModals
            isShiftModalOpen={pos.isShiftModalOpen}
            openShiftCashInput={pos.openShiftCashInput}
            onCloseShiftModal={() => pos.setIsShiftModalOpen(false)}
            onChangeOpenShiftCash={pos.setOpenShiftCashInput}
            onOpenShiftNow={pos.handleOpenShiftNow}
            isAddCustomerModalOpen={pos.isAddCustomerModalOpen}
            newCustNama={pos.newCustNama}
            newCustTelepon={pos.newCustTelepon}
            newCustAlamat={pos.newCustAlamat}
            newCustBatasBon={pos.newCustBatasBon}
            submittingCust={pos.submittingCust}
            onCloseAddCustomer={() => pos.setIsAddCustomerModalOpen(false)}
            onChangeNewCustNama={pos.setNewCustNama}
            onChangeNewCustTelepon={pos.setNewCustTelepon}
            onChangeNewCustAlamat={pos.setNewCustAlamat}
            onChangeNewCustBatasBon={pos.setNewCustBatasBon}
            onSaveQuickCustomer={pos.handleSaveQuickCustomer}
            isPayDebtModalOpen={pos.isPayDebtModalOpen}
            selectedCustomer={pos.selectedCustomer}
            debtPayAmount={pos.debtPayAmount}
            debtPayMethod={pos.debtPayMethod}
            submittingDebtPay={pos.submittingDebtPay}
            onClosePayDebt={() => pos.setIsPayDebtModalOpen(false)}
            onChangeDebtPayAmount={pos.setDebtPayAmount}
            onChangeDebtPayMethod={pos.setDebtPayMethod}
            onSubmitPayDebt={pos.handleSubmitPayDebt}
            isHoldCartModalOpen={pos.isHoldCartModalOpen}
            cartLength={pos.cart.length}
            cartTotalQty={pos.cartTotalQty}
            cartSubtotal={pos.cartSubtotal}
            holdNoteInput={pos.holdNoteInput}
            onCloseHoldModal={() => pos.setIsHoldCartModalOpen(false)}
            onChangeHoldNote={pos.setHoldNoteInput}
            onConfirmHoldCart={pos.handleConfirmHoldCart}
            isPendingListModalOpen={pos.isPendingListModalOpen}
            pendingOrders={pos.pendingOrders}
            onClosePendingList={() => pos.setIsPendingListModalOpen(false)}
            onDeletePendingOrder={pos.handleDeletePendingOrder}
            onResumePendingOrder={pos.handleResumePendingOrder}
          />

      <ConfirmModal
        open={pos.isClearCartModalOpen}
        onClose={() => pos.setIsClearCartModalOpen(false)}
        onConfirm={pos.clearCart}
        title="Kosongkan Keranjang Belanja?"
        message="Seluruh produk di keranjang saat ini akan dihapus."
        confirmText="Ya, Kosongkan"
        variant="danger"
      />
    </PosShell>
  );
}
