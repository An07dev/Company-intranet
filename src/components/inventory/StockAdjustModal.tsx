"use client";

import React, { useState, useEffect } from "react";
import { ShopeeProduct } from "@/types";
import { useToast } from "@/context/ToastContext";

interface StockAdjustModalProps {
  product: ShopeeProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ADJUST_REASONS = [
  "Kiểm kê định kỳ (thực tế tại kho)",
  "Hàng nhập bổ sung / về thêm",
  "Hàng hỏng / rách bao bì / lỗi",
  "Khách đổi trả / đơn hoàn về kho",
  "Xuất mẫu / tiêu hủy",
  "Điều chỉnh khác",
];

export function StockAdjustModal({
  product,
  isOpen,
  onClose,
  onSuccess,
}: StockAdjustModalProps) {
  const { toast } = useToast();

  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [newStock, setNewStock] = useState<number>(0);
  const [reason, setReason] = useState<string>(ADJUST_REASONS[0]);
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Initialize or reset values when product changes
  useEffect(() => {
    if (!product) return;

    setApiError(null);
    const variations = product.variations || [];
    if (variations.length > 0) {
      const firstVar = variations[0];
      setSelectedVariantId(String(firstVar.model_id));
      const initStock = Number(firstVar.stock) || 0;
      setCurrentStock(initStock);
      setNewStock(initStock);
    } else {
      setSelectedVariantId(String(product.item_id));
      const initStock = Number(product.stock) || 0;
      setCurrentStock(initStock);
      setNewStock(initStock);
    }

    setReason(ADJUST_REASONS[0]);
    setNote("");
  }, [product, isOpen]);

  // Handle variant selection change
  const handleVariantChange = (modelId: string) => {
    setSelectedVariantId(modelId);
    const variations = product?.variations || [];
    const found = variations.find((v) => String(v.model_id) === String(modelId));
    if (found) {
      const stock = Number(found.stock) || 0;
      setCurrentStock(stock);
      setNewStock(stock);
    }
  };

  // Quick adjust (+ / - offset)
  const handleQuickDelta = (delta: number) => {
    setNewStock((prev) => Math.max(0, prev + delta));
  };

  if (!isOpen || !product) return null;

  const variations = product.variations || [];
  const difference = newStock - currentStock;
  const skuDisplay = product.parent_sku || `SKU-${product.item_id}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newStock < 0 || isNaN(newStock)) {
      toast.error("Số lượng tồn kho mới không hợp lệ");
      return;
    }

    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/sapo/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: product.item_id,
          model_id: selectedVariantId,
          new_stock: newStock,
          reason: note ? `${reason}: ${note}` : reason,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const errMsg = json.sapo_detail || json.message || json.error || "Không thể cập nhật tồn kho lên Sapo";
        setApiError(errMsg);
        toast.error(errMsg);
        return;
      }

      toast.success(
        `Đã điều chỉnh tồn SKU ${skuDisplay} thành ${newStock} thành công trên Sapo!`
      );
      setApiError(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      const errMsg = err?.message || "Lỗi khi cập nhật tồn kho";
      setApiError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-amber-50/60 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0">
              ⚡
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-zinc-900 dark:text-white text-base truncate">
                Điều Chỉnh Tồn Kho Thực Tế
              </h2>
              <div className="text-[11px] text-zinc-500 line-clamp-1 sm:line-clamp-none">
                Đồng bộ 2 chiều trực tiếp lên hệ thống Sapo Kho vận
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {apiError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                <span className="text-base">⚠️</span>
                <span>Phản hồi lỗi từ Sapo:</span>
              </div>
              <div className="font-mono text-[11px] leading-relaxed break-words bg-rose-100/60 dark:bg-rose-900/40 p-2.5 rounded-xl text-rose-900 dark:text-rose-100 border border-rose-200/50">
                {apiError}
              </div>
            </div>
          )}

          {/* Thông tin hàng hóa */}
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
            {product.image ? (
              <img
                src={product.image}
                alt=""
                className="w-14 h-14 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-400 flex items-center justify-center shrink-0 text-xl">
                📦
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs line-clamp-2">
                {product.name}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500 font-mono">
                <span>Mã SKU: <strong className="text-zinc-800 dark:text-zinc-200">{skuDisplay}</strong></span>
                <span>•</span>
                <span>ID: #{product.item_id}</span>
              </div>
            </div>
          </div>

          {/* Chọn phân loại nếu có biến thể */}
          {variations.length > 1 && (
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Chọn phân loại hàng hóa cần chỉnh ({variations.length} phân loại):
              </label>
              <select
                value={selectedVariantId}
                onChange={(e) => handleVariantChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
              >
                {variations.map((v) => (
                  <option key={v.model_id} value={v.model_id}>
                    {v.name} (Tồn hiện tại: {v.stock || 0})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* So sánh Tồn hiện tại vs Tồn thực tế mới */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
            <div className="text-center p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">
                Tồn trên hệ thống
              </div>
              <div className="text-2xl font-black font-mono text-zinc-700 dark:text-zinc-300 mt-0.5">
                {currentStock.toLocaleString("vi-VN")}
              </div>
            </div>

            <div className="text-center p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
              <div className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">
                Tồn thực tế kiểm kê
              </div>
              <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                {newStock.toLocaleString("vi-VN")}
              </div>
            </div>
          </div>

          {/* Ô nhập số lượng tồn mới & nút tăng giảm nhanh */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Số lượng tồn thực tế mới:
              </label>
              <div className="text-[11px] font-mono font-semibold">
                Chênh lệch:{" "}
                <span
                  className={
                    difference > 0
                      ? "text-emerald-600 font-bold"
                      : difference < 0
                      ? "text-rose-600 font-bold"
                      : "text-zinc-400"
                  }
                >
                  {difference > 0 ? `+${difference}` : difference} cái
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickDelta(-1)}
                className="w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 font-bold text-base transition flex items-center justify-center"
              >
                -1
              </button>
              <input
                type="number"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 h-10 px-3 text-center text-lg font-mono font-black rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => handleQuickDelta(1)}
                className="w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 font-bold text-base transition flex items-center justify-center"
              >
                +1
              </button>
            </div>

            {/* Quick offset pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-zinc-400">Tăng/giảm nhanh:</span>
              {[-10, -5, +5, +10, +50].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleQuickDelta(d)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold transition ${
                    d < 0
                      ? "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                  }`}
                >
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </div>
          </div>

          {/* Lý do kiểm kê / điều chỉnh */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              Lý do điều chỉnh:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              {ADJUST_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Ghi chú thêm */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              Ghi chú thêm (tùy chọn):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Kiểm kê quầy B2, phát hiện thiếu 2 hộp..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition text-center"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer text-center"
            >
              <span>{loading ? "⏳" : "⚡"}</span>
              <span className="truncate">{loading ? "Đang đồng bộ..." : "Cập nhật tồn Sapo"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
