"use client";

import React, { useState } from "react";
import { useToast } from "@/context/ToastContext";

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
    return (num || 0).toLocaleString("vi-VN") + " ₫";
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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-xs overflow-hidden">
      {/* Table Header: Filters & Search bar */}
      <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Dropdown lọc trạng thái nợ chuẩn Sapo */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => onFilterTypeChange(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              <option value="cuoi_ky">Nợ cuối kỳ (Mặc định Sapo)</option>
              <option value="phat_sinh">Có phát sinh nợ trong kỳ</option>
              <option value="all">Tất cả khách nợ</option>
            </select>
          </div>

          <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono font-medium">
            {totalCount.toLocaleString("vi-VN")} khách hàng
          </span>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm theo tên đối tượng, SĐT..."
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
          <svg
            className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400">
              <th className="py-3 px-4 font-semibold">Tên đối tượng</th>
              <th className="py-3 px-4 font-semibold">Số điện thoại</th>
              <th className="py-3 px-4 font-semibold text-right">Nợ đầu kỳ</th>
              <th className="py-3 px-4 font-semibold text-right">Nợ tăng trong kỳ</th>
              <th className="py-3 px-4 font-semibold text-right">Nợ giảm trong kỳ</th>
              <th className="py-3 px-4 font-semibold text-right">Phải thu/trả cuối kỳ</th>
              <th className="py-3 px-4 font-semibold text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-36 mb-1"></div></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24"></div></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto"></div></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto"></div></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto"></div></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24 ml-auto"></div></td>
                  <td className="py-3.5 px-4 text-center"><div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-16 mx-auto"></div></td>
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="font-semibold text-sm">Không tìm thấy khách hàng nào</p>
                  <p className="text-xs text-zinc-400 mt-1">Không có công nợ phát sinh theo bộ lọc đã chọn</p>
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
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                            {c.name}
                          </div>
                          {c.address ? (
                            <div className="text-[10px] text-zinc-400 truncate max-w-xs mt-0.5">
                              {c.address}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Số điện thoại */}
                    <td className="py-3.5 px-4">
                      {c.phone ? (
                        <div className="flex items-center gap-1.5 font-mono text-zinc-600 dark:text-zinc-300">
                          <span>{c.phone}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(c.phone, e)}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
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
                    <td className="py-3.5 px-4 text-right font-mono text-zinc-700 dark:text-zinc-300">
                      {formatVND(c.dau_ky)}
                    </td>

                    {/* Nợ tăng trong kỳ */}
                    <td className="py-3.5 px-4 text-right font-mono text-blue-600 dark:text-blue-400">
                      {c.tang_trong_ky > 0 ? formatVND(c.tang_trong_ky) : "0 ₫"}
                    </td>

                    {/* Nợ giảm trong kỳ */}
                    <td className="py-3.5 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
                      {c.giam_trong_ky > 0 ? `-${formatVND(c.giam_trong_ky)}` : "0 ₫"}
                    </td>

                    {/* Phải thu/trả cuối kỳ */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {formatVND(c.cuoi_ky)}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewCustomerDetail(c)}
                          className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-medium text-[11px] transition-colors"
                          title="Xem chi tiết đơn nợ"
                        >
                          Chi tiết
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleCopyStatement(c, e)}
                          className={`px-2 py-1 rounded-lg font-medium text-[11px] transition-colors border ${
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
        <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="text-zinc-500">
            Trang <strong className="text-zinc-800 dark:text-zinc-200">{page}</strong> / {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              Tiếp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
