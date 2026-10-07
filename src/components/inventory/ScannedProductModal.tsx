"use client";

import React from "react";
import { ShopeeProduct } from "@/types";

interface ScannedProductModalProps {
  product: ShopeeProduct | null;
  scannedCode: string;
  isOpen: boolean;
  onClose: () => void;
  onScanAnother: () => void;
  onPrintLabel?: (product: ShopeeProduct) => void;
  onAdjustStock?: (product: ShopeeProduct) => void;
}

export function ScannedProductModal({
  product,
  scannedCode,
  isOpen,
  onClose,
  onScanAnother,
  onPrintLabel,
  onAdjustStock,
}: ScannedProductModalProps) {
  if (!isOpen) return null;

  const stockNum = product ? Number(product.stock) || 0 : 0;
  const isOutOfStock = stockNum <= 0;
  const isLowStock = !isOutOfStock && stockNum <= 10;
  const variations = product?.variations || [];

  const priceDisplay =
    product?.price_display && product?.price_display !== "₫0" && product?.price_display !== "₫"
      ? product.price_display
      : product?.price_min
      ? `₫${product.price_min.toLocaleString("vi-VN")}`
      : "--";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0">
              🎯
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-zinc-900 dark:text-white text-base truncate">
                Kết Quả Quét Mã Hàng Tồn Kho
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono truncate">
                <span>Mã:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded truncate">
                  {scannedCode}
                </span>
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

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {!product ? (
            /* Không tìm thấy sản phẩm */
            <div className="text-center py-8 space-y-3">
              <div className="text-4xl">⚠️</div>
              <div className="font-bold text-zinc-900 dark:text-white text-sm">
                Không tìm thấy sản phẩm với mã &quot;{scannedCode}&quot;
              </div>
              <p className="text-zinc-500 text-xs max-w-sm mx-auto">
                Mã này chưa được gán cho sản phẩm nào trong kho chi nhánh hoặc SKU chưa được đồng bộ về hệ thống.
              </p>
              <button
                type="button"
                onClick={onScanAnother}
                className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition shadow-sm inline-flex items-center gap-1.5"
              >
                <span>📷</span>
                <span>Quét mã khác</span>
              </button>
            </div>
          ) : (
            /* Có sản phẩm -> Hiển thị chi tiết và tồn kho nổi bật */
            <>
              {/* Product Basic Info */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800">
                {product.image ? (
                  <img
                    src={product.image}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-400 flex items-center justify-center shrink-0 text-2xl">
                    📦
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm leading-snug">
                    {product.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] font-mono">
                    <span className="text-zinc-500">
                      SKU: <strong className="text-zinc-800 dark:text-zinc-200">{product.parent_sku || `SKU-${product.item_id}`}</strong>
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <span className="text-zinc-500">ID: #{product.item_id}</span>
                  </div>
                  <div className="text-amber-600 dark:text-amber-400 font-bold font-mono text-xs mt-1">
                    Giá niêm yết: {priceDisplay}
                  </div>
                </div>
              </div>

              {/* TỒN KHO KHẢ DỤNG - HIỂN THỊ NỔI BẬT */}
              <div
                className={`p-4 rounded-2xl border text-center transition-all ${
                  isOutOfStock
                    ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40"
                    : isLowStock
                    ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40"
                    : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40"
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">
                  Số lượng tồn kho khả dụng
                </div>
                <div
                  className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                    isOutOfStock
                      ? "text-rose-600 dark:text-rose-400"
                      : isLowStock
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {stockNum.toLocaleString("vi-VN")}
                  <span className="text-sm font-semibold text-zinc-500 ml-1.5">sản phẩm</span>
                </div>

                <div className="mt-2 flex items-center justify-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      isOutOfStock
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"
                        : isLowStock
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                    }`}
                  >
                    <span>{isOutOfStock ? "✕" : isLowStock ? "⚠️" : "✓"}</span>
                    <span>{isOutOfStock ? "Hết hàng" : isLowStock ? "Sắp hết hàng (≤ 10)" : "Còn hàng ổn định"}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <span>🏬</span>
                    <span>Kho Tổng Yến Sen</span>
                  </span>
                </div>
              </div>

              {/* Bảng phân loại chi tiết (nếu có biến thể) */}
              {variations.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between text-xs">
                    <span>📦 Chi tiết tồn kho từng phân loại ({variations.length})</span>
                    <span className="text-[10px] text-zinc-400">Đơn vị: chiếc/cái</span>
                  </div>

                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800 max-h-48 overflow-y-auto">
                    {variations.map((v, idx) => {
                      const vStock = v.stock ?? 0;
                      return (
                        <div
                          key={v.model_id || idx}
                          className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-xs"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {v.name || `Phân loại #${idx + 1}`}
                            </div>
                            {v.sku && (
                              <div className="text-[10px] text-zinc-400 font-mono">
                                SKU: {v.sku}
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                                vStock <= 0
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  : vStock <= 10
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              }`}
                            >
                              {vStock.toLocaleString("vi-VN")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 gap-2.5">
          <button
            type="button"
            onClick={onScanAnother}
            className="w-full sm:w-auto py-2.5 sm:py-2 px-3.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
          >
            <span>📷</span>
            <span>Quét tiếp mã khác</span>
          </button>

          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2">
            {product && onAdjustStock && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAdjustStock(product);
                }}
                className="py-2.5 sm:py-2 px-2 sm:px-3 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition flex items-center justify-center gap-1 shadow-xs cursor-pointer text-center"
                title="Điều chỉnh tồn kho thực tế lên Sapo"
              >
                <span>⚡</span>
                <span className="truncate">Sửa tồn</span>
              </button>
            )}

            {product && onPrintLabel && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPrintLabel(product);
                }}
                className="py-2.5 sm:py-2 px-2 sm:px-3 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition flex items-center justify-center gap-1 text-center"
              >
                <span>🖨️</span>
                <span className="truncate">In tem</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`py-2.5 sm:py-2 px-3 sm:px-4 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition-colors text-center ${
                !product ? "col-span-3 sm:col-span-1" : ""
              }`}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
