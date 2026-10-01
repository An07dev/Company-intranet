"use client";

import React, { useState } from "react";

interface StatusItem {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface AttendanceDonutChartProps {
  data: StatusItem[];
  totalEmployees: number;
  attendanceRate: number;
}

export function AttendanceDonutChart({
  data,
  totalEmployees,
  attendanceRate,
}: AttendanceDonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const radius = 64;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  // Tính stroke-dasharray và stroke-dashoffset cho từng lát
  let accumulatedPercent = 0;
  const segments = data.map((item, idx) => {
    const fraction = totalEmployees > 0 ? item.count / totalEmployees : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += fraction;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      isHovered: hoveredIdx === idx,
    };
  });

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
            Tỷ lệ Hôm Nay
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono font-medium">
            {totalEmployees} nhân sự
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Phân bổ trạng thái đi làm đúng giờ, đi muộn và nghỉ hôm nay
        </p>
      </div>

      {/* SVG Donut Circle */}
      <div className="my-5 flex flex-col items-center justify-center relative">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            {/* Vòng nền xám nhẹ */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              className="stroke-zinc-100 dark:stroke-zinc-800"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Các phân đoạn màu */}
            {segments.map((seg, idx) => (
              <circle
                key={seg.label}
                cx="80"
                cy="80"
                r={radius}
                stroke={seg.color}
                strokeWidth={seg.isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))}
          </svg>

          {/* Vùng tâm hiển thị chỉ số chính */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
              {hoveredIdx !== null ? `${data[hoveredIdx].percentage}%` : `${attendanceRate}%`}
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              {hoveredIdx !== null ? data[hoveredIdx].label : "Có mặt hôm nay"}
            </span>
          </div>
        </div>
      </div>

      {/* Chú giải chi tiết với số lượng và tỷ lệ */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        {data.map((item, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={item.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`p-2 rounded-lg transition-all cursor-pointer border ${
                isHovered
                  ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700 shadow-xs"
                  : "bg-zinc-50/50 dark:bg-zinc-950/40 border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                  {item.label}
                </span>
              </div>
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {item.count}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {item.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
