"use client";

import React from "react";

interface DebtStatsCardsProps {
  summary: {
    totalDebtAmount: number;
    totalDebtOrders: number;
    totalDebtors: number;
    overdue30DaysCount: number;
    overdue60DaysCount: number;
    partialCount: number;
    pendingCount: number;
    cancelledDebtAmount: number;
    cancelledDebtOrders: number;
    includeCancelled: boolean;
  } | null;
  loading: boolean;
  includeCancelled: boolean;
  onToggleIncludeCancelled: (val: boolean) => void;
}

export function DebtStatsCards({
  summary,
  loading,
  includeCancelled,
  onToggleIncludeCancelled,
}: DebtStatsCardsProps) {
  const formatVND = (num: number) => {
    return (num || 0).toLocaleString("vi-VN") + " ₫";
  };

  return (
    <div className="space-y-3">
      {/* Thanh tùy chọn tính toán & cảnh báo */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-2.5 sm:px-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium">
            Phạm vi công nợ:{" "}
            <strong className="text-zinc-900 dark:text-white">
              {includeCancelled ? "Bao gồm cả đơn đã hủy" : "Chỉ đơn hàng thực tế (Đang giao / Đã giao)"}
            </strong>
          </span>
          {summary?.cancelledDebtOrders ? (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
              (Đã bóc tách {summary.cancelledDebtOrders.toLocaleString("vi-VN")} đơn hủy: ~{formatVND(summary.cancelledDebtAmount)})
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onToggleIncludeCancelled(!includeCancelled)}
          className={`px-3 py-1.5 rounded-xl font-medium text-xs transition-colors cursor-pointer flex items-center gap-1.5 border ${
            includeCancelled
              ? "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200"
              : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
          }`}
        >
          <span>⚙️</span>
          <span>{includeCancelled ? "Đang tính cả đơn hủy" : "Đang loại trừ đơn hủy"}</span>
        </button>
      </div>

      {/* Grid 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Tổng nợ */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs relative overflow-hidden group hover:border-rose-400 dark:hover:border-rose-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Tổng nợ phải thu
            </span>
            <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/70 dark:border-rose-900 flex items-center justify-center text-rose-600 text-base">
              💳
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 tracking-tight">
            {loading ? (
              <span className="inline-block w-32 h-7 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            ) : (
              formatVND(summary?.totalDebtAmount || 0)
            )}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 flex items-center gap-1.5">
            <span>📦</span>
            <span>
              <strong>{(summary?.totalDebtOrders || 0).toLocaleString("vi-VN")}</strong> đơn hàng còn dư nợ
            </span>
          </div>
        </div>

        {/* Card 2: Khách hàng nợ */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs relative overflow-hidden group hover:border-blue-400 dark:hover:border-blue-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Khách hàng nợ
            </span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-900 flex items-center justify-center text-blue-600 text-base">
              👥
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-white tracking-tight">
            {loading ? (
              <span className="inline-block w-20 h-7 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            ) : (
              (summary?.totalDebtors || 0).toLocaleString("vi-VN")
            )}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 flex items-center gap-1.5">
            <span>🏷️</span>
            <span>
              Gồm <strong>{summary?.partialCount || 0}</strong> đơn trả 1 phần, <strong>{summary?.pendingCount || 0}</strong> đơn nợ 100%
            </span>
          </div>
        </div>

        {/* Card 3: Nợ quá hạn 30 ngày */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs relative overflow-hidden group hover:border-amber-400 dark:hover:border-amber-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Quá hạn &gt; 30 ngày
            </span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-900 flex items-center justify-center text-amber-600 text-base">
              ⏳
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 tracking-tight">
            {loading ? (
              <span className="inline-block w-16 h-7 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            ) : (
              `${(summary?.overdue30DaysCount || 0).toLocaleString("vi-VN")} đơn`
            )}
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1.5 font-medium flex items-center gap-1">
            <span>⚠️</span>
            <span>Cần lên lịch gửi Zalo / gọi điện đối soát</span>
          </div>
        </div>

        {/* Card 4: Nợ quá hạn 60 ngày */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs relative overflow-hidden group hover:border-purple-400 dark:hover:border-purple-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Quá hạn &gt; 60 ngày
            </span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/70 dark:border-purple-900 flex items-center justify-center text-purple-600 text-base">
              🚨
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 tracking-tight">
            {loading ? (
              <span className="inline-block w-16 h-7 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            ) : (
              `${(summary?.overdue60DaysCount || 0).toLocaleString("vi-VN")} đơn`
            )}
          </div>
          <div className="text-[11px] text-purple-700 dark:text-purple-300 mt-1.5 font-medium flex items-center gap-1">
            <span>🛡️</span>
            <span>Khoản nợ lâu ngày cần kế toán xử lý dứt điểm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
