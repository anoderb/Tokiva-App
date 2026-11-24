import { useState, useMemo, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/components/auth/auth-provider";
import { posService } from "@/lib/services/pos.service";
import { shiftService } from "@/lib/services/shift.service";
import type { ReceiptData } from "@/components/shared/thermal-receipt-modal";
import type { Kategori, Pelanggan, Produk, ProdukSatuan, ShiftKasir } from "@/types/api";
import type { CartItem, PaymentMethod, PendingCartOrder, PosMode } from "./pos-types";
import {
  buildCheckoutReceiptData,
  buildDebtReceiptData,
  getCommittedPhysicalStock,
  loadPendingOrders,
  mergeCartOrders,
  savePendingOrders,
} from "./pos-helpers";

/** Hook utama state & orkestrasi logika transaksi Terminal POS */
export function usePosTerminal({ mode, cashierNameProp }: { mode: PosMode; cashierNameProp?: string }) {
  const { user, toko, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const cashierName = cashierNameProp || user?.nama_lengkap || (mode === "owner" ? "Owner Toko" : "Kasir");
  const storeName = toko?.nama || "Tokiva POS";

  const [products, setProducts] = useState<Produk[]>([]);
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [customers, setCustomers] = useState<Pelanggan[]>([]);
  const [activeShift, setActiveShift] = useState<ShiftKasir | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(true);
  const [processingCheckout, setProcessingCheckout] = useState<boolean>(false);

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [openShiftCashInput, setOpenShiftCashInput] = useState(200000);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobileTab, setMobileTab] = useState<"katalog" | "keranjang">("katalog");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("umum");

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isClearCartModalOpen, setIsClearCartModalOpen] = useState(false);

  const [pendingOrders, setPendingOrders] = useState<PendingCartOrder[]>([]);
  const [isHoldCartModalOpen, setIsHoldCartModalOpen] = useState(false);
  const [isPendingListModalOpen, setIsPendingListModalOpen] = useState(false);
  const [holdNoteInput, setHoldNoteInput] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
  const [debtDownPayment, setDebtDownPayment] = useState<number>(0);
  const [completedTransaction, setCompletedTransaction] = useState<ReceiptData | null>(null);

  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustNama, setNewCustNama] = useState("");
  const [newCustTelepon, setNewCustTelepon] = useState("");
  const [newCustAlamat, setNewCustAlamat] = useState("");
  const [newCustBatasBon, setNewCustBatasBon] = useState<number>(500000);
  const [submittingCust, setSubmittingCust] = useState(false);

  const [isPayDebtModalOpen, setIsPayDebtModalOpen] = useState(false);
  const [debtPayAmount, setDebtPayAmount] = useState<number>(0);
  const [debtPayMethod, setDebtPayMethod] = useState<"tunai" | "qris">("tunai");
  const [submittingDebtPay, setSubmittingDebtPay] = useState(false);

  const [allocateDebtPayment, setAllocateDebtPayment] = useState<boolean>(false);
  const [debtAllocatedAmount, setDebtAllocatedAmount] = useState<number>(0);

  const [paymentStep, setPaymentStep] = useState<"form" | "awaiting_qr">("form");
  const [qrStatus, setQrStatus] = useState<"waiting" | "paid" | "expired">("waiting");
  const [qrRemainingSec, setQrRemainingSec] = useState<number>(300);
  const [qrRefId, setQrRefId] = useState<string>("");
  const [dynamicQrImage, setDynamicQrImage] = useState<string | null>(null);
  const [dynamicQrMerchant, setDynamicQrMerchant] = useState<string>("");
  const [dynamicQrCity, setDynamicQrCity] = useState<string>("");
  const [generatingQr, setGeneratingQr] = useState<boolean>(false);
  const [isQrZoomModalOpen, setIsQrZoomModalOpen] = useState<boolean>(false);

  const fetchPosData = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const [prodRes, katRes, pelRes, shiftRes] = await Promise.all([
        posService.getProduk({ limit: 200 }),
        posService.getKategori().catch(() => []),
        posService.getPelanggan().catch(() => []),
        shiftService.getShiftAktif().catch(() => null),
      ]);
      setProducts(Array.isArray(prodRes) ? prodRes : prodRes?.items || []);
      setCategories(Array.isArray(katRes) ? katRes : []);
      setCustomers(Array.isArray(pelRes) ? pelRes : pelRes?.items || []);
      setActiveShift(shiftRes);
    } catch (err: any) {
      if (err?.status !== 401) toast.error(err?.message || "Gagal memuat katalog produk POS");
    } finally {
      setLoadingCatalog(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && user) fetchPosData();
  }, [authLoading, user, fetchPosData]);

  useEffect(() => {
    if (!(isPaymentModalOpen && paymentStep === "awaiting_qr" && qrStatus === "waiting")) return;
    const timer = setInterval(() => {
      setQrRemainingSec((prev) => {
        if (prev <= 1) {
          setQrStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaymentModalOpen, paymentStep, qrStatus]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter((p) => {
      const multiUnits = p.satuan_tambahan || p.produk_satuan || [];
      const matchSearch =
        !q ||
        p.nama.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        multiUnits.some(
          (u) => (u.barcode && u.barcode.toLowerCase().includes(q)) || u.nama_satuan.toLowerCase().includes(q)
        );
      const matchCategory =
        selectedCategory === "Semua" || p.kategori_id === selectedCategory || p.kategori?.nama === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const cartSubtotal = useMemo(() => cart.reduce((acc, item) => acc + item.subtotal, 0), [cart]);
  const cartTotalQty = useMemo(() => cart.reduce((acc, item) => acc + item.qty, 0), [cart]);
  const discountAmount = 0;
  const cartGrandTotal = Math.max(0, cartSubtotal - discountAmount);

  const selectedCustomer = useMemo(
    () => (selectedCustomerId === "umum" ? null : customers.find((c) => c.id === selectedCustomerId) || null),
    [selectedCustomerId, customers]
  );

  const pendingStorageKey = useMemo(() => `tokiva_pending_carts_${toko?.id || "default"}`, [toko?.id]);

  useEffect(() => {
    setPendingOrders(loadPendingOrders(pendingStorageKey));
  }, [pendingStorageKey]);

  const persistPendingOrders = useCallback(
    (nextOrders: PendingCartOrder[]) => {
      setPendingOrders(nextOrders);
      savePendingOrders(pendingStorageKey, nextOrders);
    },
    [pendingStorageKey]
  );

  const addToCart = (
    product: Produk,
    targetUnit: ProdukSatuan | "base" = "base",
    qtyToAdd = 1,
    metodeInput: "manual" | "barcode" | "ai_kamera" = "manual"
  ) => {
    const unitName = targetUnit === "base" ? product.satuan_dasar : targetUnit.nama_satuan;
    const multiplier = targetUnit === "base" ? 1 : Number(targetUnit.isi_konversi || 1);
    const unitPrice = targetUnit === "base" ? Number(product.harga_jual) : Number(targetUnit.harga_jual);
    const cartItemId = `${product.id}-${unitName}`;

    const currentPhysicalCommitted = getCommittedPhysicalStock(cart, product.id);
    if (currentPhysicalCommitted + qtyToAdd * multiplier > Number(product.stok)) {
      const remainingBase = Math.max(0, Number(product.stok) - currentPhysicalCommitted);
      toast.warning(`Stok fisik tidak mencukupi untuk ${qtyToAdd} ${unitName}! Sisa stok tersedia: ${remainingBase} ${product.satuan_dasar}.`);
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newQty = updated[existingIndex].qty + qtyToAdd;
        updated[existingIndex] = { ...updated[existingIndex], qty: newQty, subtotal: newQty * unitPrice, metodeInput };
        return updated;
      }
      return [...prevCart, { cartItemId, product, qty: qtyToAdd, selectedUnit: unitName, multiplier, unitPrice, subtotal: qtyToAdd * unitPrice, metodeInput }];
    });
    toast.success(`+${qtyToAdd} ${unitName} "${product.nama}" (Rp${unitPrice.toLocaleString("id-ID")}) masuk keranjang.`);
  };

  const updateCartQty = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
      return;
    }
    const item = cart.find((c) => c.cartItemId === cartItemId);
    if (!item) return;

    const committedOthers = getCommittedPhysicalStock(cart, item.product.id, cartItemId);
    if (committedOthers + newQty * item.multiplier > Number(item.product.stok)) {
      const availableBase = Math.max(0, Number(item.product.stok) - committedOthers);
      toast.warning(`Stok tidak mencukupi! Tersisa ${availableBase} ${item.product.satuan_dasar} stok fisik.`);
      return;
    }

    setCart((prev) => prev.map((c) => (c.cartItemId === cartItemId ? { ...c, qty: newQty, subtotal: newQty * c.unitPrice } : c)));
  };

  const handleBarcodeScan = async (scannedCode: string) => {
    try {
      const res = await posService.scanBarcode(scannedCode);
      if (res?.produk) {
        const sat = res.satuan_terpilih;
        if (sat && Number(sat.isi_konversi) > 1) {
          addToCart(res.produk, {
            id: sat.satuan_id || sat.barcode || sat.nama,
            produk_id: res.produk.id,
            nama_satuan: sat.nama_satuan || sat.nama,
            isi_konversi: Number(sat.isi_konversi),
            harga_jual: sat.harga_jual,
            barcode: sat.barcode,
          }, 1, "barcode");
        } else {
          addToCart(res.produk, "base", 1, "barcode");
        }
        setIsBarcodeModalOpen(false);
        return;
      }
    } catch {
      for (const p of products) {
        const foundMulti = (p.satuan_tambahan || p.produk_satuan || []).find((u) => u.barcode === scannedCode);
        if (foundMulti) {
          addToCart(p, foundMulti, 1, "barcode");
          setIsBarcodeModalOpen(false);
          return;
        }
        if (p.barcode === scannedCode) {
          addToCart(p, "base", 1, "barcode");
          setIsBarcodeModalOpen(false);
          return;
        }
      }
      toast.error(`Barcode [${scannedCode}] tidak ditemukan di katalog toko.`);
    }
  };

  const handleOpenHoldModal = () => {
    if (cart.length === 0) {
      toast.warning("Keranjang masih kosong. Tambahkan barang sebelum menunda transaksi.");
      return;
    }
    setHoldNoteInput(selectedCustomer ? selectedCustomer.nama : `Antrean #${pendingOrders.length + 1}`);
    setIsHoldCartModalOpen(true);
  };

  const handleConfirmHoldCart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cart.length === 0) return;
    const cleanLabel = holdNoteInput.trim() || (selectedCustomer ? selectedCustomer.nama : `Antrean #${pendingOrders.length + 1}`);
    const newPending: PendingCartOrder = {
      id: `HOLD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      label: cleanLabel,
      customerId: selectedCustomerId,
      customerName: selectedCustomer ? selectedCustomer.nama : "Pelanggan Umum",
      items: cart,
      totalQty: cartTotalQty,
      subtotal: cartSubtotal,
      createdAt: new Date().toISOString(),
      cashierName,
    };
    persistPendingOrders([newPending, ...pendingOrders]);
    setCart([]);
    setSelectedCustomerId("umum");
    setIsHoldCartModalOpen(false);
    setHoldNoteInput("");
    toast.info(`Transaksi "${cleanLabel}" (${newPending.totalQty} item) ditunda ke daftar Pending. Silakan layani antrean berikutnya.`);
  };

  const handleResumePendingOrder = (order: PendingCartOrder, strategy: "swap" | "merge" = "swap") => {
    const hydratedItems: CartItem[] = order.items.map((item) => ({
      ...item,
      product: products.find((p) => p.id === item.product.id) || item.product,
    }));
    let remainingPending = pendingOrders.filter((p) => p.id !== order.id);

    if (cart.length > 0 && strategy === "swap") {
      const autoSavedCurrent: PendingCartOrder = {
        id: `HOLD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        label: selectedCustomer ? `${selectedCustomer.nama} (Auto-Tunda)` : `Antrean Aktif (${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })})`,
        customerId: selectedCustomerId,
        customerName: selectedCustomer ? selectedCustomer.nama : "Pelanggan Umum",
        items: cart,
        totalQty: cartTotalQty,
        subtotal: cartSubtotal,
        createdAt: new Date().toISOString(),
        cashierName,
      };
      remainingPending = [autoSavedCurrent, ...remainingPending];
      setCart(hydratedItems);
      setSelectedCustomerId(order.customerId || "umum");
      toast.success(`Transaksi "${order.label}" dilanjutkan (keranjang sebelumnya otomatis disimpan ke Pending).`);
    } else if (cart.length > 0 && strategy === "merge") {
      const { merged, overflowError } = mergeCartOrders(cart, hydratedItems);
      if (!merged) {
        toast.warning(overflowError || "Stok tidak mencukupi untuk menggabungkan antrean.");
        return;
      }
      setCart(merged);
      if (selectedCustomerId === "umum" && order.customerId !== "umum") setSelectedCustomerId(order.customerId);
      toast.success(`Item dari "${order.label}" digabungkan ke keranjang aktif.`);
    } else {
      setCart(hydratedItems);
      setSelectedCustomerId(order.customerId || "umum");
      toast.success(`Transaksi "${order.label}" berhasil dimuat kembali ke keranjang.`);
    }

    persistPendingOrders(remainingPending);
    setIsPendingListModalOpen(false);
  };

  const handleDeletePendingOrder = (orderId: string, label: string) => {
    persistPendingOrders(pendingOrders.filter((p) => p.id !== orderId));
    toast.info(`Antrean pending "${label}" telah dihapus.`);
  };

  useEffect(() => {
    if (allocateDebtPayment && selectedCustomer) {
      const rawKembalian = Math.max(0, cashReceived - cartGrandTotal);
      setDebtAllocatedAmount(Math.min(rawKembalian, Number(selectedCustomer.total_piutang || 0)));
    }
  }, [cashReceived, cartGrandTotal, allocateDebtPayment, selectedCustomer]);

  const handleToggleAllocateDebt = (checked: boolean) => {
    setAllocateDebtPayment(checked);
    if (checked && selectedCustomer) {
      const rawKembalian = Math.max(0, cashReceived - cartGrandTotal);
      setDebtAllocatedAmount(Math.min(rawKembalian, Number(selectedCustomer.total_piutang || 0)));
    } else {
      setDebtAllocatedAmount(0);
    }
  };

  const handleOpenPayment = () => {
    if (cart.length === 0) {
      toast.warning("Keranjang masih kosong. Tambahkan produk terlebih dahulu.");
      return;
    }
    setPaymentMethod("cash");
    setPaymentStep("form");
    setQrStatus("waiting");
    setCashReceived(cartGrandTotal);
    setSplitCashAmount(Math.round(cartGrandTotal / 2));
    setDebtDownPayment(0);
    setAllocateDebtPayment(false);
    setDebtAllocatedAmount(0);
    setIsPaymentModalOpen(true);
  };

  const handleOpenShiftNow = async () => {
    if (!Number.isFinite(openShiftCashInput) || openShiftCashInput < 0) {
      toast.error("Nominal modal awal laci tidak valid (minimal Rp0).");
      return;
    }
    try {
      const shift = await shiftService.bukaShift({ modal_awal: openShiftCashInput, catatan_buka: "Dibuka dari terminal POS" });
      setActiveShift(shift);
      setIsShiftModalOpen(false);
      toast.success("Shift kasir berhasil dibuka!");
    } catch (err: any) {
      toast.error(err?.message || "Gagal membuka shift kasir");
    }
  };

  const handleSaveQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustNama.trim()) {
      toast.error("Nama pelanggan wajib diisi");
      return;
    }
    setSubmittingCust(true);
    try {
      const created = await posService.createPelanggan({
        nama: newCustNama.trim(),
        telepon: newCustTelepon.trim() || undefined,
        alamat: newCustAlamat.trim() || undefined,
        batas_bon: Number(newCustBatasBon || 500000),
      });
      setCustomers((prev) => [...prev, created]);
      setSelectedCustomerId(created.id);
      setIsAddCustomerModalOpen(false);
      setNewCustNama("");
      setNewCustTelepon("");
      setNewCustAlamat("");
      setNewCustBatasBon(500000);
      toast.success(`Pelanggan "${created.nama}" berhasil didaftarkan & dipilih!`);
    } catch (err: any) {
      toast.error(err?.message || "Gagal menambahkan pelanggan");
    } finally {
      setSubmittingCust(false);
    }
  };

  const handleOpenPayDebt = () => {
    if (!selectedCustomer) return;
    setDebtPayAmount(Number(selectedCustomer.total_piutang || 0));
    setDebtPayMethod("tunai");
    setIsPayDebtModalOpen(true);
  };

  const handleSubmitPayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (debtPayAmount <= 0) {
      toast.error("Nominal pembayaran harus lebih dari 0");
      return;
    }
    setSubmittingDebtPay(true);
    try {
      const res = await posService.bayarPiutang({
        pelanggan_id: selectedCustomer.id,
        nominal_bayar: debtPayAmount,
        metode: debtPayMethod,
        shift_id: activeShift?.id || null,
        catatan: `Pelunasan kas bon via POS Kasir (${debtPayMethod})`,
      });
      const remainingDebt = Number(res?.sisa_piutang_pelanggan ?? Math.max(0, Number(selectedCustomer.total_piutang || 0) - debtPayAmount));
      setCompletedTransaction(
        buildDebtReceiptData({ customer: selectedCustomer, amount: debtPayAmount, method: debtPayMethod, remainingDebt, cashierName, toko, fallbackStoreName: storeName })
      );
      setIsPayDebtModalOpen(false);
      setIsReceiptModalOpen(true);
      toast.success(`Pembayaran bon ${selectedCustomer.nama} sebesar Rp${debtPayAmount.toLocaleString("id-ID")} berhasil dicatat! Sisa: Rp${remainingDebt.toLocaleString("id-ID")}`);
      fetchPosData();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mencatat pembayaran kas bon");
    } finally {
      setSubmittingDebtPay(false);
    }
  };

  const executeFinalizePayment = async () => {
    setProcessingCheckout(true);
    try {
      const apiMetode = paymentMethod === "cash" ? "tunai" : paymentMethod === "qris" ? "qris" : paymentMethod === "split" ? "split" : "bon";
      const bayarTunai = paymentMethod === "cash" ? Number(cashReceived) : paymentMethod === "split" ? Number(splitCashAmount) : paymentMethod === "debt" ? Number(debtDownPayment) : 0;
      const bayarQris = paymentMethod === "qris" ? Number(cartGrandTotal) : paymentMethod === "split" ? Math.max(0, Number(cartGrandTotal) - Number(splitCashAmount)) : 0;

      const createdTx = await posService.checkout({
        shift_id: activeShift?.id || null,
        pelanggan_id: selectedCustomerId !== "umum" ? selectedCustomerId : null,
        diskon: discountAmount,
        metode_bayar: apiMetode,
        uang_diterima: bayarTunai,
        bayar_tunai: bayarTunai,
        split_tunai: paymentMethod === "split" ? splitCashAmount : 0,
        split_qris: paymentMethod === "split" ? Math.max(0, cartGrandTotal - splitCashAmount) : 0,
        bayar_qris: bayarQris,
        uang_muka: paymentMethod === "debt" ? debtDownPayment : 0,
        alokasi_bayar_bon: allocateDebtPayment && debtAllocatedAmount > 0 ? debtAllocatedAmount : undefined,
        qris_ref: paymentMethod === "qris" || paymentMethod === "split" ? qrRefId : null,
        items: cart.map((c) => ({
          produk_id: c.product.id,
          satuan_id: (c.product.satuan_tambahan || c.product.produk_satuan || []).find((s: any) => s.nama_satuan === c.selectedUnit)?.id || null,
          nama_produk: c.product.nama,
          nama_satuan: c.selectedUnit,
          konversi_satuan: c.multiplier,
          jumlah: c.qty,
          harga_satuan: c.unitPrice,
          diskon_item: 0,
          metode_input: c.metodeInput,
        })),
      });

      const receipt = buildCheckoutReceiptData({
        createdTx, cart, cartTotalQty, cartSubtotal, discountAmount, cartGrandTotal, paymentMethod,
        cashReceived, splitCashAmount, debtDownPayment, allocateDebtPayment, debtAllocatedAmount,
        qrRefId, selectedCustomer, cashierName, toko, fallbackStoreName: storeName,
      });
      setCompletedTransaction(receipt);
      setIsPaymentModalOpen(false);
      setPaymentStep("form");
      setCart([]);
      setIsReceiptModalOpen(true);
      toast.success(`Transaksi ${receipt.id} berhasil disimpan!`);
      fetchPosData();
    } catch (err: any) {
      toast.error(err?.message || "Gagal memproses transaksi pembayaran");
    } finally {
      setProcessingCheckout(false);
    }
  };

  const generateAndShowDynamicQris = async (amount: number) => {
    setGeneratingQr(true);
    try {
      const data = await posService.generateDynamicQris(amount);
      setDynamicQrImage(data.qr_image);
      setDynamicQrMerchant(data.merchant_name || storeName);
      setDynamicQrCity(data.merchant_city || "");
      setQrRefId(data.ref_id);
      setQrRemainingSec(data.expires_in_seconds || 300);
      setQrStatus("waiting");
      setPaymentStep("awaiting_qr");
    } catch (err: any) {
      toast.error(err?.message || "Gagal membuat QRIS dinamis. Pastikan QRIS toko sudah aktif di Pengaturan.");
    } finally {
      setGeneratingQr(false);
    }
  };

  const handleConfirmPayment = () => {
    if (!Number.isFinite(cartGrandTotal) || cartGrandTotal < 0) {
      toast.error("Total transaksi tidak valid.");
      return;
    }
    if (paymentMethod === "cash") {
      if (!Number.isFinite(cashReceived) || cashReceived < cartGrandTotal) {
        toast.error("Uang tunai yang diterima kurang dari total pembayaran.");
        return;
      }
      if (allocateDebtPayment) {
        const maxBon = Number(selectedCustomer?.total_piutang || 0);
        if (!Number.isFinite(debtAllocatedAmount) || debtAllocatedAmount < 0 || debtAllocatedAmount > maxBon) {
          toast.error("Nominal potong kas bon tidak valid atau melebihi total tunggakan.");
          return;
        }
        if (cashReceived < cartGrandTotal + debtAllocatedAmount) {
          toast.error("Uang tunai yang diterima tidak mencukupi untuk belanja dan alokasi potong kas bon.");
          return;
        }
      }
      executeFinalizePayment();
      return;
    }
    if (paymentMethod === "debt") {
      if (selectedCustomerId === "umum") {
        toast.error("Metode pembayaran Utang (Kas Bon) wajib memilih Pelanggan Terdaftar.");
        return;
      }
      if (!Number.isFinite(debtDownPayment) || debtDownPayment < 0 || debtDownPayment > cartGrandTotal) {
        toast.error("Uang muka (DP) harus bernilai Rp0 hingga tidak melebihi total tagihan.");
        return;
      }
      executeFinalizePayment();
      return;
    }
    if (paymentMethod === "split" && (!Number.isFinite(splitCashAmount) || splitCashAmount <= 0 || splitCashAmount >= cartGrandTotal)) {
      toast.error("Nominal porsi tunai harus di antara Rp1 hingga kurang dari total tagihan.");
      return;
    }
    generateAndShowDynamicQris(paymentMethod === "split" ? Math.max(0, cartGrandTotal - splitCashAmount) : cartGrandTotal);
  };

  const barcodeShortcuts = useMemo(
    () => products.filter((p) => p.barcode).slice(0, 4).map((p) => ({ label: p.nama, code: p.barcode! })),
    [products]
  );

  const clearCart = () => {
    setCart([]);
    setIsClearCartModalOpen(false);
    toast.info("Keranjang belanja telah dikosongkan.");
  };

  return {
    cashierName, storeName, products, filteredProducts, categories, customers, activeShift,
    loadingCatalog, processingCheckout, cart, cartSubtotal, cartTotalQty, cartGrandTotal,
    mobileTab, setMobileTab, selectedCategory, setSelectedCategory, searchQuery, setSearchQuery,
    selectedCustomerId, setSelectedCustomerId, selectedCustomer, pendingOrders, barcodeShortcuts,
    isShiftModalOpen, setIsShiftModalOpen, openShiftCashInput, setOpenShiftCashInput,
    isBarcodeModalOpen, setIsBarcodeModalOpen, isAiModalOpen, setIsAiModalOpen,
    isPaymentModalOpen, setIsPaymentModalOpen, isReceiptModalOpen, setIsReceiptModalOpen,
    isClearCartModalOpen, setIsClearCartModalOpen, isHoldCartModalOpen, setIsHoldCartModalOpen,
    isPendingListModalOpen, setIsPendingListModalOpen, holdNoteInput, setHoldNoteInput,
    isAddCustomerModalOpen, setIsAddCustomerModalOpen, newCustNama, setNewCustNama,
    newCustTelepon, setNewCustTelepon, newCustAlamat, setNewCustAlamat, newCustBatasBon, setNewCustBatasBon,
    submittingCust, isPayDebtModalOpen, setIsPayDebtModalOpen, debtPayAmount, setDebtPayAmount,
    debtPayMethod, setDebtPayMethod, submittingDebtPay,
    paymentMethod, setPaymentMethod, cashReceived, setCashReceived, splitCashAmount, setSplitCashAmount,
    debtDownPayment, setDebtDownPayment, allocateDebtPayment, debtAllocatedAmount, setDebtAllocatedAmount,
    paymentStep, setPaymentStep, qrStatus, qrRemainingSec, qrRefId, dynamicQrImage,
    dynamicQrMerchant, dynamicQrCity, generatingQr, isQrZoomModalOpen, setIsQrZoomModalOpen,
    completedTransaction, fetchPosData, addToCart, updateCartQty, clearCart, handleBarcodeScan,
    handleOpenHoldModal, handleConfirmHoldCart, handleResumePendingOrder, handleDeletePendingOrder,
    handleToggleAllocateDebt, handleOpenPayment, handleConfirmPayment, executeFinalizePayment,
    generateAndShowDynamicQris, handleOpenShiftNow, handleSaveQuickCustomer, handleOpenPayDebt, handleSubmitPayDebt,
  };
}
