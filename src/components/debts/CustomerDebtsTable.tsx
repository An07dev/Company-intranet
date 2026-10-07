"use client";

import React, { useState } from "react";
import { useToast } from "@/context/ToastContext";

export interface DebtorCustomer {
  customer_id?: number | null;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  total_debt: number;
  total_spent: number;
  debt_orders_count: number;
  latest_order_date?: string;
  max_days_overdue: number;
  orders?: Array<{
    order_sn: string;
    total_amount: number;
    unpaid_amount: number;
    financial_status: string;
    order_status: string;
    created_at: string;
    days_overdue: number;
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
}: CustomerDebtsTableProps) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const formatVND = (num: number) => {
    return (num || 0).toLocaleString("vi-VN") + " ₫";
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    toast.success(`Đã sao chép SĐT: ${phone}`);
  };

  const handleCopyStatement = (c: DebtorCustomer, e: React.MouseEvent) => {
    e.stopPropagation();
    const orderLines = (c.orders || [])
      .slice(0, 5)
      .map((o, idx) => `  ${idx + 1}. Đơn #${o.order_sn} (${formatDateTime(o.created_at)}): Nợ ${formatVND(o.unpaid_amount)}`)
      .join("\n");

    const text = `Kính gửi Anh/Chị ${c.name},
Bao Bì Yến Sen trân trọng thông báo tóm tắt số dư công nợ của Quý khách tính đến hiện tại:
- Tổng số tiền công nợ còn lại: ${formatVND(c.total_debt)}
- Tổng số đơn nợ: ${c.debt_orders_count} đơn hàng
${orderLines ? `Danh sách đơn nợ gần nhất:\n${orderLines}` : ""}

Kính mong Quý khách kiểm tra và sắp xếp kế hoạch thanh toán đối soát sớm.
Xin chân thành cảm ơn Quý khách!`;

    navigator.clipboard.writeText(text);
    setCopiedKey(c.phone || c.name);
    toast.success(`Đã sao chép sao kê công nợ của ${c.name} (sẵn sàng dán vào Zalo/SMS)`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const getOverdueBadge = (days: number) => {
    if (days >= 60) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
          Quá {days} ngày (Nợ khó đòi)
        </span>
      );
    }
    if (days >= 30) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
          Quá {days} ngày
        </span>
      );
    }
    if (days >= 15) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-950/70 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900">
          {days} ngày
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
        Trong hạn ({days} ngày)
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-xs overflow-hidden">
      {/* Header & Search */}
      <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white flex items-center gap-2">
            <span>👥</span>
            <span>Sổ nợ theo Khách hàng</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono font-medium">
              {totalCount.toLocaleString("vi-VN")} khách nợ
            </span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Gom nhóm toàn bộ các đơn nợ theo từng khách hàng để quản lý và gửi sao kê Zalo
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên, SĐT khách..."
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
              <th className="py-3 px-4 font-semibold">Khách hàng</th>
              <th className="py-3 px-4 font-semibold text-center">Số đơn nợ</th>
              <th className="py-3 px-4 font-semibold text-right">Tổng nợ phải thu</th>
              <th className="py-3 px-4 font-semibold text-center">Tuổi nợ cao nhất</th>
              <th className="py-3 px-4 font-semibold">Đơn nợ mới nhất</th>
              <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-36 mb-1"></div><div className="h-3 bg-zinc-100 dark:bg-zinc-850 rounded w-24"></div></td>
                  <td className="py-3.5 px-4 text-center"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-8 mx-auto"></div></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24 ml-auto"></div></td>
                  <td className="py-3.5 px-4 text-center"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 mx-auto"></div></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20"></div></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-24 ml-auto"></div></td>
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="font-semibold text-sm">Không tìm thấy khách hàng nợ nào</p>
                  <p className="text-xs text-zinc-400 mt-1">Tất cả khách hàng đã thanh toán đủ hoặc không khớp từ khóa tìm kiếm</p>
                </td>
              </tr>
            ) : (
              customers.map((c) => {
                const isCopied = copiedKey === (c.phone || c.name);
                const initial = (c.name || "K").trim().slice(0, 1).toUpperCase();

                return (
                  <tr
                    key={c.phone || c.name}
                    onClick={() => onViewCustomerDetail(c)}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Khách hàng */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <span className="truncate">{c.name}</span>
                          </div>
                          {c.phone ? (
                            <div className="flex items-center gap-1 text-[11px] text-zinc-500 mt-0.5">
                              <span className="font-mono">{c.phone}</span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyPhone(c.phone, e)}
                                className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                title="Sao chép SĐT"
                              >
                                📋
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic">Chưa có SĐT</span>
                          )}
                          {c.address && (
                            <div className="text-[10px] text-zinc-400 truncate max-w-xs mt-0.5">
                              {c.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Số đơn nợ */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                        {c.debt_orders_count} đơn
                      </span>
                    </td>

                    {/* Tổng nợ */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                        {formatVND(c.total_debt)}
                      </div>
                      {c.total_spent > 0 && (
                        <div className="text-[10px] text-zinc-400">
                          Tổng mua: {formatVND(c.total_spent)}
                        </div>
                      )}
                    </td>

                    {/* Tuổi nợ cao nhất */}
                    <td className="py-3.5 px-4 text-center">
                      {getOverdueBadge(c.max_days_overdue)}
                    </td>

                    {/* Đơn nợ mới nhất */}
                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">
                      {formatDateTime(c.latest_order_date)}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleCopyStatement(c, e)}
                          className="px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-medium text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          title="Sao chép tóm tắt công nợ gửi qua Zalo / SMS cho khách"
                        >
                          <span>{isCopied ? "✓" : "💬"}</span>
                          <span className="hidden sm:inline">{isCopied ? "Đã chép" : "Gửi Zalo"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onViewCustomerDetail(c)}
                          className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-medium text-xs transition-colors cursor-pointer"
                        >
                          Chi tiết
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
        <div className="p-3 sm:p-4 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <div>
            Trang {page} / {totalPages} (Tổng {totalCount} khách)
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              ← Trước
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
