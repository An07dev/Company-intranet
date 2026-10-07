"use client";

import React, { useState } from "react";
import { ShopeeOrder } from "@/types";
import { ShopeeStatusBadge } from "./ShopeeStatusBadge";
import { useToast } from "@/context/ToastContext";

interface ShopeeOrderDetailModalProps {
  order: ShopeeOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onCopySn?: (sn: string) => void;
  onDelete?: (order_sn: string) => void;
  onOrderUpdated?: () => void;
}

const SAPO_CANCEL_REASONS = [
  { value: "customer", label: "Khách yêu cầu hủy đơn (Customer requested)" },
  { value: "inventory", label: "Hết hàng tồn kho (Out of stock)" },
  { value: "wrong_item", label: "Đặt nhầm sản phẩm / thông tin (Wrong item)" },
  { value: "duplicate", label: "Đơn hàng trùng lặp (Duplicate order)" },
  { value: "contact", label: "Không liên hệ được khách hàng (Cannot contact)" },
  { value: "delivery", label: "Lỗi vận chuyển / không giao được (Delivery issue)" },
  { value: "fraud", label: "Đơn hàng gian lận / đơn ảo (Fraud)" },
  { value: "declined", label: "Khách từ chối thanh toán (Payment declined)" },
  { value: "other", label: "Lý do khác (Other)" },
];

