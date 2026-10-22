"use client";

import React from "react";
import { PurchaseOrder } from "@/types";

interface PurchaseOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
}

export function PurchaseOrderDetailModal({
  isOpen,
  onClose,
  order,
}: PurchaseOrderDetailModalProps) {
  if (!isOpen || !order) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const isPaid = order.transaction_status === "paid" || order.unpaid_amount <= 0;
  const isPartial = !isPaid && order.paid_amount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 bg-zinc-50/70 dark:bg-zinc-900/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-xl shrink-0 shadow-2xs">
              📦
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  Đơn nhập kho: {order.code}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isPaid
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : isPartial
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                  }`}
                >
                  {isPaid ? "✓ Đã thanh toán đủ" : isPartial ? "⚡ Thanh toán 1 phần" : "⏳ Chưa thanh toán"}
                </span>
                {order.inventory_synced && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    ⚡ Đã đồng bộ Sapo
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                Nhà cung cấp: <strong className="text-zinc-800 dark:text-zinc-200">{order.supplier_name}</strong> • Ngày nhập: {formatDate(order.received_on)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* 3 Thẻ thống kê tài chính của đơn */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                Tổng giá trị đơn nhập
              </span>
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1 block font-mono">
                {formatCurrency(order.total_price)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">
                Số tiền đã chi trả
              </span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-1 block font-mono">
                {formatCurrency(order.paid_amount)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
              <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 block">
                Công nợ còn lại
              </span>
              <span className="text-lg font-bold text-rose-700 dark:text-rose-400 mt-1 block font-mono">
                {formatCurrency(order.unpaid_amount)}
              </span>
            </div>
          </div>

          {/* Danh sách mặt hàng nhập */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Danh sách mặt hàng nhập ({order.line_items?.length || 0} sản phẩm)
              </h4>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs table-fixed min-w-[640px]">
                  <colgroup>
                    <col style={{ width: "42px" }} />
                    <col style={{ width: "50%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "18%" }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-zinc-100/70 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-2 text-center">#</th>
                      <th className="py-2.5 px-3">Tên sản phẩm & SKU</th>
                      <th className="py-2.5 px-3 text-center">Số lượng</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá nhập</th>
                      <th className="py-2.5 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
                    {order.line_items && order.line_items.length > 0 ? (
                      order.line_items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="py-2.5 px-2 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {item.sku && (
                                <span className="font-mono text-[10px] text-zinc-400">
                                  SKU: {item.sku}
                                </span>
                              )}
                              {item.sapo_synced && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                  ✓ Đã đồng bộ tồn Sapo
                                </span>
                              )}
                              {item.current_stock !== undefined && (
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                                  • Tồn sau nhập: {item.current_stock} cái
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold font-mono text-zinc-800 dark:text-zinc-200">
                            {item.quantity.toLocaleString("vi-VN")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-zinc-600 dark:text-zinc-300">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(item.line_amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-zinc-400">
                          Không có dữ liệu mặt hàng chi tiết
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Lịch sử giao dịch thanh toán */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Lịch sử chi trả / thanh toán ({order.transactions?.length || 0} đợt)
            </h4>

            {order.transactions && order.transactions.length > 0 ? (
              <div className="space-y-2">
                {order.transactions.map((tx, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs bg-zinc-50/50 dark:bg-zinc-800/30"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                        ₫
                      </div>
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                          {tx.payment_method_name || "Chuyển khoản ngân hàng"}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono block">
                          Thời gian: {formatDate(tx.processed_on || tx.created_on)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                        +{formatCurrency(tx.amount)}
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">
                        Thành công
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
                Chưa có đợt thanh toán nào được ghi nhận cho đơn nhập này.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2 bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
