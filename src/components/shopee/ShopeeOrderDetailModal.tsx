"use client";

import React, { useState } from "react";
import { ShopeeOrder } from "@/types";
import { ShopeeStatusBadge } from "./ShopeeStatusBadge";
import { useToast } from "@/context/ToastContext";
import { ShipOrderModal } from "./ShipOrderModal";

interface ShopeeOrderDetailModalProps {
  order: ShopeeOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onCopySn?: (sn: string) => void;
  onDelete?: (order_sn: string) => void;
  onEdit?: (order: ShopeeOrder) => void;
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
  onEdit,
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
  const [showShipModal, setShowShipModal] = useState(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-3 sm:px-5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                {order.marketplace_order_sn || order.order_sn}
              </span>
              <button
                type="button"
                onClick={() => onCopySn?.(order.marketplace_order_sn || order.order_sn)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition cursor-pointer"
                title="Sao chép mã đơn sàn"
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
              {order.sapo_order_number && order.sapo_order_number !== (order.marketplace_order_sn || order.order_sn) && (
                <span className="text-[10px] sm:text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800">
                  Sapo: #{order.sapo_order_number}
                </span>
              )}
              <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                {order.shop_username}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5">
              Đồng bộ lúc: {formatDateTime(order.synced_at)}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ShopeeStatusBadge status={order.order_status} size="sm" />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-90 cursor-pointer"
              title="Đóng modal"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4">
          {actionError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-1 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                <span>⚠️</span>
                <span>Lỗi từ Sapo:</span>
              </div>
              <div className="font-mono text-[11px] leading-relaxed break-words bg-rose-100/60 dark:bg-rose-900/40 p-2 rounded-lg text-rose-900 dark:text-rose-100 border border-rose-200/50">
                {actionError}
              </div>
            </div>
          )}

          {/* Thông tin đơn hàng (2x2 Grid cực kỳ gọn gàng) */}
          <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl sm:rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 text-xs">
            <div>
              <span className="text-[10px] text-zinc-400 font-medium block">👤 Khách hàng</span>
              <div className="font-semibold text-zinc-900 dark:text-white truncate mt-0.5" title={order.buyer_username}>
                {order.buyer_username || "Khách lẻ"}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 font-medium block">💰 Tổng thanh toán</span>
              <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                {formatVND(order.total_amount)}
                <span className="text-[10px] font-normal text-zinc-400 ml-1">
                  ({order.payment_method || "COD"})
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 font-medium block">🚚 Đơn vị vận chuyển</span>
              <div className="font-medium text-zinc-700 dark:text-zinc-300 truncate mt-0.5">
                {order.shipping_carrier || "Chưa gán"}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 font-medium block">📦 Mã vận đơn</span>
              <div className="mt-0.5">
                {order.tracking_number ? (
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-semibold text-zinc-900 dark:text-white truncate text-xs">
                      {order.tracking_number}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyTracking}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 cursor-pointer text-xs shrink-0"
                      title="Sao chép mã vận đơn"
                    >
                      {copiedTracking ? "✓" : "📋"}
                    </button>
                  </div>
                ) : (
                  <span className="text-zinc-400 italic text-[11px]">Chưa có mã</span>
                )}
              </div>
            </div>

            {order.status_description && (
              <div className="col-span-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 text-[11px] text-zinc-500">
                <span className="font-medium text-zinc-600 dark:text-zinc-400">Trạng thái chi tiết: </span>
                {order.status_description}
              </div>
            )}
          </div>

