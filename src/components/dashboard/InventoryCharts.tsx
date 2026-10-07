"use client";

import React, { useState } from "react";
import Link from "next/link";
import { InventoryDashboardStats } from "@/app/api/dashboard/inventory-stats/route";

interface InventoryChartsProps {
  stats: InventoryDashboardStats;
}

export function InventoryCharts({ stats }: InventoryChartsProps) {
  const [activeTab, setActiveTab] = useState<"stock" | "value">("stock");

  const { summary, stockHealthBreakdown, priceBreakdown, topStockProducts, topValueProducts, branch } = stats;

  const maxStock = Math.max(...topStockProducts.map((p) => p.stock), 1);
  const maxValue = Math.max(...topValueProducts.map((p) => p.totalValue), 1);
  const maxPriceCount = Math.max(...priceBreakdown.map((p) => p.count), 1);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Header phân khu Quản Lý Kho & Tồn Kho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-base">
            🏭
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Quản Lý Kho &amp; Tồn Kho Chi Nhánh</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {summary.totalProducts} Sản phẩm • {summary.totalStock.toLocaleString("vi-VN")} Tồn
              </span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Giám sát mức độ sẵn sàng cung ứng hàng hóa, cảnh báo cạn kho và giá trị tài sản lưu kho
            </p>
          </div>
        </div>

        {/* Action Link to Inventory Page */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/inventory"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition shadow-2xs cursor-pointer"
          >
            <span>📦</span>
            <span>Vào kho kiểm kê</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* 2. 4 Thẻ KPI Tồn Kho Nổi Bật */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Tổng giá trị hàng tồn */}
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Tổng giá trị hàng tồn
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-xs">
              💰
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono mt-1 text-emerald-600 dark:text-emerald-400 truncate" title={`₫${summary.estimatedTotalValue.toLocaleString("vi-VN")}`}>
            ₫{Math.round(summary.estimatedTotalValue / 1000000000).toLocaleString("vi-VN")} Tỷ
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
            Ước tính theo giá niêm yết
          </div>
        </div>

        {/* KPI 2: Tổng lượng tồn kho */}
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Tổng sản phẩm trong kho
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs">
              📦
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono mt-1 text-zinc-900 dark:text-zinc-100">
            {summary.totalStock.toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
            Gồm {summary.totalVariations.toLocaleString("vi-VN")} phân loại SKU
          </div>
        </div>

        {/* KPI 3: Sẵn sàng cung ứng */}
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Sẵn sàng xuất kho
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs">
              ✅
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono mt-1 text-indigo-600 dark:text-indigo-400">
            {summary.inStockCount} <span className="text-sm font-normal text-zinc-400 font-sans">/ {summary.totalProducts}</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            Tỷ lệ khả dụng: {summary.inStockRate}%
          </div>
        </div>

        {/* KPI 4: Cảnh báo sắp / hết hàng */}
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Cảnh báo nhập hàng
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300 flex items-center justify-center text-xs">
              ⚠️
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono mt-1 text-amber-600 dark:text-amber-400">
            {summary.lowStockCount + summary.outOfStockCount} <span className="text-sm font-normal text-zinc-400 font-sans">mặt hàng</span>
          </div>
          <div className="text-[11px] text-rose-500 mt-0.5 truncate">
            {summary.outOfStockCount} hết hàng • {summary.lowStockCount} sắp cạn
          </div>
        </div>
      </div>

      {/* 3. Lưới Biểu Đồ Kho Hàng */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Cột Trái (5 cols): Sức khỏe kho hàng & Phân bổ phổ giá */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs sm:shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Sức Khỏe Kho &amp; Trạng Thái Tồn</span>
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-medium">
                {branch.name}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Phân loại 432 sản phẩm theo mức độ đáp ứng đơn hàng và phổ giá bán
            </p>
          </div>

          {/* Thanh chỉ báo sức khỏe kho hàng 3 màu */}
          <div className="my-4 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Mức độ sẵn sàng hàng hóa:
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {summary.inStockRate}% An toàn
              </span>
            </div>

            {/* Thanh phân chia đa phân đoạn */}
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-3 rounded-full overflow-hidden flex">
              {stockHealthBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  className="h-full transition-all duration-500"
                  title={`${item.label}: ${item.count} SP (${item.percentage}%)`}
                />
              ))}
            </div>

            {/* Chú thích 3 mức độ */}
            <div className="space-y-2 pt-1 text-xs">
              {stockHealthBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate">
                      {item.label}
                    </span>
                  </div>
                  <div className="font-mono text-zinc-600 dark:text-zinc-400 shrink-0">
                    <strong>{item.count}</strong> sp ({item.percentage}%)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phân khúc khoảng giá sản phẩm */}
          <div className="space-y-2.5 my-2">
            <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Phân khúc giá các mặt hàng trong kho:
            </h4>
            {priceBreakdown.map((item, idx) => {
              const barWidth = Math.max((item.count / maxPriceCount) * 100, 3);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-300 font-mono font-medium">
                      {item.range}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                      <strong>{item.count}</strong> sp ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${barWidth}%` }}
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Địa chỉ: {branch.address}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Kho chính</span>
          </div>
        </div>

        {/* Cột Phải (7 cols): Top mặt hàng tồn kho nhiều nhất & Top giá trị tồn kho */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs sm:shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>🏆</span>
                <span>
                  {activeTab === "stock"
                    ? "Top Mặt Hàng Số Lượng Tồn Lớn Nhất"
                    : "Top Mặt Hàng Có Giá Trị Lưu Kho Cao Nhất"}
                </span>
              </h3>

              {/* Tab Switcher */}
              <div className="inline-flex p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[11px] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("stock")}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                    activeTab === "stock"
                      ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  <span>📦 Theo Số Lượng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("value")}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                    activeTab === "value"
                      ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  <span>💰 Theo Giá Trị</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {activeTab === "stock"
                ? "Các mặt hàng chủ lực có khối lượng lưu kho lớn nhất tại Kho Tổng"
                : "Các dòng sản phẩm chiếm tỷ trọng giá trị tài sản kho hàng lớn nhất"}
            </p>
          </div>

          {/* Danh sách sản phẩm nổi bật */}
          <div className="my-4 divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {activeTab === "stock" && (
              topStockProducts.map((prod, idx) => {
                const rank = idx + 1;
                const barWidth = Math.max((prod.stock / maxStock) * 100, 4);

                return (
                  <div key={prod.id || idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        rank === 1
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : rank === 2
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {rank}
                    </div>

                    {/* Image */}
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                      {prod.image ? (
                        <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-xs text-zinc-400">📦</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={prod.name}>
                          {prod.name}
                        </h4>
                        <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                          {prod.stock.toLocaleString("vi-VN")} cái
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        <span className="font-mono text-zinc-600 dark:text-zinc-300 truncate max-w-[150px]">
                          {prod.priceDisplay}
                        </span>
                        {prod.sku && (
                          <span className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">
                            {prod.sku}
                          </span>
                        )}
                      </div>

                      {/* Bar */}
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          style={{ width: `${barWidth}%` }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {activeTab === "value" && (
              topValueProducts.map((prod, idx) => {
                const rank = idx + 1;
                const barWidth = Math.max((prod.totalValue / maxValue) * 100, 4);

                return (
                  <div key={prod.id || idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        rank === 1
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : rank === 2
                          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {rank}
                    </div>

                    <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                      {prod.image ? (
                        <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-xs text-zinc-400">💰</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={prod.name}>
                          {prod.name}
                        </h4>
                        <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 shrink-0">
                          {prod.totalValueDisplay}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        <span className="font-mono text-zinc-500">
                          Đơn giá: ₫{prod.price.toLocaleString("vi-VN")}
                        </span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                          Tồn {prod.stock.toLocaleString("vi-VN")} cái
                        </span>
                      </div>

                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          style={{ width: `${barWidth}%` }}
                          className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Đồng bộ 2 chiều dữ liệu với Sapo Kho &amp; Shopee</span>
            <Link href="/dashboard/inventory" className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">
              Chi tiết tồn kho toàn bộ {summary.totalProducts} sản phẩm →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
