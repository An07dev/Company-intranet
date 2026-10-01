"use client";

import React, { useState } from "react";

interface TrendItem {
  date: string;
  label: string;
  weekday: string;
  total: number;
  present: number;
  onTime: number;
  late: number;
  absent: number;
  rate: number;
}

interface AttendanceTrendChartProps {
  data: TrendItem[];
}

export function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-zinc-400">
        Không có dữ liệu xu hướng
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.total), 12);
  const chartHeight = 180;
  const chartWidth = 560;
  const paddingX = 40;
  const usableWidth = chartWidth - paddingX * 2;
  const stepX = data.length > 1 ? usableWidth / (data.length - 1) : usableWidth;

  // Tọa độ cho Line Chart
  const points = data.map((d, i) => {
    const x = paddingX + i * stepX;
    const y = chartHeight - (d.present / maxVal) * (chartHeight - 30) - 15;
    return { x, y, ...d };
  });

  // Tạo đường cong Bezier mượt mà
  const linePath = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, "");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      {/* Header Biểu đồ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              Xu hướng Đi làm & Nghỉ
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium">
              7 ngày qua
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            So sánh tỷ lệ nhân viên có mặt (đúng giờ, đi muộn) và vắng mặt / nghỉ phép
          </p>
        </div>

        {/* Nút chuyển đổi kiểu biểu đồ */}
        <div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setChartType("bar")}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              chartType === "bar"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Cột chồng</span>
          </button>
          <button
            type="button"
            onClick={() => setChartType("line")}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              chartType === "line"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>Đường xu hướng</span>
          </button>
        </div>
      </div>

      {/* Chú giải Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs mb-3 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
          <span className="text-zinc-600 dark:text-zinc-300">Đúng giờ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
          <span className="text-zinc-600 dark:text-zinc-300">Đi muộn</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-rose-400 dark:bg-rose-500" />
          <span className="text-zinc-600 dark:text-zinc-300">Nghỉ / Vắng</span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full overflow-hidden">
        {chartType === "bar" ? (
          /* ================= KIỂU CỘT CHỒNG (STACKED BARS) ================= */
          <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-52 pt-4 pb-2 px-1">
            {data.map((item, idx) => {
              const total = Math.max(1, item.total);
              const safeRate = Math.min(100, Math.max(0, item.rate));
              const onTimePct = Math.min(100, (item.onTime / total) * 100);
              const latePct = Math.min(100 - onTimePct, (item.late / total) * 100);
              const absentPct = Math.max(0, 100 - onTimePct - latePct);
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={item.date}
                  className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Nhãn tỷ lệ trên đầu cột */}
                  <div
                    className={`text-[10px] font-mono font-bold mb-1 transition-all ${
                      isHovered
                        ? "text-emerald-600 dark:text-emerald-400 scale-110"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {safeRate}%
                  </div>

                  {/* Thanh cột chồng 3 màu */}
                  <div
                    className={`w-full max-w-[36px] sm:max-w-[48px] rounded-lg overflow-hidden flex flex-col-reverse transition-all duration-200 border ${
                      isHovered
                        ? "ring-2 ring-emerald-500/80 shadow-md scale-102 border-transparent"
                        : "border-zinc-200/60 dark:border-zinc-800"
                    }`}
                    style={{ height: "135px" }}
                  >
                    {/* Phần 1: Đúng giờ (Xanh lá) */}
                    <div
                      style={{ height: `${onTimePct}%` }}
                      className="w-full bg-emerald-500 transition-all duration-300 hover:brightness-105"
                      title={`Đúng giờ: ${item.onTime} nhân viên`}
                    />
                    {/* Phần 2: Đi muộn (Vàng cam) */}
                    {item.late > 0 && (
                      <div
                        style={{ height: `${latePct}%` }}
                        className="w-full bg-amber-500 transition-all duration-300 hover:brightness-105"
                        title={`Đi muộn: ${item.late} nhân viên`}
                      />
                    )}
                    {/* Phần 3: Nghỉ / Vắng (Đỏ hồng) */}
                    {item.absent > 0 && (
                      <div
                        style={{ height: `${absentPct}%` }}
                        className="w-full bg-rose-400 dark:bg-rose-500/80 transition-all duration-300 hover:brightness-105"
                        title={`Nghỉ/Vắng: ${item.absent} nhân viên`}
                      />
                    )}
                  </div>

                  {/* Nhãn ngày bên dưới */}
                  <div className="mt-2 text-center">
                    <span className="block text-[11px] font-mono font-medium text-zinc-900 dark:text-zinc-200">
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-zinc-400 truncate">
                      {item.weekday.replace("Thứ ", "T")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ================= KIỂU ĐƯỜNG XU HƯỚNG (LINE/AREA CURVE) ================= */
          <div className="h-52 relative pt-2">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Đường kẻ ngang lưới */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chartHeight - ratio * (chartHeight - 30) - 15;
                return (
                  <line
                    key={ratio}
                    x1="0"
                    y1={y}
                    x2={chartWidth}
                    y2={y}
                    stroke="currentColor"
                    className="text-zinc-200 dark:text-zinc-800"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Miền màu chuyển sắc */}
              <path d={areaPath} fill="url(#areaGradient)" />

              {/* Đường cong dữ liệu */}
              <path
                d={linePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Các điểm mốc tròn */}
              {points.map((pt, i) => {
                const isHovered = hoveredIndex === i;
                return (
                  <g
                    key={pt.date}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : 4}
                      className="fill-white dark:fill-zinc-900 stroke-emerald-500 transition-all duration-150"
                      strokeWidth={isHovered ? 3 : 2}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Trục X ngày bên dưới */}
            <div className="flex justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-2 px-3">
              {data.map((item, idx) => (
                <div
                  key={item.date}
                  className={`text-center cursor-pointer transition-colors ${
                    hoveredIndex === idx ? "text-emerald-600 font-bold" : ""
                  }`}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div>{item.label}</div>
                  <div className="text-[10px] text-zinc-400">{item.weekday.replace("Thứ ", "T")}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating Tooltip khi rê chuột vào bất kỳ ngày nào */}
        {hoveredItem && (
          <div className="mt-3 p-3 rounded-lg bg-zinc-900 text-white dark:bg-zinc-800 border border-zinc-700 shadow-xl text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-100">
                {hoveredItem.weekday} ({hoveredItem.label}):
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500 text-white">
                Tỷ lệ đi làm {hoveredItem.rate}%
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-emerald-300">
                ✓ Đúng giờ: <strong>{hoveredItem.onTime}</strong>
              </span>
              <span className="text-amber-300">
                ⚠ Đi muộn: <strong>{hoveredItem.late}</strong>
              </span>
              <span className="text-rose-300">
                ✗ Nghỉ: <strong>{hoveredItem.absent}</strong>
              </span>
              <span className="text-zinc-400">
                / Tổng: {hoveredItem.total}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
