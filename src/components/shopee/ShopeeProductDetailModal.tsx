"use client";

import React, { useState } from "react";
import { ShopeeProduct } from "@/types";
import { useToast } from "@/context/ToastContext";

interface ShopeeProductDetailModalProps {
  product: ShopeeProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShopeeProductDetailModal({
  product,
  isOpen,
  onClose,
}: ShopeeProductDetailModalProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success(`Đã sao chép ${label}: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const variations = product.variations || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-start gap-4 pr-6">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(".modal-img-fallback");
                  if (fallback) (fallback as HTMLElement).style.display = "flex";
                }}
                className="w-16 h-16 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 shadow-sm"
              />
            ) : null}
            <div
              className="modal-img-fallback w-16 h-16 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 items-center justify-center text-2xl font-bold shrink-0 shadow-sm"
              style={{ display: product.image ? "none" : "flex" }}
            >
              📦
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                  Shopee
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Shop: {product.shop_username || "baobiyensen"}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${product.stock > 0
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                    : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                    }`}
                >
                  {product.stock > 0 ? "Còn hàng" : "Hết hàng"}
                </span>
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                {product.name}
              </h2>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  ID Sản phẩm:{" "}
                  <button
                    onClick={() => handleCopy(product.item_id, "ID sản phẩm")}
                    className="font-mono font-medium text-zinc-800 dark:text-zinc-200 hover:text-orange-600 underline underline-offset-2"
                  >
                    {product.item_id}
                  </button>
                  {copiedId === product.item_id && (
                    <span className="text-emerald-600 ml-1">✓ đã chép</span>
                  )}
                </span>
                {product.parent_sku && (
                  <span>
                    SKU Cha:{" "}
                    <button
                      onClick={() => handleCopy(product.parent_sku!, "SKU Cha")}
                      className="font-mono font-medium text-zinc-800 dark:text-zinc-200 hover:text-orange-600 underline underline-offset-2"
                    >
                      {product.parent_sku}
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {product.product_url && (
              <a
                href={product.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:hover:bg-orange-950/50 transition-colors"
              >
                <span>Xem trên Shopee</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30 text-center">
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-0.5">Khoảng giá bán</span>
            <span className="text-base font-bold text-orange-600 dark:text-orange-400">
              {product.price_display || `₫${product.price_min.toLocaleString("vi-VN")}`}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-0.5">Tổng tồn kho</span>
            <span className={`text-base font-bold ${product.stock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
              {product.stock.toLocaleString("vi-VN")}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-0.5">Doanh số 30 ngày</span>
            <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
              {product.sales_30d} đã bán
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-0.5">Lượt xem 30 ngày</span>
            <span className="text-base font-bold text-sky-600 dark:text-sky-400">
              {product.views_30d || 0}
            </span>
          </div>
        </div>

        {/* Variations List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <span>Danh Sách Phân Loại Hàng</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {variations.length} phân loại
              </span>
            </h3>
          </div>

          {variations.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
              Sản phẩm đơn, không thiết lập biến thể / phân loại hàng.
            </div>
          ) : (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
                  <thead className="bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 uppercase font-semibold border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Phân loại</th>
                      <th className="py-3 px-4">SKU Phân loại</th>
                      <th className="py-3 px-4">Model ID</th>
                      <th className="py-3 px-4 text-right">Giá bán</th>
                      <th className="py-3 px-4 text-center">Tồn kho</th>
                      <th className="py-3 px-4 text-center">Đã bán</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {variations.map((v, idx) => (
                      <tr
                        key={v.model_id || idx}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-center text-zinc-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                          <div className="flex items-center gap-2.5">
                            {v.image ? (
                              <img
                                src={v.image}
                                alt={v.name}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                  const fallback = e.currentTarget.parentElement?.querySelector(".var-img-fallback");
                                  if (fallback) (fallback as HTMLElement).style.display = "flex";
                                }}
                                className="w-8 h-8 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                              />
                            ) : null}
                            <div
                              className="var-img-fallback w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 items-center justify-center text-zinc-400 shrink-0"
                              style={{ display: v.image ? "none" : "flex" }}
                            >
                              🏷️
                            </div>
                            <span>{v.name || "Phân loại mặc định"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {v.sku ? (
                            <button
                              onClick={() => handleCopy(v.sku, "SKU phân loại")}
                              className="text-zinc-700 dark:text-zinc-300 hover:text-orange-600 underline underline-offset-2"
                              title="Nhấp để chép SKU"
                            >
                              {v.sku}
                            </button>
                          ) : (
                            <span className="text-zinc-400">--</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-500">
                          {v.model_id ? (
                            <button
                              onClick={() => handleCopy(v.model_id, "Model ID")}
                              className="hover:text-orange-600"
                              title="Nhấp để chép Model ID"
                            >
                              {v.model_id}
                            </button>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-orange-600 dark:text-orange-400">
                          {v.price_display || `₫${(v.price || 0).toLocaleString("vi-VN")}`}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[11px] ${v.stock > 0
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                              }`}
                          >
                            {v.stock}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-zinc-700 dark:text-zinc-300">
                          {v.sales}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <span className="text-xs text-zinc-400">
            Đồng bộ lần cuối: {new Date(product.synced_at).toLocaleString("vi-VN")}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-200/80 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