          {/* Section: Danh sách sản phẩm (Card List hiện đại thay vì table thô cứng) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Sản phẩm trong đơn ({order.items?.length || 0})
              </span>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
              {order.items && order.items.length > 0 ? (
                order.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 sm:p-3 flex items-center justify-between gap-2.5 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center text-[11px] font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-1"
                          title={it.product_name}
                        >
                          {it.product_name}
                        </div>
                        {it.variation && (
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Phân loại: <span className="font-medium text-zinc-700 dark:text-zinc-300">{it.variation}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="font-mono font-bold text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded-md">
                        x{it.quantity}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-3 text-center text-zinc-400 text-xs italic">
                  Không có chi tiết sản phẩm
                </div>
              )}
            </div>
          </div>

          {/* Section: Raw log / Sapo payload (Accordion nhỏ gọn) */}
          {order.raw_text && (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowRaw(!showRaw)}
                className="w-full flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/40 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <span>Dữ liệu gốc Sapo (Raw JSON)</span>
                <span className="text-[10px] text-zinc-400">{showRaw ? "▲ Thu gọn" : "▼ Mở rộng"}</span>
              </button>
              {showRaw && (
                <div className="p-2.5 bg-zinc-950 text-zinc-300 font-mono text-[10px] overflow-x-auto max-h-36 whitespace-pre-wrap">
                  {order.raw_text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer (1 dòng tối ưu tuyệt đối, không rớt hàng) */}
        <div className="p-2.5 sm:p-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto no-scrollbar">
            {/* Cụm nút thao tác bên trái */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
              {/* Nút Hủy đơn Sapo */}
              {order.order_status !== "Đã hủy" && (
                <button
                  type="button"
                  onClick={() => {
                    setCancelError(null);
                    setShowCancelModal(true);
                  }}
                  disabled={actionLoading}
                  className="py-1.5 px-2 sm:px-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
                  title="Hủy đơn hàng trực tiếp trên hệ thống Sapo"
                >
                  <span>❌</span>
                  <span className="hidden sm:inline">Hủy đơn</span>
                  <span className="sm:hidden">Hủy</span>
                </button>
              )}

              {/* Nút Đẩy vận chuyển (khi đơn chưa hủy) */}
              {order.order_status !== "Đã hủy" && (
                <button
                  type="button"
                  onClick={() => setShowShipModal(true)}
                  disabled={actionLoading}
                  className="py-1.5 px-2 sm:px-2.5 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                  title="Đẩy đơn qua đơn vị vận chuyển và đồng bộ trực tiếp lên Sapo"
                >
                  <span>🚚</span>
                  <span className="hidden sm:inline">Đẩy vận chuyển</span>
                  <span className="sm:hidden">Giao hàng</span>
                </button>
              )}

              {/* Nút Sửa đơn */}
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(order)}
                  className="py-1.5 px-2 sm:px-2.5 rounded-xl border border-orange-200 dark:border-orange-800/80 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 hover:bg-orange-100 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                  title="Chỉnh sửa thông tin đơn hàng và đồng bộ lên Sapo"
                >
                  <span>✏️</span>
                  <span>Sửa đơn</span>
                </button>
              )}

              {/* Nút Mở lại đơn (nếu đã giao) */}
              {order.order_status === "Đã giao" && (
                <button
                  type="button"
                  onClick={() => handleOrderAction("open")}
                  disabled={actionLoading}
                  className="py-1.5 px-2 sm:px-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
                  title="Mở lại đơn hàng trên Sapo để tiếp tục xử lý"
                >
                  <span>🔄</span>
                  <span className="hidden sm:inline">Mở lại</span>
                  <span className="sm:hidden">Mở</span>
                </button>
              )}

              {/* Nút Làm mới từ Sapo */}
              <button
                type="button"
                onClick={handleRefreshFromSapo}
                disabled={refreshingStatus}
                className="py-1.5 px-2 sm:px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-medium text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
                title="Làm mới trạng thái từ Sapo"
              >
                <span className={refreshingStatus ? "animate-spin" : ""}>🔄</span>
                <span className="hidden md:inline">{refreshingStatus ? "Đang tải..." : "Làm mới"}</span>
              </button>

              {/* Nút Sao chép tóm tắt */}
              <button
                type="button"
                onClick={handleCopyAll}
                className="py-1.5 px-2 sm:px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-medium text-xs transition-colors flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                title="Sao chép tóm tắt đơn hàng"
              >
                <span>{copiedAll ? "✓" : "📋"}</span>
                <span className="hidden md:inline">{copiedAll ? "Đã sao chép" : "Chép"}</span>
              </button>
            </div>

            {/* Cụm nút thao tác bên phải: Xóa và Đóng cùng 1 hàng */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        `Bạn có chắc chắn muốn xóa đơn hàng #${order.order_sn}?\nThao tác này sẽ xóa đơn và ĐỒNG BỘ XÓA VĨNH VIỄN trên Sapo Omnichannel!`
                      )
                    ) {
                      onDelete(order.order_sn);
                    }
                  }}
                  className="py-1.5 px-2 sm:px-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-medium text-xs transition-colors cursor-pointer active:scale-95 flex items-center gap-1 shrink-0"
                  title="Xóa đơn hàng này và đồng bộ xóa trên Sapo"
                >
                  <span>🗑️</span>
                  <span className="hidden sm:inline">Xóa</span>
                </button>
              )}

              {/* Nút Đóng */}
              <button
                type="button"
                onClick={onClose}
                className="py-1.5 px-3.5 sm:px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs transition-colors cursor-pointer active:scale-95 shrink-0"
              >
                Đóng
              </button>
            </div>
          </div>
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

        {/* Modal Đẩy Đơn Vận Chuyển & Đồng bộ Sapo */}
        {showShipModal && (
          <ShipOrderModal
            order={order}
            isOpen={showShipModal}
            onClose={() => setShowShipModal(false)}
            onOrderShipped={() => {
              setShowShipModal(false);
              onOrderUpdated?.();
            }}
          />
        )}
      </div>
    </div>
  );
}
