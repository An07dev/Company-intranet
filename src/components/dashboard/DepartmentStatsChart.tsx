"use client";

import React, { useState } from "react";

interface DeptItem {
  name: string;
  total: number;
  present: number;
  onTime: number;
  late: number;
  absent: number;
  rate: number;
}

interface DepartmentStatsChartProps {
  data: DeptItem[];
}

export function DepartmentStatsChart({ data }: DepartmentStatsChartProps) {
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-zinc-400">
        Không có dữ liệu phòng ban
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
            Tỷ lệ Theo Phòng Ban
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Mức độ chuyên cần và tỷ lệ có mặt theo từng đơn vị trực thuộc
          </p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-medium">
          {data.length} phòng ban
        </span>
      </div>

      {/* Danh sách các phòng ban với thanh Progress Bar */}
      <div className="space-y-3.5 my-2">
        {data.map((dept) => {
          const isHovered = hoveredDept === dept.name;

          // Màu sắc dựa trên tỷ lệ chuyên cần
          const barColor =
            dept.rate >= 80
              ? "bg-emerald-500"
              : dept.rate >= 60
                ? "bg-amber-500"
                : "bg-rose-500";

          const badgeColor =
            dept.rate >= 80
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : dept.rate >= 60
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";

          return (
            <div
              key={dept.name}
              onMouseEnter={() => setHoveredDept(dept.name)}
              onMouseLeave={() => setHoveredDept(null)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                isHovered
                  ? "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-700 shadow-2xs"
                  : "bg-transparent border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
              }`}
            >
              {/* Dòng tiêu đề phòng ban + tỷ lệ */}
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate pr-2">
                  {dept.name}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    <strong className="text-zinc-900 dark:text-zinc-100">{dept.present}</strong> /{" "}
                    {dept.total}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${badgeColor}`}>
                    {dept.rate}%
                  </span>
                </div>
              </div>

              {/* Thanh tỷ lệ có mặt */}
              <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
                <div
                  style={{ width: `${dept.rate}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                />
              </div>

              {/* Thống kê chi tiết nhỏ khi hover */}
              {isHovered && (
                <div className="mt-2 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-[11px] font-mono text-zinc-600 dark:text-zinc-400 animate-in fade-in duration-100">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ✓ Đúng giờ: {dept.onTime}
                  </span>
                  {dept.late > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      ⚠ Đi muộn: {dept.late}
                    </span>
                  )}
                  {dept.absent > 0 && (
                    <span className="text-rose-500 dark:text-rose-400">
                      ✗ Vắng/Nghỉ: {dept.absent}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer ghi chú */}
      <div className="text-[11px] text-zinc-400 dark:text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <span>Xanh: ≥ 80% (Tốt)</span>
        <span>Vàng: 60 - 79% (Cần lưu ý)</span>
        <span>Đỏ: &lt; 60% (Cảnh báo)</span>
      </div>
    </div>
  );
}
