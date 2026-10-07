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
}: DebtStatsCardsProps) {
  const formatVND = (num?: number) => {
    return (num || 0).toLocaleString("vi-VN") + " ₫";
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
      {/* 1. Nợ đầu kỳ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-3 sm:p-4 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide truncate">
            Nợ đầu kỳ
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
            Lũy kế
          </span>
        </div>
        <div className="text-sm sm:text-base lg:text-lg font-bold font-mono text-zinc-800 dark:text-zinc-100 truncate my-0.5">
          {loading ? (
            <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
          ) : (
            formatVND(summary?.dau_ky)
          )}
        </div>
        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
          Trước ngày bắt đầu kỳ
        </div>
      </div>

      {/* 2. Nợ tăng trong kỳ */}
      <div className="bg-white dark:bg-zinc-900 border border-blue-200/70 dark:border-blue-900/60 rounded-2xl p-3 sm:p-4 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide truncate">
            Nợ tăng
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
            + Mua hàng
          </span>
        </div>
        <div className="text-sm sm:text-base lg:text-lg font-bold font-mono text-blue-600 dark:text-blue-400 truncate my-0.5">
          {loading ? (
            <div className="h-6 w-24 bg-blue-100 dark:bg-blue-900/40 rounded-md animate-pulse"></div>
          ) : (
            formatVND(summary?.tang_trong_ky)
          )}
        </div>
        <div className="text-[10px] text-blue-500/80 dark:text-blue-400/70 truncate">
          Phát sinh trong kỳ
        </div>
      </div>

      {/* 3. Nợ giảm trong kỳ */}
      <div className="bg-white dark:bg-zinc-900 border border-rose-200/70 dark:border-rose-900/60 rounded-2xl p-3 sm:p-4 shadow-2xs hover:border-rose-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-[11px] sm:text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wide truncate">
            Nợ giảm
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
            − Đã trả
          </span>
        </div>
        <div className="text-sm sm:text-base lg:text-lg font-bold font-mono text-rose-600 dark:text-rose-400 truncate my-0.5">
          {loading ? (
            <div className="h-6 w-24 bg-rose-100 dark:bg-rose-900/40 rounded-md animate-pulse"></div>
          ) : summary?.giam_trong_ky ? (
            `-${formatVND(summary.giam_trong_ky)}`
          ) : (
            "0 ₫"
          )}
        </div>
        <div className="text-[10px] text-rose-500/80 dark:text-rose-400/70 truncate">
          Đã thu / thanh toán
        </div>
      </div>

      {/* 4. Phải thu cuối kỳ (Nợ cuối kỳ) */}
      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-300/80 dark:border-emerald-700/80 rounded-2xl p-3 sm:p-4 shadow-2xs hover:border-emerald-400 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide truncate">
            Phải thu cuối kỳ
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
            = Còn nợ
          </span>
        </div>
        <div className="text-sm sm:text-base lg:text-lg font-extrabold font-mono text-emerald-700 dark:text-emerald-300 truncate my-0.5">
          {loading ? (
            <div className="h-6 w-28 bg-emerald-200 dark:bg-emerald-800 rounded-md animate-pulse"></div>
          ) : (
            formatVND(summary?.cuoi_ky)
          )}
        </div>
        <div className="text-[10px] text-emerald-600/90 dark:text-emerald-400/80 truncate font-medium">
          Đầu kỳ + Tăng − Giảm
        </div>
      </div>
    </div>
  );
}
