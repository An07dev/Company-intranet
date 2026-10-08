"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DebtDashboardStats } from "@/app/api/dashboard/debt-stats/route";

interface DebtFinanceChartsProps {
  stats: DebtDashboardStats;
}

function formatVND(val: number): string {
  if (!val || val === 0) return "0\u00A0₫";
  return (val || 0).toLocaleString("vi-VN") + "\u00A0₫";
}

export function DebtFinanceCharts({ stats }: DebtFinanceChartsProps) {
  const [activeTopTab, setActiveTopTab] = useState<"customers" | "suppliers">("customers");
  const [balanceView, setBalanceView] = useState<"all" | "customers" | "suppliers">("all");

  const {
    summary,
    customerBalance,
    supplierBalance,
    agingBreakdown,
    channelBreakdown,
    topDebtors,
    topSuppliers,
  } = stats;

  // Tỷ lệ so sánh trực quan Phải Thu vs Phải Trả
  const totalBalanceComparison = Math.abs(customerBalance.no_cuoi_ky) + Math.abs(supplierBalance.no_cuoi_ky);
  const custShare =
    totalBalanceComparison > 0
      ? Math.round((Math.abs(customerBalance.no_cuoi_ky) / totalBalanceComparison) * 100)
      : 50;
  const suppShare = 100 - custShare;

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
          {/* Biểu đồ 1: Cân đối tài chính Khách hàng vs Nhà cung cấp (Tối ưu Mobile gọn gàng, thoáng đãng) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-2xs sm:shadow-sm space-y-3.5">
            {/* Header & Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>📊</span>
                <span className="sm:hidden">Cân Đối Công Nợ Sapo</span>
                <span className="hidden sm:inline">Cân Đối Cơ Cấu Công Nợ Sapo</span>
              </h3>

              {/* Bộ chuyển đổi phân hệ: Cực kỳ gọn và tránh rối mắt trên điện thoại */}
              <div className="inline-flex p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[11px] self-start sm:self-auto border border-zinc-200/60 dark:border-zinc-700/60">
                <button
                  type="button"
                  onClick={() => setBalanceView("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                    balanceView === "all"
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-bold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  <span>⚖️ Đối soát</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceView("customers")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                    balanceView === "customers"
                      ? "bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-2xs font-bold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  <span>👥 Khách nợ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceView("suppliers")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                    balanceView === "suppliers"
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  <span>🏭 NCC</span>
                </button>
              </div>
            </div>

            {/* 2 Khung Phân Hệ Rõ Ràng (Tách riêng Khách Hàng và NCC, không bị trộn lẫn số liệu) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {/* KHỐI 1: KHÁCH HÀNG (PHẢI THU) */}
              {(balanceView === "all" || balanceView === "customers") && (
                <div
                  className={`p-3 rounded-xl sm:rounded-2xl border transition-all ${
                    balanceView === "customers" ? "sm:col-span-2" : ""
                  } bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/50 space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                      <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                        Khách Hàng (Phải Thu)
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold font-mono">
                      {summary.totalDebtors} khách
                    </span>
                  </div>

                  {/* Số nợ cuối kỳ nổi bật */}
                  <div className="p-2 rounded-lg bg-white/90 dark:bg-zinc-900/80 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Cuối kỳ còn nợ:</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      {formatVND(customerBalance.no_cuoi_ky)}
                    </span>
                  </div>

                  {/* Luồng luân chuyển công nợ 3 dòng */}
                  <div className="space-y-1 text-xs pt-0.5">
                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                      <span>Nợ đầu kỳ:</span>
                      <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                        {formatVND(customerBalance.no_dau_ky)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                      <span>Phát sinh bán (+):</span>
                      <span className="font-mono font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        +{formatVND(customerBalance.no_tang_trong_ky)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                      <span>Đã thu hồi (-):</span>
                      <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        -{formatVND(customerBalance.no_giam_trong_ky)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* KHỐI 2: NHÀ CUNG CẤP (PHẢI TRẢ) */}
              {(balanceView === "all" || balanceView === "suppliers") && (
                <div
                  className={`p-3 rounded-xl sm:rounded-2xl border transition-all ${
                    balanceView === "suppliers" ? "sm:col-span-2" : ""
                  } bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-900/50 space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        Nhà Cung Cấp (Phải Trả)
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold font-mono">
                      {summary.totalSuppliers} NCC
                    </span>
                  </div>

                  {/* Số nợ cuối kỳ nổi bật */}
                  <div className="p-2 rounded-lg bg-white/90 dark:bg-zinc-900/80 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Cuối kỳ phải trả:</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {formatVND(supplierBalance.no_cuoi_ky)}
                    </span>
                  </div>

                  {/* Luồng luân chuyển công nợ 3 dòng */}
                  <div className="space-y-1 text-xs pt-0.5">
                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                      <span>Nợ đầu kỳ:</span>
                      <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                        {formatVND(supplierBalance.no_dau_ky)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                      <span>Phát sinh nhập (+):</span>
                      <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        +{formatVND(supplierBalance.no_tang_trong_ky)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                      <span>Đã thanh toán (-):</span>
                      <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        -{formatVND(supplierBalance.no_giam_trong_ky)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* HỘP TỔNG KẾT: Vị Thế Chênh Lệch Ròng & Thanh Cân Đối Tỷ Lệ */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-zinc-600 dark:text-zinc-400 text-[11px] font-medium">
                  Chênh lệch ròng (Thu - Trả):
                </span>
                <span
                  className={`font-mono font-bold text-xs sm:text-sm whitespace-nowrap ${
                    summary.netReceivable >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {summary.netReceivable >= 0 ? "+" : ""}
                  {formatVND(summary.netReceivable)}
                </span>
              </div>

              {/* Thanh tỷ lệ so sánh trực quan giữa Phải Thu vs Phải Trả */}
              {totalBalanceComparison > 0 && (
                <div className="space-y-1">
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${custShare}%` }}
                      className="h-full bg-rose-500 transition-all duration-500"
                      title={`Phải thu: ${formatVND(Math.abs(customerBalance.no_cuoi_ky))} (${custShare}%)`}
                    />
                    <div
                      style={{ width: `${suppShare}%` }}
                      className="h-full bg-indigo-500 transition-all duration-500"
                      title={`Phải trả: ${formatVND(Math.abs(supplierBalance.no_cuoi_ky))} (${suppShare}%)`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">Thu: {custShare}%</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {summary.netReceivable >= 0 ? "✓ Thu > Trả (An toàn)" : "⚠ Trả > Thu"}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Trả: {suppShare}%</span>
                  </div>
                </div>
              )}
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
