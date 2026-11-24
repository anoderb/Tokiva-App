"use client";

import type React from "react";
import { ProductImage } from "@/components/shared/product-image";
import { formatRupiah } from "@/lib/format";
import type { Kategori, ProdukMaster } from "@/types/api";
import { Check, ChevronDown, Loader2, Plus, Search } from "lucide-react";

/** Input nama produk dilengkapi saran otomatis Katalog Master Global */
export function ProdukNamaCombobox({
  nama,
  dropdownRef,
  open,
  loadingSuggestions,
  suggestions,
  onFocusOpen,
  onChangeNama,
  onSelectSuggestion,
  onCloseDropdown,
}: {
  nama: string;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  loadingSuggestions: boolean;
  suggestions: ProdukMaster[];
  onFocusOpen: () => void;
  onChangeNama: (val: string) => void;
  onSelectSuggestion: (m: ProdukMaster) => void;
  onCloseDropdown: () => void;
}) {
  return (
    <div className="sm:col-span-2 relative" ref={dropdownRef}>
      <label className="font-bold block mb-1 flex items-center justify-between">
        <span>Nama Produk *</span>
        <span className="text-[10px] text-muted-fg font-normal">Ketik untuk mencari di Katalog Master</span>
      </label>
      <div className="relative">
        <input
          required
          value={nama}
          onFocus={onFocusOpen}
          onChange={(e) => onChangeNama(e.target.value)}
          placeholder="Contoh: Indomie Goreng 85g"
          className="w-full px-3 py-2 border-2 border-border rounded bg-card font-semibold pr-8"
        />
        <Search className="w-4 h-4 text-muted-fg absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {open && nama.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border-2 border-fg rounded-lg shadow-pop max-h-64 overflow-y-auto">
          {loadingSuggestions ? (
            <div className="p-3 text-center text-xs text-muted-fg flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              <span>Mencari di Katalog Master...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <div className="px-3 py-1 text-[10px] font-bold text-muted-fg uppercase bg-muted/60 border-b border-border">
                Saran Produk dari Katalog Master Global
              </div>
              <div className="divide-y divide-border">
                {suggestions.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectSuggestion(m)}
                    className="w-full text-left p-2.5 hover:bg-muted/70 flex items-center justify-between gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProductImage src={m.foto_url} alt={m.nama} className="w-9 h-9 rounded border border-border shrink-0" />
                      <div className="min-w-0 truncate">
                        <span className="font-bold text-xs truncate block">{m.nama}</span>
                        <span className="text-[10px] text-muted-fg font-mono block">{m.barcode || "Tanpa Barcode"} · {m.kategori?.nama || "Katalog Master"}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-accent text-xs block">{formatRupiah(m.harga_saran || 0)}</span>
                      <span className="text-[9px] bg-accent/15 text-accent px-1.5 py-0.5 rounded font-bold">Pilih &amp; Auto-Isi</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="p-2.5 text-[11px] text-muted-fg text-center">Tidak ada produk yang cocok di Katalog Master.</div>
          )}

          <button
            type="button"
            onClick={onCloseDropdown}
            className="w-full text-left px-3 py-2 text-xs font-bold text-accent hover:bg-accent/10 border-t border-border flex items-center gap-1.5 cursor-pointer bg-muted/20"
          >
            <Plus className="w-3.5 h-3.5 text-accent" />
            <span>Gunakan Nama Produk Baru: &quot;{nama}&quot;</span>
          </button>
        </div>
      )}
    </div>
  );
}

