"use client";

import React from "react";

interface DebtStatsCardsProps {
  summary: {
    dau_ky: number;
    tang_trong_ky: number;
    giam_trong_ky: number;
    cuoi_ky: number;
    totalDebtAmount: number;
    totalDebtOrders: number;
    totalDebtors: number;
    startDate?: string;
    endDate?: string;
  } | null;
  loading: boolean;
  dateRangeLabel?: string;
}

export function DebtStatsCards({
  summary,
  loading,
  dateRangeLabel = "30 ngày qua",
}: DebtStatsCardsProps) {
  const formatVND = (num?: number) => {
    return (num || 0).toLocaleString("vi-VN") + " ₫";
  };

  return (
    <div className="space-y-3">
      {/* Sapo Equation Banner: Nợ đầu kỳ + Nợ tăng trong kỳ - Nợ giảm trong kỳ = Nợ cuối kỳ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
              Tổng quan Phương trình Công nợ Sapo ({dateRangeLabel})
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Tổng khách nợ:{" "}
              <strong className="text-zinc-900 dark:text-white font-mono">
                {(summary?.totalDebtors || 0).toLocaleString("vi-VN")}
              </strong>
            </span>
            <span>•</span>
            <span>
              Đơn nợ đang mở:{" "}
              <strong className="text-zinc-900 dark:text-white font-mono">
                {(summary?.totalDebtOrders || 0).toLocaleString("vi-VN")}
              </strong>
            </span>
          </div>
        </div>

        {/* 4-block horizontal equation layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 items-center gap-3">
          {/* Block 1: Nợ đầu kỳ */}
          <div className="lg:col-span-2 bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 rounded-2xl p-4 transition-all hover:border-zinc-300">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
              Nợ đầu kỳ
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-zinc-800 dark:text-zinc-100">
              {loading ? (
                <div className="h-6 w-28 bg-zinc-200 dark:bg-zinc-700 rounded-md animate-pulse"></div>
              ) : (
                formatVND(summary?.dau_ky)
              )}
            </div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
              Số dư nợ lũy kế trước ngày bắt đầu kỳ
            </div>
          </div>

          {/* Plus sign */}
          <div className="hidden lg:flex justify-center items-center">
            <span className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-sm shadow-xs">
              +
            </span>
          </div>

          {/* Block 2: Nợ tăng trong kỳ */}
          <div className="lg:col-span-1 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/60 rounded-2xl p-4 transition-all hover:border-blue-300">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
              Nợ tăng trong kỳ
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-blue-700 dark:text-blue-300">
              {loading ? (
                <div className="h-6 w-24 bg-blue-100 dark:bg-blue-900/50 rounded-md animate-pulse"></div>
              ) : (
                formatVND(summary?.tang_trong_ky)
              )}
            </div>
            <div className="text-[10px] text-blue-500/80 dark:text-blue-400/70 mt-1">
              Phát sinh mua hàng ghi nợ
            </div>
          </div>

          {/* Minus sign */}
          <div className="hidden lg:flex justify-center items-center">
            <span className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center text-sm shadow-xs">
              −
            </span>
          </div>

          {/* Block 3: Nợ giảm trong kỳ */}
          <div className="lg:col-span-1 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/60 rounded-2xl p-4 transition-all hover:border-rose-300">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
              Nợ giảm trong kỳ
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {loading ? (
                <div className="h-6 w-24 bg-rose-100 dark:bg-rose-900/50 rounded-md animate-pulse"></div>
              ) : (
                (summary?.giam_trong_ky ? `-${formatVND(summary.giam_trong_ky)}` : "0 ₫")
              )}
            </div>
            <div className="text-[10px] text-rose-500/80 dark:text-rose-400/70 mt-1">
              Khách thanh toán / trả tiền
            </div>
          </div>

          {/* Equals sign */}
          <div className="hidden lg:flex justify-center items-center">
            <span className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm shadow-xs">
              =
            </span>
          </div>

          {/* Block 4: Nợ cuối kỳ (Phải thu cuối kỳ) */}
          <div className="lg:col-span-2 bg-emerald-50/50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl p-4 transition-all shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Phải thu cuối kỳ
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold">
                Nợ cuối kỳ
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
              {loading ? (
                <div className="h-7 w-32 bg-emerald-200 dark:bg-emerald-800 rounded-md animate-pulse"></div>
              ) : (
                formatVND(summary?.cuoi_ky)
              )}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              = Đầu kỳ + Tăng trong kỳ − Giảm trong kỳ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
