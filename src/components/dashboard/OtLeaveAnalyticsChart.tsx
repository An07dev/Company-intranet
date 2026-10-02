"use client";

import React from "react";
import Link from "next/link";

interface OtDeptItem {
  department: string;
  hours: number;
}

interface LeaveTypeItem {
  type: string;
  label: string;
  days: number;
  color: string;
}

interface AnalyticsOtLeaveData {
  totalOtHoursMonth: number;
  approvedLeaveDaysMonth: number;
  otByDepartment: OtDeptItem[];
  leaveByType: LeaveTypeItem[];
}

interface OtLeaveAnalyticsChartProps {
  data?: AnalyticsOtLeaveData;
}

export function OtLeaveAnalyticsChart({ data }: OtLeaveAnalyticsChartProps) {
  if (!data) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>⏳</span>
            <span>Làm Thêm (OT) &amp; Nghỉ Phép Tháng</span>
          </h3>
        </div>
        <div className="h-44 flex items-center justify-center text-xs text-zinc-400">
          Chưa có dữ liệu đơn từ tháng này
        </div>
      </div>
    );
  }

  const {
    totalOtHoursMonth = 0,
    approvedLeaveDaysMonth = 0,
    otByDepartment = [],
    leaveByType = [],
  } = data;

  const maxOtHours = Math.max(...otByDepartment.map((d) => d.hours), 1);
  const totalLeaveDays = leaveByType.reduce((sum, item) => sum + item.days, 0);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
              ⏳
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Làm Thêm (OT) &amp; Nghỉ Phép</span>
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Khối lượng OT và ngày nghỉ phép đã được Giám đốc duyệt
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/requests"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline shrink-0"
          >
            Duyệt đơn →
          </Link>
        </div>

        {/* 2 Thẻ Chỉ Số Nổi Bật */}
        <div className="grid grid-cols-2 gap-2.5 my-3">
          <div className="p-3 rounded-lg bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 dark:border-amber-900/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                Tổng giờ OT duyệt
              </span>
              <span className="text-sm">⚡</span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
              {totalOtHoursMonth}
              <span className="text-xs font-normal text-zinc-400 ml-1">giờ</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              Được tính hệ số theo quy định
            </div>
          </div>

          <div className="p-3 rounded-lg bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-200/80 dark:border-emerald-900/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                Ngày nghỉ phép duyệt
              </span>
              <span className="text-sm">🏖️</span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {approvedLeaveDaysMonth}
              <span className="text-xs font-normal text-zinc-400 ml-1">ngày</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              Toàn bộ các loại nghỉ phép
            </div>
          </div>
        </div>

        {/* Phân bổ Giờ OT theo Phòng ban */}
        <div className="space-y-2 mb-4">
          <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between">
            <span>Giờ OT theo phòng ban</span>
            <span className="text-[10px] text-zinc-400 font-normal">Tháng hiện tại</span>
          </div>

          {otByDepartment.length === 0 ? (
            <div className="text-xs text-zinc-400 italic py-1">
              Chưa có giờ làm thêm nào được ghi nhận trong tháng
            </div>
          ) : (
            otByDepartment.map((item) => {
              const barWidth = Math.round((item.hours / maxOtHours) * 100);
              return (
                <div key={item.department} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate pr-2">
                      {item.department}
                    </span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                      {item.hours}h
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      style={{ width: `${barWidth}%` }}
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Phân bổ các loại Nghỉ phép */}
      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
        <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between">
          <span>Cơ cấu các loại nghỉ phép</span>
          <span className="text-[10px] font-mono text-zinc-400">{totalLeaveDays} ngày</span>
        </div>

        {leaveByType.length === 0 ? (
          <div className="text-xs text-zinc-400 italic py-1">
            Không có đơn nghỉ phép nào trong tháng
          </div>
        ) : (
          <div className="space-y-2">
            {/* Multi-segment bar for leave types */}
            <div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
              {leaveByType.map((item) => {
                const pct = totalLeaveDays > 0 ? (item.days / totalLeaveDays) * 100 : 0;
                return (
                  <div
                    key={item.type}
                    style={{ width: `${pct}%`, backgroundColor: item.color }}
                    className="h-full transition-all duration-500 hover:brightness-110"
                    title={`${item.label}: ${item.days} ngày (${Math.round(pct)}%)`}
                  />
                );
              })}
            </div>

            {/* Legend list */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1">
              {leaveByType.map((item) => (
                <div key={item.type} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 truncate pr-1">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">
                    {item.days}d
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
