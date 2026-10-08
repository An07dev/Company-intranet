"use client";

import React, { useState, useMemo } from "react";
import { useToast } from "@/context/ToastContext";
import { DebtTableLoading } from "./DebtTableLoading";

export interface SupplierDebtItem {
  id: number;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  status: string;
  no_dau_ky: number;
  no_tang_trong_ky: number;
  no_giam_trong_ky: number;
  phai_thu_tra_cuoi_ky: number;
  rei_count: number;
  pending_count: number;
  latest_order_date?: string | null;
}

interface SupplierDebtsTableProps {
  suppliers: SupplierDebtItem[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (p: number) => void;
  onViewSupplierDetail: (supplier: SupplierDebtItem) => void;
  limit?: number;
  onLimitChange?: (newLimit: number) => void;
}

// Hàm sinh chữ cái đại diện Avatar (ví dụ: Túi vải -> TÚ, GNEST -> GN)
function getSupplierInitials(name: string): string {
  if (!name) return "NCC";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0].slice(0, 1) + words[1].slice(0, 1)).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Bảng màu avatar theo hash chuỗi
const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash];
}

export function SupplierDebtsTable({
  suppliers,
  loading,
  searchQuery,
  onSearchChange,
  page,
  totalPages,
  totalCount,
  onPageChange,
  onViewSupplierDetail,
  limit = 10,
  onLimitChange,
}: SupplierDebtsTableProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Tính toán danh sách số trang hiển thị
  const paginationItems = useMemo(() => {
    const items: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      if (page <= 4) {
        items.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (page >= totalPages - 3) {
        items.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        items.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return items;
  }, [totalPages, page]);

  const startIndex = totalCount > 0 ? (page - 1) * limit + 1 : 0;
  const endIndex = Math.min(page * limit, totalCount);

  // Định dạng số tiền hiển thị chuẩn theo Sapo Live
  const formatTableCell = (val: number, type: "dau" | "tang" | "giam" | "cuoi") => {
    if (!val || val === 0) return "0\u00A0₫";
    if (type === "tang") {
      // Cột Nợ tăng trong kỳ trên bảng Sapo live luôn hiển thị số âm có dấu trừ màu đỏ (-473,994,964đ)
      return `-${Math.abs(val).toLocaleString("vi-VN")}\u00A0₫`;
    }
    return val.toLocaleString("vi-VN") + "\u00A0₫";
  };

  const getTableCellClass = (val: number, type: "dau" | "tang" | "giam" | "cuoi") => {
    if (!val || val === 0) return "text-zinc-400 dark:text-zinc-500 font-normal";
    if (type === "tang") {
      return "text-rose-600 dark:text-rose-400 font-medium";
    }
    if (type === "giam") {
      return "text-emerald-600 dark:text-emerald-400 font-medium";
    }
    if (val < 0) {
      return type === "cuoi"
        ? "text-rose-600 dark:text-rose-400 font-bold"
        : "text-rose-600 dark:text-rose-400 font-medium";
    }
    return "text-emerald-600 dark:text-emerald-400 font-medium";
  };

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    toast.success(`Đã sao chép SĐT: ${phone}`);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === suppliers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(suppliers.map((s) => s.id));
    }
  };

  const handleToggleSelectRow = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xs overflow-hidden">
      {/* Header: Filters & Search bar */}
      <div className="p-3 sm:p-4 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Danh sách Nhà cung cấp
          </span>
          <span className="text-[11px] sm:text-xs px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono font-medium shrink-0">
            {totalCount.toLocaleString("vi-VN")} NCC
          </span>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên NCC, mã NCC, SĐT..."
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <svg
            className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Loading banner when fetching / filtering */}
      {loading && <DebtTableLoading type="suppliers" mode="banner" />}

      {/* 1. MOBILE CARD VIEW (< md screens) */}
      <div className="block md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
        {loading ? (
          <DebtTableLoading type="suppliers" mode="mobile" rows={4} />
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs">
            Không tìm thấy nhà cung cấp nào phù hợp.
          </div>
        ) : (
          suppliers.map((s) => {
            const initials = getSupplierInitials(s.name);
            const avatarColor = getAvatarColor(s.name);

            return (
              <div
                key={s.id}
                onClick={() => onViewSupplierDetail(s)}
                className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors cursor-pointer space-y-2"
              >
                {/* Top: Avatar, Name, Code, Phone & Final Balance */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor}`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {s.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                          {s.code}
                        </span>
                        {s.phone && (
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(s.phone!, e)}
                            className="inline-flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                            title="Sao chép SĐT"
                          >
                            <span>{s.phone}</span>
                            <svg className="w-2.5 h-2.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cuối kỳ: Phải trả NCC */}
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">Phải trả</div>
                    <div className={`text-xs sm:text-sm font-mono ${getTableCellClass(s.phai_thu_tra_cuoi_ky, "cuoi")}`}>
                      {formatTableCell(s.phai_thu_tra_cuoi_ky, "cuoi")}
                    </div>
                  </div>
                </div>

                {/* Bottom line: Brief financial flow + Status & Chevron */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px]">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-zinc-500 truncate">
                    {s.no_tang_trong_ky > 0 && (
                      <span className="text-rose-600 dark:text-rose-400">
                        +{formatTableCell(s.no_tang_trong_ky, "tang")}
                      </span>
                    )}
                    {s.no_tang_trong_ky > 0 && s.no_giam_trong_ky > 0 && <span>•</span>}
                    {s.no_giam_trong_ky > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        -{formatTableCell(s.no_giam_trong_ky, "giam")}
                      </span>
                    )}
                    {s.no_tang_trong_ky === 0 && s.no_giam_trong_ky === 0 && (
                      <span>Đầu kỳ: {formatTableCell(s.no_dau_ky, "dau")}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {s.pending_count > 0 ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-medium">
                        Còn {s.pending_count} đơn
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Đã tất toán
                      </span>
                    )}
                    <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. DESKTOP TABLE VIEW (>= md screens) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full table-fixed text-left border-collapse min-w-[1020px]">
          <thead>
            <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/40 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <th className="py-3 px-3 w-[4%] text-center">
                <input
                  type="checkbox"
                  checked={suppliers.length > 0 && selectedIds.length === suppliers.length}
                  onChange={handleToggleSelectAll}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </th>
              <th className="py-3 px-3 w-[11%]">Mã nhà cung cấp</th>
              <th className="py-3 px-3 w-[21%]">Tên nhà cung cấp</th>
              <th className="py-3 px-3 w-[11%]">Số điện thoại</th>
              <th className="py-3 px-3 text-right w-[11%] whitespace-nowrap">Nợ đầu kỳ</th>
              <th className="py-3 px-3 text-right w-[11%] whitespace-nowrap">Nợ tăng trong kỳ</th>
              <th className="py-3 px-3 text-right w-[11%] whitespace-nowrap">Nợ giảm trong kỳ</th>
              <th className="py-3 px-3 text-right w-[13%] whitespace-nowrap">
                <span className="inline-flex items-center gap-1 justify-end">
                  <span>Phải thu/trả cuối kỳ</span>
                  <span className="text-[10px] text-indigo-500 font-bold">▲</span>
                </span>
              </th>
              <th className="py-3 px-3 text-center w-[7%]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
            {loading ? (
              <DebtTableLoading type="suppliers" mode="rows" rows={6} colSpan={9} />
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                  Không tìm thấy nhà cung cấp nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => {
                const initials = getSupplierInitials(s.name);
                const avatarColor = getAvatarColor(s.name);
                const isSelected = selectedIds.includes(s.id);

                return (
                  <tr
                    key={s.id}
                    onClick={() => onViewSupplierDetail(s)}
                    className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer ${
                      isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                    }`}
                  >
                    <td className="py-3.5 px-3.5 text-center" onClick={(e) => handleToggleSelectRow(s.id, e)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    {/* Mã NCC */}
                    <td className="py-3.5 px-3.5 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                      {s.code}
                    </td>

                    {/* Tên NCC + Avatar */}
                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor}`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {s.name}
                          </div>
                          {s.pending_count > 0 ? (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400">
                              {s.pending_count} đơn chưa thanh toán / {s.rei_count} đơn
                            </div>
                          ) : (
                            <div className="text-[10px] text-zinc-400">
                              {s.rei_count} đơn nhập kho
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Số điện thoại */}
                    <td className="py-3.5 px-3.5 text-zinc-600 dark:text-zinc-400 font-mono">
                      {s.phone ? (
                        <button
                          type="button"
                          onClick={(e) => handleCopyPhone(s.phone!, e)}
                          className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          <span>{s.phone}</span>
                          <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Nợ đầu kỳ */}
                    <td className={`py-3.5 px-3 text-right font-mono whitespace-nowrap ${getTableCellClass(s.no_dau_ky, "dau")}`}>
                      {formatTableCell(s.no_dau_ky, "dau")}
                    </td>

                    {/* Nợ tăng trong kỳ */}
                    <td className={`py-3.5 px-3 text-right font-mono whitespace-nowrap ${getTableCellClass(s.no_tang_trong_ky, "tang")}`}>
                      {formatTableCell(s.no_tang_trong_ky, "tang")}
                    </td>

                    {/* Nợ giảm trong kỳ */}
                    <td className={`py-3.5 px-3 text-right font-mono whitespace-nowrap ${getTableCellClass(s.no_giam_trong_ky, "giam")}`}>
                      {formatTableCell(s.no_giam_trong_ky, "giam")}
                    </td>

                    {/* Phải thu/trả cuối kỳ */}
                    <td className={`py-3.5 px-3 text-right font-mono whitespace-nowrap ${getTableCellClass(s.phai_thu_tra_cuoi_ky, "cuoi")}`}>
                      {formatTableCell(s.phai_thu_tra_cuoi_ky, "cuoi")}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewSupplierDetail(s);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-zinc-800 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 text-zinc-700 dark:text-zinc-300 transition-colors"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 sm:p-4 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Left: Thông tin số lượng & Chọn số dòng/trang */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-4 text-zinc-500 dark:text-zinc-400">
          <div className="font-mono text-[11px] sm:text-xs">
            {totalCount > 0 ? (
              <>
                Hiển thị{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">{startIndex}</strong> -{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">{endIndex}</strong> /{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">{totalCount.toLocaleString("vi-VN")}</strong> nhà cung cấp
              </>
            ) : (
              <span>0 nhà cung cấp</span>
            )}
          </div>

          {onLimitChange && (
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
              <span className="text-zinc-400 hidden xs:inline">Hiển thị:</span>
              <select
                value={limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-mono text-[11px] sm:text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
                <option value={100}>100 / trang</option>
              </select>
            </div>
          )}
        </div>

        {/* Right: Điều hướng phân trang */}
        {totalCount > 0 && (
          <div>
            {/* Desktop Pagination (hidden sm:flex) */}
            <div className="hidden sm:flex items-center gap-1">
              {/* Về trang đầu */}
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(1)}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-2xs"
                title="Về trang đầu"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              {/* Trang trước */}
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-2xs"
                title="Trang trước"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Dãy số trang */}
              {paginationItems.map((item, idx) => {
                if (item === "...") {
                  return (
                    <span
                      key={`dots-${idx}`}
                      className="px-2 py-1 text-zinc-400 font-mono select-none"
                    >
                      …
                    </span>
                  );
                }

                const pageNum = item as number;
                const isActive = pageNum === page;

                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => onPageChange(pageNum)}
                    className={`min-w-8 h-8 px-2.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-2xs shadow-indigo-600/30 font-bold"
                        : "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Trang sau */}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-2xs"
                title="Trang sau"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Đến trang cuối */}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(totalPages)}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-2xs"
                title="Trang cuối"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Mobile Pagination (sm:hidden) */}
            <div className="sm:hidden flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-medium text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
              >
                ‹ Trước
              </button>
              <span className="px-2 py-1 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-medium text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
              >
                Sau ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
