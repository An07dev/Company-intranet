"use client";

import React, { useState } from "react";
import { ShopeeOrder } from "@/types";
import { ShopeeStatusBadge } from "./ShopeeStatusBadge";

interface ShopeeOrderDetailModalProps {
  order: ShopeeOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onCopySn?: (sn: string) => void;
  onDelete?: (order_sn: string) => void;
}

export function ShopeeOrderDetailModal({
  order,
  isOpen,
  onClose,
  onCopySn,
  onDelete,
}: ShopeeOrderDetailModalProps) {
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  if (!isOpen || !order) return null;

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const handleCopyTracking = () => {
    if (!order.tracking_number) return;
    navigator.clipboard.writeText(order.tracking_number);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const handleCopyAll = () => {
    const lines = [
      `Mã đơn hàng: ${order.order_sn}`,
      `Khách hàng: ${order.buyer_username}`,
      `Trạng thái: ${order.order_status}`,
      `Đơn vị VC: ${order.shipping_carrier || "Chưa rõ"}`,
      `Mã vận đơn: ${order.tracking_number || "Chưa có"}`,
      `Tổng tiền: ${formatVND(order.total_amount)} (${order.payment_method || "Chưa rõ"})`,
      `Sản phẩm:`,
      ...(order.items || []).map(
        (it, idx) =>
          `  ${idx + 1}. ${it.product_name}${it.variation ? ` [${it.variation}]` : ""} x${it.quantity}`
      ),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-zinc-500 font-medium">Mã đơn hàng:</span>
              <span className="font-mono font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                {order.order_sn}
              </span>
              <button
                type="button"
                onClick={() => onCopySn?.(order.order_sn)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                title="Sao chép mã đơn"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-zinc-500">
                Gian hàng: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{order.shop_username || "baobiyensen"}</span>
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-[11px] text-zinc-500">
                Đồng bộ lúc: {formatDateTime(order.synced_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ShopeeStatusBadge status={order.order_status} size="md" />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Section: Thông tin chính */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
            <div>
              <span className="text-[11px] font-medium text-zinc-500 block">Khách hàng:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {order.buyer_username.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                  {order.buyer_username}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-zinc-500 block">Tổng thanh toán:</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base font-bold text-orange-600 dark:text-orange-400">
                  {formatVND(order.total_amount)}
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300 font-medium">
                  {order.payment_method || "Chưa rõ"}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-zinc-500 block">Đơn vị vận chuyển:</span>
              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 mt-0.5 inline-block">
                🚚 {order.shipping_carrier || "Chưa xác định"}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-zinc-500 block">Mã vận đơn:</span>
              {order.tracking_number ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {order.tracking_number}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyTracking}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 transition-colors text-[10px]"
                    title="Sao chép mã vận đơn"
                  >
                    {copiedTracking ? (
                      <span className="text-emerald-500 font-medium">✓ Đã chép</span>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              ) : (
                <span className="text-xs text-zinc-400 italic">Chưa có mã vận đơn</span>
              )}
            </div>
          </div>

          {/* Section: Danh sách sản phẩm */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                Sản phẩm trong đơn ({order.items?.length || 0})
              </h3>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-2 px-3 w-10 text-center">#</th>
                    <th className="py-2 px-3">Tên sản phẩm</th>
                    <th className="py-2 px-3">Phân loại hàng</th>
                    <th className="py-2 px-3 text-right w-20">Số lượng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, index) => (
                      <tr key={index} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="py-2.5 px-3 text-center text-zinc-400 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-zinc-900 dark:text-zinc-100">
                          {item.product_name}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                          {item.variation ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px]">
                              {item.variation}
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic">Mặc định</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-zinc-900 dark:text-white">
                          x{item.quantity}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-zinc-400 italic">
                        Không có dữ liệu chi tiết sản phẩm
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Raw log / Sapo payload (nếu có) */}
          {order.raw_text && (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowRaw(!showRaw)}
                className="w-full flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/40 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <span>Dữ liệu gốc Sapo Webhook / API (Raw JSON)</span>
                <span className="text-zinc-400 text-xs">{showRaw ? "▲ Thu gọn" : "▼ Mở rộng"}</span>
              </button>
              {showRaw && (
                <div className="p-3 bg-zinc-900 text-zinc-200 font-mono text-[11px] overflow-x-auto max-h-40 whitespace-pre-wrap">
                  {order.raw_text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAll}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <span>{copiedAll ? "✓" : "📋"}</span>
              <span>{copiedAll ? "Đã chép" : "Chép tóm tắt"}</span>
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(order.order_sn)}
                className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <span>🗑️</span>
                <span>Xóa đơn</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
