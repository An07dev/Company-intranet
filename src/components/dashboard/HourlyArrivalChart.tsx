"use client";

import React from "react";

interface HourlyItem {
  timeSlot: string;
  count: number;
  percentage: number;
}

interface HourlyArrivalChartProps {
  data: HourlyItem[];
  totalPresent: number;
}

export function HourlyArrivalChart({ data, totalPresent }: HourlyArrivalChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
            Khung Giờ Check-in
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-medium">
            {totalPresent} đã chấm công
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Phân bố thời điểm nhân viên check-in vào làm việc trong ngày
        </p>
      </div>

      {/* Cột phân bố khung giờ */}
      <div className="flex items-end justify-between gap-2 sm:gap-4 h-44 pt-6 pb-2 my-2">
        {data.map((item, idx) => {
          const heightPct = Math.round((item.count / maxCount) * 100);
          const isLateSlot = idx >= 3;

          return (
            <div key={item.timeSlot} className="flex-1 flex flex-col items-center h-full justify-end group">
              {/* Số lượng trên cột */}
              <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 mb-1 group-hover:scale-110 transition-transform">
                {item.count}
              </span>

              {/* Cột biểu đồ */}
              <div className="w-full max-w-[36px] bg-zinc-100 dark:bg-zinc-800 rounded-t-lg h-full flex flex-col justify-end overflow-hidden p-0.5">
                <div
                  style={{ height: `${Math.max(heightPct, 8)}%` }}
                  className={`w-full rounded-t-md transition-all duration-500 ${
                    isLateSlot
                      ? "bg-amber-500 group-hover:bg-amber-400"
                      : "bg-emerald-500 group-hover:bg-emerald-400"
                  }`}
                  title={`${item.timeSlot}: ${item.count} nhân viên (${item.percentage}%)`}
                />
              </div>

              {/* Tên khung giờ */}
              <span className="mt-2 text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 text-center leading-tight truncate w-full">
                {item.timeSlot}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Đúng giờ quy định (&lt; 08:00)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Muộn (&gt; 08:00)
        </span>
      </div>
    </div>
  );
}
