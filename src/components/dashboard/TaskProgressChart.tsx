"use client";

import React, { useState } from "react";
import Link from "next/link";

interface TaskDeptItem {
  department: string;
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  progressRate: number;
}

interface TaskStatsData {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  completed: number;
  overdue: number;
  completionRate: number;
  byDepartment: TaskDeptItem[];
}

interface TaskProgressChartProps {
  data?: TaskStatsData;
}

export function TaskProgressChart({ data }: TaskProgressChartProps) {
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);

  if (!data || data.total === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>📊</span>
            <span>Tiến Độ Công Việc &amp; Dự Án</span>
          </h3>
          <Link
            href="/dashboard/tasks"
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            Quản lý việc →
          </Link>
        </div>
        <div className="h-44 flex items-center justify-center text-xs text-zinc-400">
          Chưa có dữ liệu công việc trong hệ thống
        </div>
      </div>
    );
  }

  const {
    total,
    todo,
    inProgress,
    review,
    completed,
    overdue,
    completionRate,
    byDepartment = [],
  } = data;

  const completedPct = total > 0 ? (completed / total) * 100 : 0;
  const inProgressPct = total > 0 ? (inProgress / total) * 100 : 0;
  const reviewPct = total > 0 ? (review / total) * 100 : 0;
  const todoPct = total > 0 ? (todo / total) * 100 : 0;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              📊
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Tiến Độ Công Việc &amp; Dự Án</span>
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Hiệu suất thực hiện và tỷ lệ hoàn tất nhiệm vụ toàn đơn vị
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              {completionRate}% hoàn tất
            </span>
            <Link
              href="/dashboard/tasks"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline hidden sm:inline"
            >
              Chi tiết →
            </Link>
          </div>
        </div>

        {/* 4 Mini KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
          <div className="p-2 sm:p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/60 text-center">
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>Chờ làm</span>
            </div>
            <div className="text-base sm:text-lg font-extrabold font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">
              {todo}
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-center">
            <div className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>Đang làm</span>
            </div>
            <div className="text-base sm:text-lg font-extrabold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              {inProgress}
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-center">
            <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Chờ duyệt</span>
            </div>
            <div className="text-base sm:text-lg font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {review}
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-center">
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Đã xong</span>
            </div>
            <div className="text-base sm:text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {completed}
            </div>
          </div>
        </div>

        {/* Thanh Multi-segment Progress Bar Tổng Quát */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
              Tổng quan {total} công việc:
            </span>
            {overdue > 0 ? (
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                {overdue} việc quá hạn
              </span>
            ) : (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Đúng tiến độ
              </span>
            )}
          </div>

          <div className="w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${completedPct}%` }}
              className="h-full bg-emerald-500 transition-all duration-500 hover:brightness-110"
              title={`Đã hoàn thành: ${completed} (${Math.round(completedPct)}%)`}
            />
            <div
              style={{ width: `${inProgressPct}%` }}
              className="h-full bg-blue-500 transition-all duration-500 hover:brightness-110"
              title={`Đang thực hiện: ${inProgress} (${Math.round(inProgressPct)}%)`}
            />
            <div
              style={{ width: `${reviewPct}%` }}
              className="h-full bg-amber-400 transition-all duration-500 hover:brightness-110"
              title={`Chờ duyệt: ${review} (${Math.round(reviewPct)}%)`}
            />
            <div
              style={{ width: `${todoPct}%` }}
              className="h-full bg-zinc-300 dark:bg-zinc-600 transition-all duration-500 hover:brightness-110"
              title={`Chờ làm: ${todo} (${Math.round(todoPct)}%)`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 pt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Hoàn thành
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Đang làm
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Chờ duyệt
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" /> Chưa làm
            </span>
          </div>
        </div>
      </div>

      {/* Tiến độ theo từng phòng ban */}
      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
        <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Tiến độ theo phòng ban
        </div>

        {byDepartment.length === 0 ? (
          <div className="text-xs text-zinc-400 text-center py-2">
            Không có phân bổ theo phòng ban
          </div>
        ) : (
          byDepartment.map((d) => {
            const isHovered = hoveredDept === d.department;
            return (
              <div
                key={d.department}
                onMouseEnter={() => setHoveredDept(d.department)}
                onMouseLeave={() => setHoveredDept(null)}
                className={`p-2 rounded-lg transition-colors ${
                  isHovered ? "bg-zinc-50 dark:bg-zinc-800/60" : ""
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate pr-2">
                    {d.department}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-zinc-500">
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {d.completed}
                      </strong>
                      /{d.total} việc
                    </span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 min-w-[36px] text-right">
                      {d.progressRate}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    style={{ width: `${d.progressRate}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      d.progressRate >= 80
                        ? "bg-emerald-500"
                        : d.progressRate >= 50
                        ? "bg-blue-500"
                        : "bg-amber-500"
                    }`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
