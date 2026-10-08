"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DebtDashboardStats } from "@/app/api/dashboard/debt-stats/route";

interface DebtFinanceChartsProps {
  stats: DebtDashboardStats;
}

function formatVND(val: number): string {
  if (!val || val === 0) return "0 ₫";
  return val.toLocaleString("vi-VN") + " ₫";
}

export function DebtFinanceCharts({ stats }: DebtFinanceChartsProps) {
  const [activeTopTab, setActiveTopTab] = useState<"customers" | "suppliers">("customers");

  const {
    summary,
    customerBalance,
    supplierBalance,
    agingBreakdown,
    channelBreakdown,
    topDebtors,
    topSuppliers,
  } = stats;

  // Max value cho so sánh thanh đối xứng
  const maxBalanceVal = Math.max(
    Math.abs(customerBalance.no_cuoi_ky),
    Math.abs(customerBalance.no_tang_trong_ky),
    Math.abs(customerBalance.no_giam_trong_ky),
    Math.abs(supplierBalance.no_tang_trong_ky),
    Math.abs(supplierBalance.no_giam_trong_ky),
    1
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* =========================================================================
          1. HEADER PHÂN KHU CÔNG NỢ SAPO
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-base shrink-0">
            ⚖️
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span>Quản Lý Công Nợ Sapo</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {summary.totalDebtors} Khách nợ • {summary.totalSuppliers} NCC
              </span>
            </h2>
            <p className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400">
              Giám sát cân đối tài chính, nợ phải thu khách hàng, nợ phải trả nhà cung cấp và rủi ro tuổi nợ
            </p>
          </div>
        </div>

        {/* Action Link tới trang sổ nợ chi tiết */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/dashboard/debts"
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition shadow-2xs cursor-pointer"
          >
            <span>📑</span>
            <span className="hidden sm:inline">Vào sổ nợ chi tiết</span>
            <span className="sm:hidden">Sổ nợ</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          2. 4 THẺ KPI TÀI CHÍNH NỔI BẬT (KHỚP 100% TRANG /dashboard/debts)
         ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* KPI 1: Phải thu khách hàng */}
        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
              Phải thu khách hàng
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300 flex items-center justify-center text-xs shrink-0">
              👥
            </div>
          </div>
          <div
            className="text-xs sm:text-base lg:text-xl xl:text-2xl font-bold sm:font-black font-mono mt-1 text-rose-600 dark:text-rose-400 truncate"
            title={formatVND(summary.customerDebt)}
          >
            {formatVND(summary.customerDebt)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1 truncate">
            <span className="hidden sm:inline">{summary.totalDebtors} khách nợ • {summary.totalDebtOrders} đơn nợ</span>
            <span className="sm:hidden">{summary.totalDebtors} khách nợ</span>
          </div>
        </div>

        {/* KPI 2: Phải trả nhà cung cấp */}
        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
              Phải trả nhà cung cấp
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs shrink-0">
              🏭
            </div>
          </div>
          <div
            className="text-xs sm:text-base lg:text-xl xl:text-2xl font-bold sm:font-black font-mono mt-1 text-indigo-600 dark:text-indigo-400 truncate"
            title={formatVND(summary.supplierDebt)}
          >
            {formatVND(summary.supplierDebt)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1 truncate">
            <span className="hidden sm:inline">{summary.totalSuppliers} nhà cung cấp • {summary.totalReceiveOrders} đơn nhập</span>
            <span className="sm:hidden">{summary.totalSuppliers} NCC</span>
          </div>
        </div>

        {/* KPI 3: Vị thế công nợ ròng */}
        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
              Công nợ ròng
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-xs shrink-0">
              💰
            </div>
          </div>
          <div
            className={`text-xs sm:text-base lg:text-xl xl:text-2xl font-bold sm:font-black font-mono mt-1 truncate ${
              summary.netReceivable >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
            title={formatVND(summary.netReceivable)}
          >
            {summary.netReceivable >= 0 ? "+" : ""}
            {formatVND(summary.netReceivable)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 sm:mt-1 truncate">
            <span className="hidden sm:inline">Phải thu KH &gt; Phải trả NCC</span>
            <span className="sm:hidden">Thu &gt; Trả</span>
          </div>
        </div>

        {/* KPI 4: Tỷ lệ thu hồi & Nợ quá hạn */}
        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
              Hiệu suất thu nợ
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300 flex items-center justify-center text-xs shrink-0">
              ⚡
            </div>
          </div>
          <div className="text-xs sm:text-base lg:text-xl xl:text-2xl font-bold sm:font-black font-mono mt-1 text-zinc-900 dark:text-zinc-100">
            {summary.collectionRate}%
          </div>
          <div className="text-[10px] sm:text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1 truncate">
            <span className="hidden sm:inline">Đã thu: {formatVND(customerBalance.no_giam_trong_ky)}</span>
            <span className="sm:hidden">Đã thu {formatVND(customerBalance.no_giam_trong_ky)}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. LƯỚI BIỂU ĐỒ CÔNG NỢ CHI TIẾT
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* =====================================================================
            CỘT TRÁI (6 CỘT): CÂN ĐỐI CƠ CẤU & PHÂN TÍCH TUỔI NỢ
           ===================================================================== */}
        <div className="lg:col-span-6 space-y-4 sm:space-y-6">
          {/* Biểu đồ 1: Cân đối tài chính Khách hàng vs Nhà cung cấp */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs sm:shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>📊</span>
                <span>Cân Đối Cơ Cấu Công Nợ Sapo</span>
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Khách hàng
                </span>
                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Nhà cung cấp
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {/* Mục 1: Nợ đầu kỳ */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Nợ Đầu Kỳ:</span>
                  <div className="font-mono text-[11px] flex gap-3">
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      KH: {formatVND(customerBalance.no_dau_ky)}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                      NCC: {formatVND(supplierBalance.no_dau_ky)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 h-2">
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min((customerBalance.no_dau_ky / maxBalanceVal) * 100, 100)}%` }}
                      className="h-full bg-rose-500 rounded-full"
                    />
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min((Math.abs(supplierBalance.no_dau_ky) / maxBalanceVal) * 100, 100)}%` }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Mục 2: Nợ tăng trong kỳ */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Nợ Tăng Trong Kỳ (Bán / Nhập):</span>
                  <div className="font-mono text-[11px] flex gap-3">
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      KH: +{formatVND(customerBalance.no_tang_trong_ky)}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                      NCC: +{formatVND(supplierBalance.no_tang_trong_ky)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 h-2">
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min((customerBalance.no_tang_trong_ky / maxBalanceVal) * 100, 100)}%` }}
                      className="h-full bg-rose-500 rounded-full"
                    />
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min((supplierBalance.no_tang_trong_ky / maxBalanceVal) * 100, 100)}%` }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Mục 3: Nợ giảm trong kỳ */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Nợ Giảm Trong Kỳ (Đã Thu / Trả):</span>
                  <div className="font-mono text-[11px] flex gap-3">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      KH: -{formatVND(customerBalance.no_giam_trong_ky)}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      NCC: -{formatVND(supplierBalance.no_giam_trong_ky)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 h-2">
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min((customerBalance.no_giam_trong_ky / maxBalanceVal) * 100, 100)}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min((supplierBalance.no_giam_trong_ky / maxBalanceVal) * 100, 100)}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Mục 4: Phải thu / Trả cuối kỳ */}
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <span>Phải Thu / Trả Cuối Kỳ:</span>
                  <div className="font-mono text-xs flex gap-3">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                      KH: {formatVND(customerBalance.no_cuoi_ky)}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                      NCC: {formatVND(supplierBalance.no_cuoi_ky)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Vị thế chênh lệch ròng (Phải thu - Phải trả):</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatVND(summary.netReceivable)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Biểu đồ 2: Cơ cấu tuổi nợ đơn hàng */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs sm:shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>⏱️</span>
                <span>Phân Tích Tuổi Nợ Đơn Hàng (Aging Analysis)</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {summary.totalDebtOrders} đơn nợ
              </span>
            </div>

            {/* Thanh đa phân đoạn thể hiện 3 khoảng tuổi nợ */}
            <div className="space-y-1.5">
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-3 rounded-full overflow-hidden flex">
                {agingBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${Math.max(item.percentage, 2)}%`, backgroundColor: item.color }}
                    className="h-full transition-all duration-500"
                    title={`${item.range}: ${formatVND(item.amount)} (${item.percentage}%)`}
                  />
                ))}
              </div>
            </div>

            {/* Thống kê chi tiết 3 khoảng tuổi nợ */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1">
              {agingBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="p-1.5 sm:p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-800/30 text-center space-y-0.5 sm:space-y-1"
                >
                  <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="truncate">{item.range}</span>
                  </div>
                  <div className="font-mono font-bold text-[10px] sm:text-xs text-zinc-900 dark:text-white truncate">
                    {formatVND(item.amount)}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-zinc-400 font-mono">
                    {item.count} đơn ({item.percentage}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =====================================================================
            CỘT PHẢI (6 CỘT): PHÂN BỔ KÊNH BÁN & TOP ĐỐI TƯỢNG NỢ
           ===================================================================== */}
        <div className="lg:col-span-6 space-y-4 sm:space-y-6">
          {/* Biểu đồ 3: Phân bổ công nợ theo kênh bán hàng */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs sm:shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>🛒</span>
                <span>Phân Bổ Công Nợ Theo Kênh Bán</span>
              </h3>
              <span className="text-[10px] text-zinc-400 font-mono">
                {channelBreakdown.length} Kênh
              </span>
            </div>

            <div className="space-y-2.5">
              {channelBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span>{item.label}</span>
                    </span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-400 text-[11px]">
                      <strong className="text-zinc-900 dark:text-zinc-100">{formatVND(item.unpaidAmount)}</strong>{" "}
                      ({item.percentage}%) • {item.orderCount} đơn
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(item.percentage, 3)}%`, backgroundColor: item.color }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Biểu đồ 4: Top đối tượng nợ trọng điểm (Chuyển tab Khách hàng vs Nhà cung cấp) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs sm:shadow-sm space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>🏆</span>
                <span>Top Đối Tượng Công Nợ Trọng Điểm</span>
              </h3>

              {/* Tab Switcher */}
              <div className="inline-flex p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveTopTab("customers")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    activeTopTab === "customers"
                      ? "bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 font-bold shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  Khách hàng nợ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTopTab("suppliers")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    activeTopTab === "suppliers"
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  Nhà cung cấp
                </button>
              </div>
            </div>

            {/* Danh sách Top Khách Hàng Nợ (Khớp 100% /dashboard/debts) */}
            {activeTopTab === "customers" ? (
              <div className="space-y-2">
                {topDebtors.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-400">Không có dữ liệu công nợ khách hàng</div>
                ) : (
                  topDebtors.map((d, idx) => (
                    <div
                      key={idx}
                      className="p-2 sm:p-2.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="w-5 h-5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {d.name}
                          </span>
                          {d.phone && (
                            <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                              ({d.phone})
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 shrink-0">
                          {formatVND(d.unpaidAmount)}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(d.percentage, 5)}%` }}
                          className="h-full bg-rose-500 rounded-full"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Danh sách Top Nhà Cung Cấp (Khớp 100% /dashboard/debts) */
              <div className="space-y-2">
                {topSuppliers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-400">Không có dữ liệu công nợ nhà cung cấp</div>
                ) : (
                  topSuppliers.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2 sm:p-2.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {s.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                            [{s.code}]
                          </span>
                        </div>
                        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
                          {formatVND(s.debtAmount)}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(s.percentage, 5)}%` }}
                          className="h-full bg-indigo-500 rounded-full"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
