"use client";

import React from "react";

interface SupplierDebtStatsCardsProps {
  summary: {
    no_dau_ky: number;
    no_giam_trong_ky: number;
    no_tang_trong_ky: number;
    no_cuoi_ky: number;
    total_suppliers?: number;
    total_receive_orders?: number;
    total_returns?: number;
  } | null;
  loading: boolean;
}

export function SupplierDebtStatsCards({ summary, loading }: SupplierDebtStatsCardsProps) {
  const formatVND = (num?: number) => {
    return (num || 0).toLocaleString("vi-VN") + " ₫";
  };

  return (
    <div className="relative">
      {/* Grid 4 cards on desktop with math operators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5 items-stretch">
        {/* 1. Nợ đầu kỳ */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between relative group">
          <div className="flex items-center justify-between gap-1 mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide truncate">
              Nợ đầu kỳ
            </span>
            <span className="hidden sm:inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
              Lũy kế
            </span>
          </div>
          <div className="text-xs sm:text-base lg:text-lg font-bold font-mono text-zinc-800 dark:text-zinc-100 truncate my-0.5">
            {loading ? (
              <div className="h-5 sm:h-6 w-20 sm:w-24 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
            ) : (
              formatVND(summary?.no_dau_ky)
            )}
          </div>
          <div className="hidden sm:block text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
            Trước ngày bắt đầu kỳ
          </div>
        </div>

        {/* 2. Nợ giảm trong kỳ (+ Thanh toán / Trả hàng) */}
        <div className="bg-white dark:bg-zinc-900 border border-emerald-200/70 dark:border-emerald-900/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between relative group">
          <div className="flex items-center justify-between gap-1 mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide truncate">
              Nợ giảm trong kỳ
            </span>
            <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              + Trả tiền / Trả hàng
            </span>
          </div>
          <div className="text-xs sm:text-base lg:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate my-0.5">
            {loading ? (
              <div className="h-5 sm:h-6 w-20 sm:w-24 bg-emerald-100 dark:bg-emerald-900/40 rounded-md animate-pulse"></div>
            ) : (
              formatVND(summary?.no_giam_trong_ky)
            )}
          </div>
          <div className="hidden sm:block text-[10px] text-emerald-600/80 dark:text-emerald-400/70 truncate">
            Đã thanh toán & trả hàng NCC
          </div>
        </div>

        {/* 3. Nợ tăng trong kỳ (− Nhập hàng mới) */}
        <div className="bg-white dark:bg-zinc-900 border border-rose-200/70 dark:border-rose-900/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs hover:border-rose-300 transition-all flex flex-col justify-between relative group">
          <div className="flex items-center justify-between gap-1 mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wide truncate">
              Nợ tăng trong kỳ
            </span>
            <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
              − Nhập hàng
            </span>
          </div>
          <div className="text-xs sm:text-base lg:text-lg font-bold font-mono text-rose-600 dark:text-rose-400 truncate my-0.5">
            {loading ? (
              <div className="h-5 sm:h-6 w-20 sm:w-24 bg-rose-100 dark:bg-rose-900/40 rounded-md animate-pulse"></div>
            ) : (
              formatVND(summary?.no_tang_trong_ky)
            )}
          </div>
          <div className="hidden sm:block text-[10px] text-rose-500/80 dark:text-rose-400/70 truncate">
            Tổng giá trị đơn nhập kho (REI)
          </div>
        </div>

        {/* 4. Nợ cuối kỳ */}
        <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border-2 border-indigo-300/80 dark:border-indigo-700/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs hover:border-indigo-400 transition-all flex flex-col justify-between relative group">
          <div className="flex items-center justify-between gap-1 mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wide truncate">
              Nợ cuối kỳ
            </span>
            <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shrink-0">
              = Còn nợ
            </span>
          </div>
          <div className="text-xs sm:text-base lg:text-lg font-extrabold font-mono text-indigo-900 dark:text-indigo-200 truncate my-0.5">
            {loading ? (
              <div className="h-5 sm:h-6 w-24 sm:w-28 bg-indigo-200 dark:bg-indigo-800 rounded-md animate-pulse"></div>
            ) : (
              formatVND(summary?.no_cuoi_ky)
            )}
          </div>
          <div className="hidden sm:block text-[10px] text-indigo-600/90 dark:text-indigo-400/80 truncate font-medium">
            Đầu kỳ + Giảm trong kỳ − Tăng trong kỳ
          </div>
        </div>
      </div>
    </div>
  );
}
