"use client";

import React, { useState } from "react";
import { useToast } from "@/context/ToastContext";
import { DebtTableLoading } from "./DebtTableLoading";

export interface DebtorCustomer {
  customer_id?: number | null;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  dau_ky: number;
  tang_trong_ky: number;
  giam_trong_ky: number;
  cuoi_ky: number;
  total_debt: number;
  total_spent?: number;
  debt_orders_count: number;
  latest_order_date?: string;
  orders?: Array<{
    order_sn: string;
    total_amount: number;
    total_received: number;
    unpaid_amount: number;
    financial_status: string;
    order_status: string;
    created_at: string;
    paid_at?: string | null;
    shop_username?: string;
  }>;
}

interface CustomerDebtsTableProps {
  customers: DebtorCustomer[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (p: number) => void;
  onViewCustomerDetail: (customer: DebtorCustomer) => void;
  filterType: string;
  onFilterTypeChange: (f: string) => void;
}

export function CustomerDebtsTable({
  customers,
  loading,
  searchQuery,
  onSearchChange,
  page,
  totalPages,
  totalCount,
  onPageChange,
  onViewCustomerDetail,
  filterType,
  onFilterTypeChange,
}: CustomerDebtsTableProps) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const formatVND = (num?: number) => {
    return (num || 0).toLocaleString("vi-VN") + "\u00A0₫";
  };

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    toast.success(`Đã sao chép SĐT: ${phone}`);
  };

  const handleCopyStatement = (c: DebtorCustomer, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Kính gửi Anh/Chị ${c.name},
Bao Bì Yến Sen trân trọng gửi bảng đối soát số dư công nợ của Quý khách:
- Nợ đầu kỳ: ${formatVND(c.dau_ky)}
- Nợ phát sinh tăng trong kỳ: ${formatVND(c.tang_trong_ky)}
- Đã thanh toán giảm trong kỳ: ${formatVND(c.giam_trong_ky)}
- TỔNG CÔNG NỢ PHẢI THU CUỐI KỲ: ${formatVND(c.cuoi_ky)}

Quý khách vui lòng kiểm tra và sắp xếp kế hoạch thanh toán đối soát sớm.
Xin chân thành cảm ơn Quý khách!`;

    navigator.clipboard.writeText(text);
    setCopiedKey(c.phone || c.name);
    toast.success(`Đã sao chép bảng đối soát công nợ của ${c.name} (sẵn sàng dán vào Zalo)`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xs overflow-hidden">
      {/* Header: Filters & Search bar */}
      <div className="p-3 sm:p-4 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Dropdown lọc trạng thái nợ */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={filterType}
              onChange={(e) => onFilterTypeChange(e.target.value)}
              className="w-full sm:w-auto text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              <option value="cuoi_ky">Nợ cuối kỳ (Mặc định)</option>
              <option value="phat_sinh">Có phát sinh nợ trong kỳ</option>
              <option value="all">Tất cả khách nợ</option>
            </select>
          </div>

          <span className="text-[11px] sm:text-xs px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono font-medium shrink-0">
            {totalCount.toLocaleString("vi-VN")} khách
          </span>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên khách, SĐT..."
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
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
      {loading && <DebtTableLoading type="customers" mode="banner" />}

      {/* 1. MOBILE CARD VIEW (< md screens) */}
      <div className="block md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
        {loading ? (
          <DebtTableLoading type="customers" mode="mobile" rows={4} />
        ) : customers.length === 0 ? (
          <div className="py-10 text-center text-zinc-500">
            <p className="font-semibold text-xs">Không tìm thấy khách hàng nào</p>
          </div>
        ) : (
          customers.map((c) => {
            const initial = (c.name || "K").trim().slice(0, 1).toUpperCase();
            const isCopied = copiedKey === (c.phone || c.name);

            return (
              <div
                key={c.phone || c.name}
                onClick={() => onViewCustomerDetail(c)}
                className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors active:bg-zinc-100 cursor-pointer space-y-2"
              >
                {/* Header: Name, Phone & Final Balance */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {c.name}
                      </div>
                      {c.phone && (
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono mt-0.5">
                          <span>{c.phone}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(c.phone, e)}
                            className="text-zinc-400 hover:text-zinc-600 p-0.5"
                            title="Sao chép SĐT"
                          >
                            📋
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cuối kỳ (Phải thu) */}
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">Phải thu</div>
                    <div className="font-mono font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                      {formatVND(c.cuoi_ky)}
                    </div>
                  </div>
                </div>

                {/* Sub row: Brief breakdown + Action buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px]">
                  {/* Compact flow indicator */}
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                    {c.tang_trong_ky > 0 && (
                      <span className="text-blue-600 dark:text-blue-400">
                        +{formatVND(c.tang_trong_ky)}
                      </span>
                    )}
                    {c.tang_trong_ky > 0 && c.giam_trong_ky > 0 && <span>•</span>}
                    {c.giam_trong_ky > 0 && (
                      <span className="text-rose-600 dark:text-rose-400">
                        -{formatVND(c.giam_trong_ky)}
                      </span>
                    )}
                    {c.tang_trong_ky === 0 && c.giam_trong_ky === 0 && (
                      <span>Đầu kỳ: {formatVND(c.dau_ky)}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleCopyStatement(c, e)}
                      className={`px-2 py-0.5 rounded-lg font-medium text-[11px] border transition cursor-pointer ${
                        isCopied
                          ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-700 dark:text-emerald-300"
                          : "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
                      }`}
                      title="Gửi báo cáo nợ qua Zalo"
                    >
                      {isCopied ? "✓ Đã chép" : "Zalo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewCustomerDetail(c)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. DESKTOP TABLE VIEW (>= md screens) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full table-fixed text-left text-xs border-collapse min-w-[960px]">
          <thead>
            <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/40 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <th className="py-3 px-3 w-[22%]">Tên đối tượng</th>
              <th className="py-3 px-3 w-[13%]">Số điện thoại</th>
              <th className="py-3 px-3 w-[13%] text-right whitespace-nowrap">Nợ đầu kỳ</th>
              <th className="py-3 px-3 w-[13%] text-right whitespace-nowrap">Nợ tăng trong kỳ</th>
              <th className="py-3 px-3 w-[13%] text-right whitespace-nowrap">Nợ giảm trong kỳ</th>
              <th className="py-3 px-3 w-[14%] text-right whitespace-nowrap">Phải thu/trả cuối kỳ</th>
              <th className="py-3 px-3 w-[12%] text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {loading ? (
              <DebtTableLoading type="customers" mode="rows" rows={5} colSpan={7} />
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-zinc-500">
                  <p className="font-semibold text-xs">Không tìm thấy khách hàng nào</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Không có công nợ phát sinh theo bộ lọc đã chọn</p>
                </td>
              </tr>
            ) : (
              customers.map((c) => {
                const initial = (c.name || "K").trim().slice(0, 1).toUpperCase();
                const isCopied = copiedKey === (c.phone || c.name);

                return (
                  <tr
                    key={c.phone || c.name}
                    onClick={() => onViewCustomerDetail(c)}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Tên đối tượng */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors truncate">
                            {c.name}
                          </div>
                          {c.address ? (
                            <div className="text-[10px] text-zinc-400 truncate max-w-[200px]">
                              {c.address}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Số điện thoại */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {c.phone ? (
                        <div className="flex items-center gap-1.5 font-mono text-zinc-600 dark:text-zinc-300">
                          <span>{c.phone}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(c.phone, e)}
                            className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                            title="Sao chép SĐT"
                          >
                            📋
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">Chưa có SĐT</span>
                      )}
                    </td>

                    {/* Nợ đầu kỳ */}
                    <td className="py-3 px-3 text-right font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {formatVND(c.dau_ky)}
                    </td>

                    {/* Nợ tăng trong kỳ */}
                    <td className="py-3 px-3 text-right font-mono font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {c.tang_trong_ky > 0 ? formatVND(c.tang_trong_ky) : "0\u00A0₫"}
                    </td>

                    {/* Nợ giảm trong kỳ */}
                    <td className="py-3 px-3 text-right font-mono font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      {c.giam_trong_ky > 0 ? `-${formatVND(c.giam_trong_ky)}` : "0\u00A0₫"}
                    </td>

                    {/* Phải thu/trả cuối kỳ */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 inline-block whitespace-nowrap">
                        {formatVND(c.cuoi_ky)}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onViewCustomerDetail(c)}
                          className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-medium text-[11px] transition-colors shadow-2xs"
                          title="Xem chi tiết đơn nợ"
                        >
                          Chi tiết
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleCopyStatement(c, e)}
                          className={`px-2 py-1 rounded-lg font-medium text-[11px] transition-colors border shadow-2xs ${
                            isCopied
                              ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                              : "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
                          }`}
                          title="Sao chép bảng sao kê đối soát gửi Zalo"
                        >
                          {isCopied ? "✓ Đã chép" : "Zalo"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-3 sm:p-4 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="text-zinc-500 text-[11px] sm:text-xs">
            Trang <strong className="text-zinc-800 dark:text-zinc-200">{page}</strong> / {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-xs transition-colors"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-xs transition-colors"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
