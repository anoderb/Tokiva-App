"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Inbox,
  Filter,
} from "lucide-react";
import { Button } from "./button";

export interface ColumnDef<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T, index: number) => string | number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  searchFilter?: (item: T, query: string) => boolean;
  filterSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  itemsPerPageOptions?: number[];
  defaultItemsPerPage?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ElementType;
  className?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  searchable = false,
  searchPlaceholder = "Cari data...",
  onSearchChange,
  searchFilter,
  filterSlot,
  actionSlot,
  itemsPerPageOptions = [5, 10, 20, 50],
  defaultItemsPerPage = 10,
  emptyTitle = "Tidak ada data yang ditemukan",
  emptyDescription = "Coba ubah kata kunci pencarian atau sesuaikan filter Anda.",
  emptyIcon: EmptyIcon = Inbox,
  className = "",
  onRowClick,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const handleSearchInput = (val: string) => {
    setInternalSearch(val);
    setCurrentPage(1);
    if (onSearchChange) onSearchChange(val);
  };

  // Filtered Data
  const filteredData = useMemo(() => {
    if (!searchable || !searchFilter || !internalSearch.trim()) {
      return data;
    }
    const q = internalSearch.toLowerCase().trim();
    return data.filter((item) => searchFilter(item, q));
  }, [data, searchable, searchFilter, internalSearch]);

  // Pagination Calculations
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (validCurrentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, validCurrentPage, itemsPerPage]);

  const startIndex = totalItems === 0 ? 0 : (validCurrentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(validCurrentPage * itemsPerPage, totalItems);

  return (
    <div className={`flex flex-col gap-3 font-body ${className}`}>
      {/* Search, Filters, and Actions Bar */}
      {(searchable || filterSlot || actionSlot) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-3 rounded-lg border-2 border-border shadow-sm">
          <div className="flex flex-1 items-center gap-2 flex-wrap">
            {searchable && (
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-muted-fg absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={internalSearch}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-3 py-1.5 bg-bg border-2 border-border rounded text-xs outline-none focus:border-accent text-fg"
                />
              </div>
            )}
            {filterSlot}
          </div>

          {actionSlot && <div className="flex items-center gap-2">{actionSlot}</div>}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-card border-2 border-border rounded-lg shadow-pop overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/70 border-b-2 border-border text-fg font-heading uppercase text-[11px] tracking-wider select-none">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`py-3 px-4 font-extrabold ${col.headerClassName || col.className || ""}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-muted-fg">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                        <EmptyIcon className="w-6 h-6 text-muted-fg" />
                      </div>
                      <div className="font-heading font-bold text-sm text-fg">{emptyTitle}</div>
                      <p className="text-xs max-w-xs">{emptyDescription}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIdx) => (
                  <tr
                    key={keyExtractor(row, rowIdx)}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`hover:bg-muted/40 transition-colors ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={colIdx}
                        className={`py-3 px-4 text-fg ${col.className || ""}`}
                      >
                        {col.cell
                          ? col.cell(row, rowIdx)
                          : col.accessorKey
                          ? String(row[col.accessorKey] ?? "-")
                          : null}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-card border-t-2 border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-fg select-none">
          {/* Row Counter */}
          <div className="flex items-center gap-3">
            <span>
              Menampilkan <strong className="text-fg font-bold">{startIndex}</strong> -{" "}
              <strong className="text-fg font-bold">{endIndex}</strong> dari{" "}
              <strong className="text-fg font-bold">{totalItems}</strong> data
            </span>

            {/* Per-page selector */}
            <div className="flex items-center gap-1.5">
              <span>Baris:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-bg border border-border rounded px-1.5 py-0.5 text-xs text-fg font-medium outline-none"
              >
                {itemsPerPageOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Page Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              className="px-2.5 py-1 rounded border-2 border-border bg-card text-fg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            <span className="px-2.5 py-1 text-xs font-bold text-fg bg-muted rounded border border-border">
              {validCurrentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="px-2.5 py-1 rounded border-2 border-border bg-card text-fg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

