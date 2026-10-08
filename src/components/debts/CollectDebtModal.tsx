"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { DebtOrder } from "./OrderDebtsTable";

interface CollectDebtModalProps {
  order: DebtOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onDebtCollected?: () => void;
}

export function CollectDebtModal({
  order,
  isOpen,
  onClose,
  onDebtCollected,
}: CollectDebtModalProps) {
  const { toast } = useToast();

  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Tiền mặt");
  const [note, setNote] = useState("");
  const [syncToSapo, setSyncToSapo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (order && isOpen) {
      setAmount(order.unpaid_amount || 0);
      setPaymentMethod("Tiền mặt");
      setNote("");
      setSyncToSapo(true);
      setApiError(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const formatVND = (num: number) => {
    return (num || 0).toLocaleString("vi-VN") + " ₫";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      toast.error("Vui lòng nhập số tiền thu nợ hợp lệ (lớn hơn 0)");
      return;
    }

    if (amount > order.unpaid_amount) {
      const confirmOver = confirm(
        `Số tiền thu (${formatVND(amount)}) lớn hơn số nợ hiện tại (${formatVND(order.unpaid_amount)}). Bạn có chắc chắn muốn tiếp tục?`
      );
      if (!confirmOver) return;
    }

    setLoading(true);
    setApiError(null);

    try {
      const res = await fetch("/api/sapo/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_sn: order.order_sn,
          amount,
          payment_method: paymentMethod,
          note: note.trim(),
          sync_to_sapo: syncToSapo,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Ghi nhận thu nợ thành công!");
        if (data.data?.sapo_notice) {
          toast.warning(data.data.sapo_notice);
        }
        onDebtCollected?.();
        onClose();
      } else {
        const errMsg = data.sapo_detail || data.message || data.error || "Lỗi khi ghi nhận thu nợ";
        setApiError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = err?.message || "Lỗi kết nối khi gửi yêu cầu thu nợ";
      setApiError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0"></div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white flex items-center gap-2">
              <span className="text-rose-500">💳</span>
              <span>Thu nợ đơn #{order.order_sn}</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-xs sm:max-w-md">
              Khách: <strong className="text-zinc-800 dark:text-zinc-200">{order.customer_name}</strong>
              {order.customer_phone ? ` (${order.customer_phone})` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
          {apiError && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-200">
                <span>⚠️</span>
                <span>Thông báo lỗi:</span>
              </div>
              <div className="font-mono text-[11px] break-words bg-rose-100/60 dark:bg-rose-900/40 p-2 rounded-xl">
                {apiError}
              </div>
            </div>
          )}

          {/* Tóm tắt dư nợ */}
          <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400">Tổng tiền đơn hàng:</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {formatVND(order.total_amount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400">Đã thanh toán trước đó:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                {formatVND(order.total_received)}
              </span>
            </div>
            <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between">
              <span className="font-bold text-rose-800 dark:text-rose-200 text-xs">
                Số nợ còn lại hiện tại:
              </span>
              <span className="font-mono font-bold text-base text-rose-600 dark:text-rose-400">
                {formatVND(order.unpaid_amount)}
              </span>
            </div>
          </div>

          {/* Số tiền thu */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
              Số tiền thu đợt này (₫) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Nhập số tiền..."
              min={1000}
              className="w-full text-sm font-mono font-bold px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500"
              required
            />
            {/* Quick buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => setAmount(order.unpaid_amount)}
                className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-rose-600 border border-zinc-200 dark:border-zinc-700"
              >
                Thu hết nợ (100%)
              </button>
              {order.unpaid_amount >= 200000 && (
                <button
                  type="button"
                  onClick={() => setAmount(Math.round(order.unpaid_amount / 2))}
                  className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-rose-600 border border-zinc-200 dark:border-zinc-700"
                >
                  Thu 50% ({formatVND(Math.round(order.unpaid_amount / 2))})
                </button>
              )}
            </div>
          </div>

          {/* Phương thức thanh toán */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
              Hình thức thanh toán <span className="text-rose-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium cursor-pointer"
            >
              <option value="Tiền mặt">💵 Tiền mặt (Thu ngân / Trực tiếp)</option>
              <option value="Chuyển khoản Vietcombank">🏦 Chuyển khoản Vietcombank</option>
              <option value="Chuyển khoản Techcombank">🏦 Chuyển khoản Techcombank</option>
              <option value="Chuyển khoản MBBank">🏦 Chuyển khoản MBBank</option>
              <option value="Chuyển khoản (Khác)">🏦 Chuyển khoản ngân hàng khác</option>
              <option value="Quẹt thẻ POS">💳 Quẹt thẻ máy POS</option>
              <option value="Momo / ViettelMoney">📱 Ví điện tử (Momo / ZaloPay)</option>
            </select>
          </div>

          {/* Ghi chú */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
              Ghi chú thu nợ (tùy chọn)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Khách chuyển khoản cọc, số UNC..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Tùy chọn đồng bộ Sapo */}
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="sync_sapo"
              checked={syncToSapo}
              onChange={(e) => setSyncToSapo(e.target.checked)}
              className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <label htmlFor="sync_sapo" className="text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <span className="font-semibold block text-zinc-900 dark:text-white">
                Đồng bộ giao dịch thanh toán lên Sapo Omnichannel
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                Bắn dữ liệu sang Sapo để tăng số tiền đã thu và tự động chuyển trạng thái đơn sang Đã thanh toán (paid) khi thu đủ.
              </span>
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 font-semibold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs shadow-rose-600/30"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Đang xử lý thu nợ...</span>
                </>
              ) : (
                <>
                  <span>💳</span>
                  <span>Xác nhận thu {formatVND(amount)}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
