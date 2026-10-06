"use client";

import React from "react";
import Link from "next/link";

interface PriceBreakdownItem {
  range: string;
  count: number;
  percentage: number;
}

interface TopSellingProduct {
  id: string;
  name: string;
  sales_30d: number;
  stock: number;
  price_min: number;
  price_display: string;
  image: string;
}

interface ShopeeProductChartsProps {
  totalProducts: number;
  inStockProducts: number;
  outOfStockProducts: number;
  totalStock: number;
  totalSales30d: number;
  productPriceBreakdown: PriceBreakdownItem[];
  topSellingProducts: TopSellingProduct[];
}

export function ShopeeProductCharts({
  totalProducts,
  inStockProducts,
  outOfStockProducts,
  totalStock,
  totalSales30d,
  productPriceBreakdown,
  topSellingProducts,
}: ShopeeProductChartsProps) {
  const inStockRate = totalProducts > 0 ? Math.round((inStockProducts / totalProducts) * 100) : 0;
  const outOfStockRate = 100 - inStockRate;

  const maxPriceCount = Math.max(...productPriceBreakdown.map(p => p.count), 1);
  const maxSales = Math.max(...topSellingProducts.map(p => p.sales_30d), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
      {/* 1. TỒN KHO & PHÂN BỔ KHOẢNG GIÁ SẢN PHẨM */}
      <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg">📦</span>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Tồn Kho &amp; Phân Khúc Giá
              </h3>
            </div>
            <Link
              href="/dashboard/shopee-products"
              className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium inline-flex items-center gap-1"
            >
              <span>Kho sản phẩm</span>
              <span>→</span>
            </Link>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Tình trạng sẵn có hàng và phổ giá của danh mục sản phẩm
          </p>
        </div>

        {/* Khối tỷ lệ còn hàng / hết hàng */}
        <div className="my-4 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              Tỷ lệ sẵn sàng cung ứng:
            </span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {inStockRate}% Còn hàng
            </span>
          </div>

          {/* Thanh phân chia 2 màu: Còn hàng (Xanh) vs Hết hàng (Đỏ) */}
          <div className="w-full bg-rose-100 dark:bg-rose-950/40 h-2.5 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${inStockRate}%` }}
              className="bg-emerald-500 h-full transition-all duration-500"
              title={`Còn hàng: ${inStockProducts} SP (${inStockRate}%)`}
            />
            <div
              style={{ width: `${outOfStockRate}%` }}
              className="bg-rose-500 h-full transition-all duration-500"
              title={`Hết hàng: ${outOfStockProducts} SP (${outOfStockRate}%)`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Còn hàng: <strong className="text-zinc-700 dark:text-zinc-200 font-mono">{inStockProducts}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>Hết hàng: <strong className="text-zinc-700 dark:text-zinc-200 font-mono">{outOfStockProducts}</strong></span>
            </span>
            <span>
              Tổng tồn: <strong className="text-zinc-800 dark:text-zinc-100 font-mono">{totalStock.toLocaleString("vi-VN")}</strong>
            </span>
          </div>
        </div>

        {/* Phân khúc khoảng giá */}
        <div className="space-y-2.5 my-2">
          <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            Phân khúc giá sản phẩm:
          </h4>
          {productPriceBreakdown.map((item, idx) => {
            const barW = Math.max((item.count / maxPriceCount) * 100, 3);
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-700 dark:text-zinc-300 font-mono font-medium">
                    {item.range}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                    <strong>{item.count}</strong> sp ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${barW}%` }}
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Tổng {totalProducts} sản phẩm đã rà soát</span>
          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-medium">100% khớp giá Shopee</span>
        </div>
      </div>

      {/* 2. TOP 5 SẢN PHẨM BÁN CHẠY NHẤT (30 NGÀY) */}
      <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg">🔥</span>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Top Sản Phẩm Bán Chạy (30 Ngày Qua)
              </h3>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-semibold font-mono">
              Tổng {totalSales30d} đã bán
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Xếp hạng các mặt hàng có lượng bán cao nhất trong chu kỳ 30 ngày trên Shopee
          </p>
        </div>

        {/* Danh sách Top 5 sản phẩm */}
        <div className="my-4 divide-y divide-zinc-100 dark:divide-zinc-800">
          {topSellingProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">Chưa có dữ liệu lượt bán</div>
          ) : (
            topSellingProducts.map((prod, idx) => {
              const rank = idx + 1;
              const barWidth = Math.max((prod.sales_30d / maxSales) * 100, 4);

              // Huy hiệu thứ hạng
              const badgeColors = [
                "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300",
                "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300",
                "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300",
                "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200",
                "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200",
              ];

              return (
                <div key={prod.id || idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3">
                  {/* Rank badge */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${badgeColors[idx] || badgeColors[3]}`}
                  >
                    {rank}
                  </div>

                  {/* Thumbnail ảnh sản phẩm */}
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                    {prod.image ? (
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs text-zinc-400">📦</span>
                    )}
                  </div>

                  {/* Chi tiết tên, giá và thanh doanh số */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate hover:text-orange-600 cursor-pointer"
                        title={prod.name}
                      >
                        {prod.name}
                      </h4>
                      <span className="text-xs font-bold font-mono text-orange-600 dark:text-orange-400 shrink-0">
                        {prod.sales_30d} đã bán
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      <span className="font-mono text-zinc-600 dark:text-zinc-300">
                        {prod.price_display}
                      </span>
                      <span className="font-mono text-[10px]">
                        {prod.stock > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Còn {prod.stock}</span>
                        ) : (
                          <span className="text-rose-500 font-semibold">Hết hàng</span>
                        )}
                      </span>
                    </div>

                    {/* Progress bar so sánh */}
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        style={{ width: `${barWidth}%` }}
                        className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Dữ liệu bán cập nhật từ Kênh Người Bán Shopee</span>
          <Link
            href="/dashboard/shopee-products"
            className="text-orange-600 dark:text-orange-400 hover:underline font-medium"
          >
            Quản lý toàn bộ {totalProducts} sản phẩm →
          </Link>
        </div>
      </div>
    </div>
  );
}
