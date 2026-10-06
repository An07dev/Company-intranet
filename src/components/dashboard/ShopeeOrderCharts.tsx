"use client";

import React, { useState } from "react";
import Link from "next/link";

interface OrderStatusItem {
  status: string;
  count: number;
  percentage: number;
  totalRevenue: number;
  color: string;
}

interface ShippingItem {
  carrier: string;
  count: number;
  percentage: number;
}

interface PaymentItem {
  method: string;
  count: number;
  percentage: number;
}

interface ShopeeOrderChartsProps {
  orderStatusBreakdown: OrderStatusItem[];
  shippingBreakdown: ShippingItem[];
  paymentBreakdown: PaymentItem[];
  totalOrders: number;
  totalRevenue: number;
}

export function ShopeeOrderCharts({
  orderStatusBreakdown,
  shippingBreakdown,
  paymentBreakdown,
  totalOrders,
  totalRevenue,
}: ShopeeOrderChartsProps) {
  const [hoveredStatusIdx, setHoveredStatusIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"shipping" | "payment">("shipping");

  // Donut SVG Calculations
  const radius = 64;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const segments = orderStatusBreakdown.map((item, idx) => {
    const fraction = totalOrders > 0 ? item.count / totalOrders : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += fraction;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      isHovered: hoveredStatusIdx === idx,
    };
  });

  const hoveredItem = hoveredStatusIdx !== null ? orderStatusBreakdown[hoveredStatusIdx] : null;

  const currentDistItems = activeTab === "shipping" 
    ? shippingBreakdown.map(i => ({ label: i.carrier, count: i.count, percentage: i.percentage }))
    : paymentBreakdown.map(i => ({ label: i.method, count: i.count, percentage: i.percentage }));

  const maxDistCount = Math.max(...currentDistItems.map(i => i.count), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
      {/* 1. BIỂU ĐỒ DONUT: PHÂN BỔ TRẠNG THÁI ĐƠN HÀNG */}
      <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg">📑</span>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Trạng Thái Đơn Hàng Shopee
              </h3>
            </div>
            <Link
              href="/dashboard/shopee-orders"
              className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium inline-flex items-center gap-1"
            >
              <span>Xem chi tiết đơn</span>
              <span>→</span>
            </Link>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Tỷ lệ đơn hàng theo trạng thái xử lý, vận chuyển và hoàn thành
          </p>
        </div>

        {/* Vùng đồ thị Donut & Thống kê */}
        <div className="my-5 flex flex-col sm:flex-row items-center justify-around gap-6">
          {/* SVG Donut */}
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
              {/* Vòng nền mờ */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-zinc-100 dark:stroke-zinc-800"
                strokeWidth={strokeWidth}
                fill="none"
              />

              {/* Các phân đoạn trạng thái */}
              {segments.map((seg, idx) => (
                <circle
                  key={idx}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={seg.isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    filter: seg.isHovered ? `drop-shadow(0 0 6px ${seg.color}80)` : "none",
                    opacity: hoveredStatusIdx === null || seg.isHovered ? 1 : 0.45,
                  }}
                  onMouseEnter={() => setHoveredStatusIdx(idx)}
                  onMouseLeave={() => setHoveredStatusIdx(null)}
                />
              ))}
            </svg>

            {/* Thông tin trọng tâm Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
              {hoveredItem ? (
                <>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate max-w-[110px]">
                    {hoveredItem.status}
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono mt-0.5" style={{ color: hoveredItem.color }}>
                    {hoveredItem.count}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {hoveredItem.percentage}% đơn
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    Tổng đơn
                  </span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                    {totalOrders}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[120px]">
                    ₫{(totalRevenue || 0).toLocaleString("vi-VN")}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Danh sách nhãn trạng thái có tương tác hover */}
          <div className="w-full sm:w-auto flex-1 max-w-xs space-y-2">
            {orderStatusBreakdown.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredStatusIdx(idx)}
                onMouseLeave={() => setHoveredStatusIdx(null)}
                className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between text-xs ${
                  hoveredStatusIdx === idx
                    ? "bg-zinc-100 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                    {item.status}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {item.count}
                  </span>
                  <span className="text-zinc-400 font-mono ml-1 text-[11px]">
                    ({item.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Ghi nhận từ các đơn hàng đã đồng bộ</span>
          <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
            Tỷ lệ giao thành công: {
              Math.round(
                ((orderStatusBreakdown.find(s => s.status === "Đã giao")?.count || 0) /
                  (totalOrders || 1)) * 100
              )
            }%
          </span>
        </div>
      </div>

      {/* 2. BIỂU ĐỒ CỘT NGANG: ĐƠN VỊ VẬN CHUYỂN & THANH TOÁN */}
      <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header kèm Tab chuyển đổi */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>🚚</span>
              <span>Kênh Giao Hàng &amp; Thanh Toán</span>
            </h3>

            {/* Toggle Tabs */}
            <div className="inline-flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTab("shipping")}
                className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                  activeTab === "shipping"
                    ? "bg-white dark:bg-zinc-900 text-orange-600 dark:text-orange-400 shadow-2xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                ĐV Vận chuyển
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("payment")}
                className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                  activeTab === "payment"
                    ? "bg-white dark:bg-zinc-900 text-orange-600 dark:text-orange-400 shadow-2xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                Thanh toán
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {activeTab === "shipping"
              ? "Phân bổ đơn hàng theo đối tác vận chuyển Shopee"
              : "Phân bổ theo hình thức thanh toán của người mua"}
          </p>
        </div>

        {/* Danh sách thanh phân bổ ngang */}
        <div className="my-4 space-y-3">
          {currentDistItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">Chưa có dữ liệu phân bổ</div>
          ) : (
            currentDistItems.map((item, idx) => {
              const barWidth = Math.max((item.count / maxDistCount) * 100, 4);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[190px]">
                      {item.label}
                    </span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-400">
                      <strong>{item.count}</strong> đơn ({item.percentage}%)
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${barWidth}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        activeTab === "shipping"
                          ? idx === 0 ? "bg-orange-500" : "bg-orange-400/80"
                          : idx === 0 ? "bg-blue-500" : "bg-blue-400/80"
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer note */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span>{activeTab === "shipping" ? "Đối tác chính: SPX Express" : "Hình thức phổ biến: COD"}</span>
          <span className="text-zinc-400 font-mono">Đồng bộ tự động</span>
        </div>
      </div>
    </div>
  );
}