export function ShopeeOrderDetailModal({
  order,
  isOpen,
  onClose,
  onCopySn,
  onDelete,
  onOrderUpdated,
}: ShopeeOrderDetailModalProps) {
  const { toast } = useToast();
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // Action State (Cancel/Close/Open)
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReasonKey, setCancelReasonKey] = useState("customer");
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  React.useEffect(() => {
    setActionError(null);
    setCancelError(null);
  }, [isOpen, order?.order_sn]);

  const handleRefreshFromSapo = async () => {
    if (!order) return;
    setRefreshingStatus(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/sapo/orders?order_sn=${encodeURIComponent(order.order_sn)}`);
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Đã cập nhật trạng thái từ Sapo: ${data.order?.order_status}`);
        setActionError(null);
        onOrderUpdated?.();
      } else {
        const errMsg = data.sapo_detail || data.message || data.error || "Không thể đồng bộ trạng thái từ Sapo";
        setActionError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = "Không thể kết nối đến máy chủ: " + (err?.message || String(err));
      setActionError(errMsg);
      toast.error(errMsg);
    } finally {
      setRefreshingStatus(false);
    }
  };

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

  const handleConfirmCancel = async () => {
    setActionLoading(true);
    setCancelError(null);
    try {
      const res = await fetch("/api/sapo/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_sn: order.order_sn,
          action: "cancel",
          reason: cancelReasonKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Đã hủy đơn hàng trên Sapo thành công!");
        setShowCancelModal(false);
        setCancelError(null);
        onOrderUpdated?.();
        onClose();
      } else {
        const errMsg = data.sapo_detail || data.message || data.error || "Lỗi khi hủy đơn hàng trên Sapo";
        setCancelError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = "Không thể kết nối API Sapo: " + (err?.message || String(err));
      setCancelError(errMsg);
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOrderAction = async (action: "close" | "open") => {
    const confirmed = confirm(
      action === "close"
        ? "Bạn có chắc chắn muốn hoàn tất / đóng đơn hàng này trên Sapo?"
        : "Bạn có chắc chắn muốn mở lại đơn hàng này trên Sapo?"
    );
    if (!confirmed) return;

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/sapo/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_sn: order.order_sn,
          action,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Thao tác trên Sapo thành công!");
        setActionError(null);
        onOrderUpdated?.();
        onClose();
      } else {
        const errMsg = data.sapo_detail || data.message || data.error || "Thao tác thất bại trên Sapo";
        setActionError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = "Không thể kết nối API Sapo: " + (err?.message || String(err));
      setActionError(errMsg);
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
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
                Gian hàng: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{order.shop_username}</span>
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-[11px] text-zinc-500">
                Đồng bộ lúc: {formatDateTime(order.synced_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ShopeeStatusBadge status={order.order_status} size="md" />
            <button
              type="button"
              onClick={handleRefreshFromSapo}
              disabled={refreshingStatus}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
              title="Làm mới trạng thái thời gian thực từ Sapo Omnichannel"
            >
              <svg
                className={`w-4 h-4 ${refreshingStatus ? "animate-spin text-emerald-600" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
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
          {actionError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                <span className="text-base">⚠️</span>
                <span>Phản hồi lỗi từ Sapo Omnichannel:</span>
              </div>
              <div className="font-mono text-[11px] leading-relaxed break-words bg-rose-100/60 dark:bg-rose-900/40 p-2.5 rounded-xl text-rose-900 dark:text-rose-100 border border-rose-200/50">
                {actionError}
              </div>
            </div>
          )}

          {/* Thông tin đơn hàng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-200/70 dark:border-zinc-800">
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
              <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatVND(order.total_amount)}
                <span className="text-[11px] text-zinc-400 font-normal ml-1">
                  ({order.payment_method || "Chưa rõ"})
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-zinc-500 block">Đơn vị vận chuyển:</span>
              <span className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5 block">
                {order.shipping_carrier || "Chưa gán đơn vị VC"}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-zinc-500 block">Mã vận đơn:</span>
              {order.tracking_number ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-white">
                    {order.tracking_number}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyTracking}
                    className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    {copiedTracking ? "Đã chép" : "Sao chép"}
                  </button>
                </div>
              ) : (
                <span className="text-xs text-zinc-400 italic">Chưa có mã vận đơn</span>
              )}
            </div>

            {order.status_description && (
              <div className="col-span-full border-t border-zinc-200/60 dark:border-zinc-700/60 pt-2 text-[11px] text-zinc-500">
                <span className="font-medium text-zinc-600 dark:text-zinc-400">Chi tiết trạng thái: </span>
                {order.status_description}
              </div>
            )}
          </div>

          {/* Section: Danh sách sản phẩm */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Sản phẩm trong đơn ({order.items?.length || 0})
              </span>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Tên sản phẩm</th>
                    <th className="py-2.5 px-3">Phân loại</th>
                    <th className="py-2.5 px-3 text-right">SL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                        <td className="py-2 px-3 text-zinc-400 text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                          {it.product_name}
                        </td>
                        <td className="py-2 px-3 text-zinc-500">{it.variation || "Mặc định"}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-zinc-700 dark:text-zinc-300">
                          x{it.quantity}
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

          {/* Section: Raw log / Sapo payload */}
          {order.raw_text && (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowRaw(!showRaw)}
                className="w-full flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/40 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <span>Dữ liệu gốc Sapo Omnichannel (Raw JSON)</span>
                <span className="text-zinc-400 text-xs">{showRaw ? "▲ Thu gọn" : "▼ Mở rộng"}</span>
              </button>
              {showRaw && (
                <div className="p-3 bg-zinc-950 text-zinc-200 font-mono text-[11px] overflow-x-auto max-h-40 whitespace-pre-wrap">
                  {order.raw_text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Write Operations */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {order.order_status !== "Đã hủy" && (
              <button
                type="button"
                onClick={() => {
                  setCancelError(null);
                  setShowCancelModal(true);
                }}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Hủy đơn hàng trực tiếp trên hệ thống Sapo"
              >
                <span>❌</span>
                <span>Hủy đơn Sapo</span>
              </button>
            )}

            {order.order_status !== "Đã giao" && order.order_status !== "Đã hủy" && (
              <button
                type="button"
                onClick={() => handleOrderAction("close")}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Hoàn tất đơn hàng trên Sapo"
              >
                <span>✅</span>
                <span>Hoàn tất đơn</span>
              </button>
            )}

            {order.order_status === "Đã giao" && (
              <button
                type="button"
                onClick={() => handleOrderAction("open")}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Mở lại đơn hàng trên Sapo để tiếp tục xử lý"
              >
                <span>🔄</span>
                <span>Mở lại đơn</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRefreshFromSapo}
              disabled={refreshingStatus}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Kiểm tra và cập nhật trạng thái thời gian thực từ Sapo Omnichannel"
            >
              <span className={refreshingStatus ? "animate-spin" : ""}>🔄</span>
              <span>{refreshingStatus ? "Đang đồng bộ..." : "Làm mới từ Sapo"}</span>
            </button>

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
                className="px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-rose-600 font-semibold text-xs transition-colors"
                title="Xóa bản ghi đơn khỏi hệ thống"
              >
                🗑️
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

        {/* Modal Xác nhận Hủy Đơn Hàng trên Sapo */}
        {showCancelModal && (
          <div
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 text-lg">
                  ⚠️
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Hủy đơn hàng #{order.order_sn} trên Sapo
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Đồng bộ trạng thái hủy trực tiếp 2 chiều với Sapo Omnichannel
                  </p>
                </div>
              </div>

              {cancelError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-1 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200 text-xs">
                    <span>⚠️</span>
                    <span>Phản hồi lỗi từ Sapo:</span>
                  </div>
                  <div className="font-mono text-[11px] leading-relaxed break-words bg-rose-100/60 dark:bg-rose-900/40 p-2 rounded-xl text-rose-900 dark:text-rose-100">
                    {cancelError}
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                Lưu ý: Thao tác này sẽ gửi yêu cầu hủy trực tiếp đến máy chủ Sapo. Khi đơn hủy thành công, số lượng tồn kho của các sản phẩm sẽ được tự động hoàn lại theo quy tắc của Sapo và không thể hoàn tác.
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Lý do hủy đơn trên Sapo <span className="text-rose-500">*</span>
                </label>
                <select
                  value={cancelReasonKey}
                  onChange={(e) => setCancelReasonKey(e.target.value)}
                  disabled={actionLoading}
                  className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  {SAPO_CANCEL_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setCancelError(null);
                    setShowCancelModal(false);
                  }}
                  disabled={actionLoading}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs shadow-rose-600/30"
                >
                  {actionLoading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Đang hủy trên Sapo...</span>
                    </>
                  ) : (
                    <>
                      <span>Xác nhận hủy trên Sapo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