/** Dropdown Kategori searchable + quick-add kategori baru langsung */
export function KategoriDropdown({
  kategoriId,
  categories,
  dropdownRef,
  open,
  searchQuery,
  isAdding,
  onToggle,
  onChangeSearch,
  onSelectCategory,
  onAddNewCategory,
}: {
  kategoriId: string;
  categories: Kategori[];
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  searchQuery: string;
  isAdding: boolean;
  onToggle: () => void;
  onChangeSearch: (q: string) => void;
  onSelectCategory: (id: string) => void;
  onAddNewCategory: () => void;
}) {
  const filtered = categories.filter((c) => c.nama.toLowerCase().includes(searchQuery.toLowerCase()));
  const exactExists = categories.some((c) => c.nama.toLowerCase() === searchQuery.trim().toLowerCase());

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="font-bold block mb-1">Kategori</label>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 border-2 border-border rounded bg-card flex items-center justify-between text-left font-semibold text-xs cursor-pointer hover:border-fg transition-colors"
      >
        <span className="truncate">{categories.find((c) => c.id === kategoriId)?.nama || "-- Pilih Kategori --"}</span>
        <ChevronDown className="w-4 h-4 text-muted-fg shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border-2 border-fg rounded-lg shadow-pop max-h-64 overflow-y-auto">
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative">
              <input autoFocus value={searchQuery} onChange={(e) => onChangeSearch(e.target.value)} placeholder="Cari atau ketik kategori baru..." className="w-full pl-7 pr-2.5 py-1.5 text-xs border border-border rounded bg-card outline-none focus:border-accent" />
              <Search className="w-3.5 h-3.5 text-muted-fg absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="divide-y divide-border/60 max-h-40 overflow-y-auto">
            {filtered.map((c) => {
              const isSelected = kategoriId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCategory(c.id)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${isSelected ? "bg-accent/10 font-bold text-accent" : "hover:bg-muted"}`}
                >
                  <span>{c.nama}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                </button>
              );
            })}
            {filtered.length === 0 && <div className="p-2.5 text-[11px] text-muted-fg text-center">Kategori &quot;{searchQuery}&quot; belum terdaftar.</div>}
          </div>
          {searchQuery.trim() && !exactExists && (
            <button
              type="button"
              disabled={isAdding}
              onClick={onAddNewCategory}
              className="w-full text-left px-3 py-2 text-xs font-bold text-accent hover:bg-accent/15 border-t border-border flex items-center gap-1.5 cursor-pointer bg-muted/40"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>+ Tambahkan Kategori Baru: &quot;{searchQuery.trim()}&quot;</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Dropdown Satuan Dasar eceran searchable + input manual cepat */
export function SatuanDasarDropdown({
  selectedUnit,
  options,
  dropdownRef,
  open,
  searchQuery,
  onToggle,
  onChangeSearch,
  onSelectUnit,
  onAddUnit,
}: {
  selectedUnit: string;
  options: string[];
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  searchQuery: string;
  onToggle: () => void;
  onChangeSearch: (q: string) => void;
  onSelectUnit: (unit: string) => void;
  onAddUnit: () => void;
}) {
  const filtered = options.filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
  const exactExists = options.some((s) => s.toLowerCase() === searchQuery.trim().toLowerCase());

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="font-bold block mb-1">Satuan Dasar (Eceran) *</label>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 border-2 border-border rounded bg-card flex items-center justify-between text-left font-semibold text-xs cursor-pointer hover:border-fg transition-colors"
      >
        <span className="truncate">{selectedUnit || "-- Pilih Satuan --"}</span>
        <ChevronDown className="w-4 h-4 text-muted-fg shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border-2 border-fg rounded-lg shadow-pop max-h-64 overflow-y-auto">
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => onChangeSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filtered.length > 0) onSelectUnit(filtered[0]);
                    else if (searchQuery.trim()) onAddUnit();
                  }
                }}
                placeholder="Cari atau ketik satuan baru..."
                className="w-full pl-7 pr-2.5 py-1.5 text-xs border border-border rounded bg-card outline-none focus:border-accent"
              />
              <Search className="w-3.5 h-3.5 text-muted-fg absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="divide-y divide-border/60 max-h-40 overflow-y-auto">
            {filtered.map((unit) => {
              const isSelected = selectedUnit.toLowerCase() === unit.toLowerCase();
              return (
                <button
                  key={unit}
                  type="button"
                  onClick={() => onSelectUnit(unit)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${isSelected ? "bg-accent/10 font-bold text-accent" : "hover:bg-muted"}`}
                >
                  <span>{unit}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                </button>
              );
            })}
            {filtered.length === 0 && <div className="p-2.5 text-[11px] text-muted-fg text-center">Satuan &quot;{searchQuery}&quot; belum terdaftar.</div>}
          </div>
          {searchQuery.trim() && !exactExists && (
            <button
              type="button"
              onClick={onAddUnit}
              className="w-full text-left px-3 py-2 text-xs font-bold text-accent hover:bg-accent/15 border-t border-border flex items-center gap-1.5 cursor-pointer bg-muted/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambahkan Satuan Baru: &quot;{searchQuery.trim().toLowerCase()}&quot;</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
