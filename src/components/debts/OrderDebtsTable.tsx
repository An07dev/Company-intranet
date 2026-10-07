"use client";

import React, { useState } from "react";
import { useToast } from "@/context/ToastContext";

export interface DebtOrder {
  order_sn: string;
  sapo_id?: number | string | null;
  shop_username: string;
  order_status: string;
  financial_status: string;
  is_cancelled: boolean;
  total_amount: number;
  total_received: number;
  unpaid_amount: number;
  payment_method: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  created_at: string;
  days_overdue: number;
  items?: Array<{ product_name: string; variation?: string; quantity: number }>;
}

interface OrderDebtsTableProps {
  orders: DebtOrder[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatus: string;
  onStatusChange: (st: string) => void;
  selectedChannel: string;
  onChannelChange: (ch: string) => void;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (p: number) => void;
  onCollectDebt: (order: DebtOrder) => void;
  onViewOrderDetail?: (order: DebtOrder) => void;
}

export function OrderDebtsTable({
  orders,
  loading,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedChannel,
  onChannelChange,
  page,
  totalPages,
  totalCount,
  onPageChange,
  onCollectDebt,
  onViewOrderDetail,
}: OrderDebtsTableProps) {
  const { toast } = useToast();
  const [copiedSn, setCopiedSn] = useState<string | null>(null);

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
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const handleCopySn = (sn: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sn);
    setCopiedSn(sn);
    toast.success(`Đã sao chép mã đơn: #${sn}`);
    setTimeout(() => setCopiedSn(null), 2000);
  };

  const getChannelBadge = (ch: string) => {
    const s = (ch || "").toLowerCase();
    if (s.includes("zalo")) {
      return { label: "Zalo Chat", class: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200" };
    }
    if (s.includes("facebook") || s.includes("fb")) {
      return { label: "Facebook", class: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200" };
    }
    if (s.includes("shopee")) {
      return { label: "Shopee", class: "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200" };
    }
    if (s.includes("tiktok")) {
      return { label: "TikTok Shop", class: "bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200" };
    }
    if (s.includes("pos")) {
      return { label: "Tại quầy (POS)", class: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200" };
    }
    return { label: ch || "Sapo", class: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200" };
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-xs overflow-hidden">
      {/* Header & Filters */}
      <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white flex items-center gap-2">
              <span>📋</span>
              <span>Danh sách Đơn hàng còn nợ</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono font-medium">
                {totalCount.toLocaleString("vi-VN")} đơn nợ
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Theo dõi chi tiết từng đơn hàng chưa thanh toán, tuổi nợ và thực hiện thu nợ đồng bộ Sapo
            </p>
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm mã đơn, tên, SĐT khách..."
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

        {/* Filters bar */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <span className="text-zinc-500 font-medium">Lọc theo:</span>

          {/* Trạng thái thanh toán */}
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-hidden"
          >
            <option value="all">Tất cả trạng thái nợ</option>
            <option value="pending">Chưa thanh toán (Nợ 100%)</option>
            <option value="partially_paid">Thanh toán 1 phần</option>
          </select>

          {/* Kênh bán hàng */}
          <select
            value={selectedChannel}
            onChange={(e) => onChannelChange(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-hidden"
          >
            <option value="all">Tất cả kênh bán</option>
            <option value="sapo_zalo">Kênh Zalo Chat</option>
            <option value="sapo_shopee">Kênh Shopee</option>
            <option value="sapo_facebook">Kênh Facebook</option>
            <option value="sapo_pos">Tại quầy (POS)</option>
            <option value="sapo_tiktok">Kênh TikTok Shop</option>
            <option value="sapo_web">Website / Khác</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400">
              <th className="py-3 px-4 font-semibold">Mã đơn & Kênh</th>
              <th className="py-3 px-4 font-semibold">Khách hàng</th>
              <th className="py-3 px-4 font-semibold text-right">Tổng tiền</th>
              <th className="py-3 px-4 font-semibold text-right">Đã thanh toán</th>
              <th className="py-3 px-4 font-semibold text-right">Còn nợ lại</th>
              <th className="py-3 px-4 font-semibold text-center">Tuổi nợ</th>
              <th className="py-3 px-4 font-semibold">Ngày tạo đơn</th>
              <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-28 mb-1"></div></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32"></div></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto"></div></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16 ml-auto"></div></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto"></div></td>
                  <td className="py-3.5 px-4 text-center"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16 mx-auto"></div></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24"></div></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto"></div></td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-500">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="font-semibold text-sm">Không có đơn nợ nào phù hợp</p>
                  <p className="text-xs text-zinc-400 mt-1">Các đơn hàng trong điều kiện lọc đều đã thanh toán đủ</p>
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const badge = getChannelBadge(o.shop_username);
                const isCopied = copiedSn === o.order_sn;

                return (
                  <tr
                    key={o.order_sn}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* Mã đơn & Kênh */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          #{o.order_sn}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopySn(o.order_sn, e)}
                          className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                          title="Sao chép mã đơn"
                        >
                          {isCopied ? "✓" : "📋"}
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.class}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {o.order_status}
                        </span>
                      </div>
                    </td>

                    {/* Khách hàng */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {o.customer_name}
                      </div>
                      {o.customer_phone ? (
                        <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                          {o.customer_phone}
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-400 italic">Khách lẻ / Chưa có SĐT</div>
                      )}
                    </td>

                    {/* Tổng tiền */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatVND(o.total_amount)}
                    </td>

                    {/* Đã thanh toán */}
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {formatVND(o.total_received)}
                    </td>

                    {/* Còn nợ lại */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                        {formatVND(o.unpaid_amount)}
                      </span>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {o.financial_status === "partially_paid" ? "Đã trả một phần" : "Chưa trả"}
                      </div>
                    </td>

                    {/* Tuổi nợ */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.days_overdue >= 60
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            : o.days_overdue >= 30
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {o.days_overdue} ngày
                      </span>
                    </td>

                    {/* Ngày tạo */}
                    <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 text-[11px]">
                      {formatDateTime(o.created_at)}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onCollectDebt(o)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 ml-auto cursor-pointer shadow-xs shadow-rose-600/30"
                      >
                        <span>💳</span>
                        <span>Thu nợ</span>
                      </button>
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
            Trang {page} / {totalPages} (Tổng {totalCount} đơn nợ)
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
