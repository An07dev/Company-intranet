"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CustomerCRMDashboardStats } from "@/app/api/dashboard/crm-stats/route";

interface CustomerCRMChartsProps {
  stats: CustomerCRMDashboardStats;
}

export function CustomerCRMCharts({ stats }: CustomerCRMChartsProps) {
  const [activeTab, setActiveTab] = useState<"leaderboard" | "cities">("leaderboard");

  const { summary, spendingTiers, orderFrequency, topCustomers, cityDistribution } = stats;

  const maxTierCount = Math.max(...spendingTiers.map((t) => t.count), 1);
  const maxFreqCount = Math.max(...orderFrequency.map((f) => f.count), 1);
  const maxCityCount = Math.max(...cityDistribution.map((c) => c.count), 1);
  const maxSpent = Math.max(...topCustomers.map((c) => c.totalSpent), 1);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Header phân khu Quản Lý Khách Hàng & CRM */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-base">
            👥
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Quản Lý Khách Hàng &amp; CRM</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {summary.totalCustomers.toLocaleString("vi-VN")} Khách hàng • {summary.vipCustomersCount} VIP
              </span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Phân tích chân dung khách hàng, phân hạng chi tiêu VIP và tỷ lệ giữ chân khách quay lại mua hàng
            </p>
          </div>
        </div>

        {/* Action Link to Customers Page */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition shadow-2xs cursor-pointer"
          >
            <span>👤</span>
            <span>Danh sách khách hàng</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* 2. 4 Thẻ KPI CRM Nổi Bật */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Tổng tệp khách hàng */}
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Tổng tệp khách hàng
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs">
              👥
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono mt-1 text-zinc-900 dark:text-zinc-100">
            {summary.totalCustomers.toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
            Khách hàng Sapo Omnichannel
          </div>
        </div>

        {/* KPI 2: Khách hàng VIP */}
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Khách hàng VIP (≥1M₫)
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300 flex items-center justify-center text-xs">
              👑
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono mt-1 text-amber-600 dark:text-amber-400">
            {summary.vipCustomersCount.toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
            Chiếm {Math.round((summary.vipCustomersCount / summary.totalCustomers) * 100)}% toàn tệp khách
          </div>
        </div>

        {/* KPI 3: Giá trị vòng đời TB */}
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Chi tiêu TB / Khách (LTV)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-xs">
              💎
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono mt-1 text-emerald-600 dark:text-emerald-400 truncate" title={`₫${summary.averageCustomerValue.toLocaleString("vi-VN")}`}>
            ₫{(summary.averageCustomerValue || 0).toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
            Giá trị doanh thu trọn đời
          </div>
        </div>

        {/* KPI 4: Tỷ lệ khách quay lại */}
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Tỷ lệ quay lại mua (≥2 đơn)
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center text-xs">
              🔁
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono mt-1 text-purple-600 dark:text-purple-400">
            {summary.repeatCustomerRate}%
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            Độ trung thành thương hiệu cao
          </div>
        </div>
      </div>

      {/* 3. Lưới Biểu Đồ CRM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Cột Trái (6 cols): Phân Tầng Giá Trị Khách Hàng & Tần Suất Mua */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs sm:shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>🎯</span>
                <span>Phân Tầng Hạn Mức Chi Tiêu (Customer Tiers)</span>
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-medium">
                4 Hạng
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Phân loại tệp khách hàng theo hạn mức tích lũy để có chính sách chăm sóc phù hợp
            </p>
          </div>

          {/* Danh sách 4 tầng chi tiêu */}
          <div className="my-4 space-y-2.5">
            {spendingTiers.map((tier, idx) => {
              const barWidth = Math.max((tier.count / maxTierCount) * 100, 4);
              return (
                <div key={idx} className="p-2.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100/80 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {tier.label}
                      </span>
                    </div>
                    <div className="font-mono text-zinc-700 dark:text-zinc-300 shrink-0">
                      <strong>{tier.count.toLocaleString("vi-VN")}</strong> khách ({tier.percentage}%)
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-zinc-200/60 dark:bg-zinc-700/60 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${barWidth}%`, backgroundColor: tier.color }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400">{tier.description}</p>
                </div>
              );
            })}
          </div>

          {/* Khối tần suất mua lặp lại ngang */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Tần suất đặt hàng tích lũy:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {orderFrequency.map((freq, idx) => (
                <div key={idx} className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-center">
                  <span className="text-[10px] text-zinc-400 block truncate">{freq.range}</span>
                  <span className="text-xs font-bold font-mono text-zinc-800 dark:text-zinc-200 block mt-0.5">
                    {freq.count} <span className="font-normal text-[10px] text-zinc-400">({freq.percentage}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cột Phải (6 cols): Bảng Vinh Danh Top Khách Hàng VIP & Địa Bàn Tỉnh Thành */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs sm:shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>🌟</span>
                <span>
                  {activeTab === "leaderboard"
                    ? "Top Khách Hàng Chi Tiêu Cao Nhất"
                    : "Phân Bổ Khách Hàng Theo Tỉnh Thành"}
                </span>
              </h3>

              {/* Tab Switcher */}
              <div className="inline-flex p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[11px] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("leaderboard")}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                    activeTab === "leaderboard"
                      ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  <span>👑 Top VIP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("cities")}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                    activeTab === "cities"
                      ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  <span>📍 Tỉnh Thành</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {activeTab === "leaderboard"
                ? "Bảng vinh danh các khách hàng thân thiết có đóng góp doanh số vượt trội"
                : "Mật độ phân bổ địa bàn giao hàng và sinh sống của khách hàng"}
            </p>
          </div>

          {/* Danh sách Top Khách Hàng hoặc Phân Bổ Tỉnh Thành */}
          <div className="my-4 divide-y divide-zinc-100 dark:divide-zinc-800/80 max-h-[340px] overflow-y-auto pr-1">
            {activeTab === "leaderboard" && (
              topCustomers.map((c, idx) => {
                const rank = idx + 1;
                const barWidth = Math.max((c.totalSpent / maxSpent) * 100, 4);

                return (
                  <div key={c.id || idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        rank === 1
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : rank === 2
                          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          : rank === 3
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {rank}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {c.name}
                          </h4>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full shrink-0"
                            style={{
                              backgroundColor: `${c.tierColor}15`,
                              color: c.tierColor,
                              border: `1px solid ${c.tierColor}30`,
                            }}
                          >
                            {c.tier}
                          </span>
                        </div>
                        <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                          {c.totalSpentDisplay}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        <span className="font-mono text-zinc-500">
                          SĐT: {c.phoneMasked} • {c.city}
                        </span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold text-[10px]">
                          {c.ordersCount} đơn hàng
                        </span>
                      </div>

                      {/* Bar */}
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          style={{ width: `${barWidth}%` }}
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {activeTab === "cities" && (
              cityDistribution.map((item, idx) => {
                const barWidth = Math.max((item.count / maxCityCount) * 100, 4);

                return (
                  <div key={idx} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">📍</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {item.city}
                        </span>
                      </div>
                      <span className="font-mono text-zinc-700 dark:text-zinc-300 font-bold">
                        {item.count} khách ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${barWidth}%` }}
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Dữ liệu đồng bộ trực tiếp từ CRM Sapo Omnichannel</span>
            <Link href="/dashboard/customers" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Quản lý chi tiết {summary.totalCustomers} khách hàng →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
