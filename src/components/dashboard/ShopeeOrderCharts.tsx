"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChannelItem } from "@/app/api/dashboard/shopee-stats/route";

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
  channelBreakdown?: ChannelItem[];
  shippingBreakdown: ShippingItem[];
  paymentBreakdown: PaymentItem[];
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue?: number;
  deliveredOrders?: number;
  deliveredRevenue?: number;
  deliveredRate?: number;
}

export function ShopeeOrderCharts({
  orderStatusBreakdown,
  channelBreakdown = [],
  shippingBreakdown,
  paymentBreakdown,
  totalOrders,
  totalRevenue,
  averageOrderValue = 0,
  deliveredOrders = 0,
  deliveredRevenue = 0,
  deliveredRate = 0,
}: ShopeeOrderChartsProps) {
  const [hoveredStatusIdx, setHoveredStatusIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"channel" | "shipping" | "payment">("channel");

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

  const maxChannelCount = Math.max(...channelBreakdown.map((c) => c.count), 1);
  const maxShippingCount = Math.max(...shippingBreakdown.map((s) => s.count), 1);
  const maxPaymentCount = Math.max(...paymentBreakdown.map((p) => p.count), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
      {/* 1. BIỂU ĐỒ DONUT: CƠ CẤU TRẠNG THÁI ĐƠN HÀNG */}
      <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs sm:shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg">📑</span>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Cơ Cấu Trạng Thái Đơn Hàng
              </h3>
            </div>
            <Link
              href="/dashboard/orders"
              className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span className="sm:hidden">Bảng đơn</span>
              <span className="hidden sm:inline">Xem bảng đơn hàng</span>
              <span>→</span>
            </Link>
          </div>
          <p className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Tỷ lệ đơn hàng theo trạng thái đã giao, chờ đóng gói và hủy đơn trên toàn hệ thống
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
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">
                    {hoveredItem.status}
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono mt-0.5" style={{ color: hoveredItem.color }}>
                    {hoveredItem.count.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {hoveredItem.percentage}% tổng đơn
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-[120px]">
                    ₫{(hoveredItem.totalRevenue || 0).toLocaleString("vi-VN")}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    Tổng đơn
                  </span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                    {totalOrders.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[130px]">
                    ₫{(totalRevenue || 0).toLocaleString("vi-VN")}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Danh sách nhãn trạng thái có tương tác hover */}
          <div className="w-full sm:w-auto flex-1 max-w-xs space-y-2">
            {orderStatusBreakdown.map((item, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredStatusIdx(idx)}
                onMouseLeave={() => setHoveredStatusIdx(null)}
                className={`p-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-between text-xs border ${hoveredStatusIdx === idx
                  ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                  : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {item.status}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {item.count.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-zinc-400 font-mono ml-1 text-[11px]">
                    ({item.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4 Chỉ số nghiệp vụ vận hành nhanh */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
            <span className="text-[10px] text-zinc-400 block">Tỷ lệ thành công</span>
            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {deliveredRate || Math.round((deliveredOrders / (totalOrders || 1)) * 100)}%
            </span>
          </div>
          <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
            <span className="text-[10px] text-zinc-400 block">Đơn trung bình (AOV)</span>
            <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 truncate block">
              ₫{(averageOrderValue || (totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0)).toLocaleString("vi-VN")}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
            <span className="text-[10px] text-zinc-400 block">Đã hoàn tất</span>
            <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400 truncate block">
              {deliveredOrders.toLocaleString("vi-VN")} đơn
            </span>
          </div>
          <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
            <span className="text-[10px] text-zinc-400 block">DT Đã giao</span>
            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate block" title={`₫${deliveredRevenue.toLocaleString("vi-VN")}`}>
              ₫{Math.round(deliveredRevenue / 1000000).toLocaleString("vi-VN")}M
            </span>
          </div>
        </div>
      </div>

      {/* 2. BIỂU ĐỒ PHÂN BỔ KÊNH BÁN ĐA KÊNH & VẬN CHUYỂN, THANH TOÁN */}
      <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs sm:shadow-sm flex flex-col justify-between">
        <div>
          {/* Header kèm 3 Tab chuyển đổi */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>🛍️</span>
              <span>
                {activeTab === "channel"
                  ? "Phân Bổ Kênh Bán Hàng (Omnichannel)"
                  : activeTab === "shipping"
                    ? "Đơn Vị Vận Chuyển Hàng"
                    : "Phương Thức Thanh Toán"}
              </span>
            </h3>

            {/* Toggle Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("channel")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "channel"
                    ? "bg-white dark:bg-zinc-900 text-orange-600 dark:text-orange-400 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                🌐 Kênh Bán
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("shipping")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "shipping"
                    ? "bg-white dark:bg-zinc-900 text-orange-600 dark:text-orange-400 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                🚚 Vận Chuyển
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("payment")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "payment"
                    ? "bg-white dark:bg-zinc-900 text-orange-600 dark:text-orange-400 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                💳 Thanh Toán
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {activeTab === "channel"
              ? "Doanh số & lượng đơn hàng đồng bộ theo các sàn TMĐT và kênh bán trực tiếp"
              : activeTab === "shipping"
                ? "Phân bổ đơn hàng theo các đối tác vận chuyển giao hàng"
                : "Cơ cấu hình thức thanh toán của khách hàng khi phát sinh đơn"}
          </p>
        </div>

        {/* Nội dung danh sách thanh phân bổ ngang theo Tab */}
        <div className="my-4 space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
          {activeTab === "channel" && (
            channelBreakdown.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">Chưa có dữ liệu kênh bán</div>
            ) : (
              channelBreakdown.map((item, idx) => {
                const barWidth = Math.max((item.count / maxChannelCount) * 100, 3);
                return (
                  <div key={idx} className="p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100/80 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm shrink-0">{item.icon}</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold" title={`₫${item.revenue.toLocaleString("vi-VN")}`}>
                          ₫{Math.round(item.revenue / 1000000).toLocaleString("vi-VN")}M
                        </span>
                        <span className="font-mono text-zinc-700 dark:text-zinc-300 font-bold min-w-[55px] text-right">
                          {item.count.toLocaleString("vi-VN")} <span className="font-normal text-zinc-400 text-[10px]">({item.percentage}%)</span>
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-zinc-200/60 dark:bg-zinc-700/60 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${barWidth}%`, backgroundColor: item.color }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === "shipping" && (
            shippingBreakdown.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">Chưa có dữ liệu vận chuyển</div>
            ) : (
              shippingBreakdown.map((item, idx) => {
                const barWidth = Math.max((item.count / maxShippingCount) * 100, 4);
                return (
                  <div key={idx} className="p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100/80 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">
                        {item.carrier}
                      </span>
                      <span className="font-mono text-zinc-600 dark:text-zinc-400 text-xs font-semibold">
                        <strong>{item.count.toLocaleString("vi-VN")}</strong> đơn ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200/60 dark:bg-zinc-700/60 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${barWidth}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${idx === 0 ? "bg-orange-500" : "bg-orange-400/80"
                          }`}
                      />
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === "payment" && (
            paymentBreakdown.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">Chưa có dữ liệu thanh toán</div>
            ) : (
              paymentBreakdown.map((item, idx) => {
                const barWidth = Math.max((item.count / maxPaymentCount) * 100, 4);
                return (
                  <div key={idx} className="p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100/80 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">
                        {item.method}
                      </span>
                      <span className="font-mono text-zinc-600 dark:text-zinc-400 text-xs font-semibold">
                        <strong>{item.count.toLocaleString("vi-VN")}</strong> đơn ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200/60 dark:bg-zinc-700/60 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${barWidth}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${idx === 0 ? "bg-blue-500" : "bg-blue-400/80"
                          }`}
                      />
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span>
            {activeTab === "channel"
              ? "Tự động phân bổ từ Sapo Omnichannel"
              : activeTab === "shipping"
                ? "Đơn vị chính: SPX Express & GHN"
                : "Hình thức chủ đạo: COD & Chuyển khoản"}
          </span>
          <span className="font-mono font-medium text-orange-600 dark:text-orange-400">
            Khớp 100% Đơn Hàng Đa Kênh
          </span>
        </div>
      </div>
    </div>
  );
}
