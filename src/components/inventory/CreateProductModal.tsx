"use client";

import React, { useState } from "react";
import { useToast } from "@/context/ToastContext";

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProductModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProductModalProps) {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState<string>("0");
  const [stock, setStock] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Generate random SKU helper
  const handleGenerateSku = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    setSku(`YS-${randomCode}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Vui lòng nhập tên hàng hóa");
      return;
    }

    setLoading(true);
    try {
      const numPrice = Number(price.replace(/[^0-9]/g, "")) || 0;
      const numStock = Math.max(0, Number(stock) || 0);

      const res = await fetch("/api/sapo/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim() || undefined,
          price: numPrice,
          stock: numStock,
          description: description.trim(),
          branch: "Kho Tổng Yến Sen",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể tạo hàng hóa mới lên Sapo");
      }

      toast.success(
        `Đã tạo mã hàng mới ${json.data?.parent_sku || sku} và đồng bộ tồn ${numStock} lên Sapo thành công!`
      );

      // Reset form
      setName("");
      setSku("");
      setPrice("0");
      setStock(0);
      setDescription("");

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tạo hàng hóa");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-amber-50/60 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
              ➕
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white text-base">
                Nhập Hàng / Thêm SKU Mới Vào Kho
              </h2>
              <div className="text-[11px] text-zinc-500">
                Tạo sản phẩm & đồng bộ số lượng tồn khả dụng trực tiếp lên Sapo
              </div>
            </div>
          </div>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Tên hàng hóa */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              Tên hàng hóa / sản phẩm <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Yến Chưng Đông Trùng Hạ Thảo 70ml..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Mã SKU & Tự sinh SKU */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Mã SKU hàng hóa:
              </label>
              <button
                type="button"
                onClick={handleGenerateSku}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>🎲</span>
                <span>Tự sinh mã SKU</span>
              </button>
            </div>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="VD: YS-DONGTRUNG-70ML (để trống hệ thống sẽ tự sinh)"
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Đơn giá & Số lượng tồn ban đầu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Đơn giá bán niêm yết (₫):
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  const num = Number(val) || 0;
                  setPrice(num > 0 ? num.toLocaleString("vi-VN") : "0");
                }}
                placeholder="VD: 150.000"
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Số lượng tồn ban đầu:
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Chi nhánh kho */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              Chi nhánh nhập kho:
            </label>
            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <span>🏬</span>
              <span className="font-semibold">Kho Tổng Yến Sen (Mặc định)</span>
            </div>
          </div>

          {/* Mô tả / Ghi chú */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              Mô tả ngắn / Ghi chú (tùy chọn):
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Hàng lô mới sản xuất tháng này, hạn dùng 12 tháng..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition shadow-sm flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              <span>{loading ? "⏳" : "➕"}</span>
              <span>{loading ? "Đang tạo lên Sapo..." : "Tạo mới & Đồng bộ Sapo"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
