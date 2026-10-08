"use client";

import React, { useState } from "react";
import { useToast } from "@/context/ToastContext";

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
}: SupplierDebtsTableProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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

      {/* 1. MOBILE CARD VIEW (< md screens) */}
      <div className="block md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3.5 space-y-2.5 animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800"></div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-sm w-3/4"></div>
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-sm w-1/3"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="h-10 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl"></div>
                <div className="h-10 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl"></div>
              </div>
            </div>
          ))
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
                className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors cursor-pointer space-y-3"
              >
                {/* Top: Avatar, Name, Code & Phone */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor}`}
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

                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono shrink-0">
                    {s.rei_count} đơn nhập
                  </span>
                </div>

                {/* Grid 4 chỉ số tài chính trên Mobile */}
                <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/60">
                  <div>
                    <div className="text-[10px] text-zinc-400">Nợ đầu kỳ</div>
                    <div className={`text-xs font-mono ${getTableCellClass(s.no_dau_ky, "dau")}`}>
                      {formatTableCell(s.no_dau_ky, "dau")}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-zinc-400">Nợ tăng trong kỳ</div>
                    <div className={`text-xs font-mono ${getTableCellClass(s.no_tang_trong_ky, "tang")}`}>
                      {formatTableCell(s.no_tang_trong_ky, "tang")}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-zinc-400">Nợ giảm trong kỳ</div>
                    <div className={`text-xs font-mono ${getTableCellClass(s.no_giam_trong_ky, "giam")}`}>
                      {formatTableCell(s.no_giam_trong_ky, "giam")}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-zinc-400 font-semibold">Phải thu/trả cuối kỳ</div>
                    <div className={`text-xs font-mono ${getTableCellClass(s.phai_thu_tra_cuoi_ky, "cuoi")}`}>
                      {formatTableCell(s.phai_thu_tra_cuoi_ky, "cuoi")}
                    </div>
                  </div>
                </div>

                {/* Footer card: Trạng thái & nút Xem */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-zinc-400">
                    {s.pending_count > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        Còn {s.pending_count} đơn chưa thanh toán
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Đã tất toán đủ đơn
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    Xem sổ chi tiết
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
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
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-3.5 text-center">
                    <div className="w-4 h-4 bg-zinc-200 dark:bg-zinc-800 rounded mx-auto"></div>
                  </td>
                  <td className="py-3.5 px-3.5">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20"></div>
                  </td>
                  <td className="py-3.5 px-3.5">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-36"></div>
                  </td>
                  <td className="py-3.5 px-3.5">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24"></div>
                  </td>
                  <td className="py-3.5 px-3.5 text-right">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto"></div>
                  </td>
                  <td className="py-3.5 px-3.5 text-right">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto"></div>
                  </td>
                  <td className="py-3.5 px-3.5 text-right">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto"></div>
                  </td>
                  <td className="py-3.5 px-3.5 text-right">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24 ml-auto"></div>
                  </td>
                  <td className="py-3.5 px-3.5 text-center">
                    <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-16 mx-auto"></div>
                  </td>
                </tr>
              ))
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
      {totalPages > 1 && (
        <div className="p-3 sm:p-4 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <div>
            Trang {page} / {totalPages} ({totalCount} nhà cung cấp)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
