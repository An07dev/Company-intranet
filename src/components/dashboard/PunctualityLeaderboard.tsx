"use client";

import React from "react";
import Link from "next/link";

interface LeaderboardMember {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  avatarUrl?: string;
  onTimeCount: number;
  totalCheckins: number;
  punctualityRate: number;
  rank: number;
  badge: string;
}

interface PunctualityLeaderboardProps {
  data?: LeaderboardMember[];
}

export function PunctualityLeaderboard({ data = [] }: PunctualityLeaderboardProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span>🏆</span>
          <span>Bảng Vinh Danh Chuyên Cần</span>
        </h3>
        <p className="text-xs text-zinc-400 mt-2">Chưa có đủ dữ liệu xếp hạng trong tháng này.</p>
      </div>
    );
  }

  const top1 = data.find((d) => d.rank === 1);
  const top2 = data.find((d) => d.rank === 2);
  const top3 = data.find((d) => d.rank === 3);
  const others = data.filter((d) => d.rank > 3);

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center text-lg shadow-xs">
            🏆
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Bảng Vinh Danh Chuyên Cần Tháng</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-semibold uppercase tracking-wider">
                Top Gương Mẫu
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Tuyên dương các nhân sự có tỷ lệ đi làm đúng giờ và tính kỷ luật cao nhất đơn vị
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
            Dữ liệu tháng hiện tại
          </span>
          <Link
            href="/dashboard/attendance"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
          >
            Sổ chấm công →
          </Link>
        </div>
      </div>

      {/* Main Content: Podium Top 3 + Danh sách Top 4 & 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* PODIUM TOP 3 (chiếm 8 cột trên Desktop) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          {/* TOP 2 (BẠC) */}
          {top2 ? (
            <div className="order-2 sm:order-1 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-linear-to-b from-slate-50 dark:from-slate-900/40 to-white dark:to-zinc-900 flex flex-col items-center text-center relative shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 shadow-xs flex items-center gap-1 font-mono">
                <span>🥈 Hạng 2</span>
              </div>

              <div className="relative mt-2 mb-2">
                {top2.avatarUrl ? (
                  <img
                    src={top2.avatarUrl}
                    alt={top2.name}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-300 dark:ring-slate-700 shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-600 text-white font-bold flex items-center justify-center text-base shadow-xs">
                    {top2.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 text-base">🥈</span>
              </div>

              <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm truncate w-full">
                {top2.name}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate w-full">
                {top2.employeeCode} • {top2.department}
              </div>

              <div className="mt-2.5 px-2 py-1 rounded-lg bg-white dark:bg-zinc-800/80 border border-slate-200/80 dark:border-slate-700/60 w-full">
                <div className="text-base font-extrabold font-mono text-slate-700 dark:text-slate-300">
                  {top2.punctualityRate}%
                </div>
                <div className="text-[10px] text-zinc-400">
                  Đúng giờ: {top2.onTimeCount}/{top2.totalCheckins} ngày
                </div>
              </div>

              <span className="text-[10px] mt-2 font-medium text-slate-600 dark:text-slate-400">
                {top2.badge}
              </span>
            </div>
          ) : null}

          {/* TOP 1 (VÀNG - QUÁN QUÂN) */}
          {top1 ? (
            <div className="order-1 sm:order-2 p-4 sm:p-5 rounded-xl border-2 border-amber-400/90 dark:border-amber-500/80 bg-linear-to-b from-amber-500/15 via-amber-500/5 to-white dark:to-zinc-900 flex flex-col items-center text-center relative shadow-md hover:shadow-lg transition-all ring-2 ring-amber-400/20">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-extrabold bg-linear-to-r from-amber-400 to-amber-500 text-amber-950 shadow-xs flex items-center gap-1">
                <span>👑 QUÁN QUÂN</span>
              </div>

              <div className="relative mt-2 mb-2">
                {top1.avatarUrl ? (
                  <img
                    src={top1.avatarUrl}
                    alt={top1.name}
                    className="w-18 h-18 rounded-full object-cover ring-4 ring-amber-400 shadow-md"
                  />
                ) : (
                  <div className="w-18 h-18 rounded-full bg-amber-500 text-white font-extrabold flex items-center justify-center text-xl shadow-md">
                    {top1.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 text-2xl animate-bounce">🥇</span>
              </div>

              <div className="font-extrabold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base truncate w-full">
                {top1.name}
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300 font-mono mt-0.5 truncate w-full font-semibold">
                {top1.employeeCode} • {top1.department}
              </div>

              <div className="mt-3 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-300/80 dark:border-amber-600/50 w-full shadow-2xs">
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                  {top1.punctualityRate}%
                </div>
                <div className="text-[11px] text-amber-800 dark:text-amber-200 font-medium">
                  Đúng giờ: <strong>{top1.onTimeCount}</strong>/{top1.totalCheckins} ngày
                </div>
              </div>

              <span className="text-[11px] mt-2 font-bold text-amber-600 dark:text-amber-400">
                {top1.badge}
              </span>
            </div>
          ) : null}

          {/* TOP 3 (ĐỒNG) */}
          {top3 ? (
            <div className="order-3 p-3.5 sm:p-4 rounded-xl border border-amber-800/30 dark:border-amber-800/40 bg-linear-to-b from-amber-700/5 to-white dark:to-zinc-900 flex flex-col items-center text-center relative shadow-xs hover:border-amber-800/50 transition-all">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 shadow-xs flex items-center gap-1 font-mono">
                <span>🥉 Hạng 3</span>
              </div>

              <div className="relative mt-2 mb-2">
                {top3.avatarUrl ? (
                  <img
                    src={top3.avatarUrl}
                    alt={top3.name}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-700/50 shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-amber-700 text-white font-bold flex items-center justify-center text-base shadow-xs">
                    {top3.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 text-base">🥉</span>
              </div>

              <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm truncate w-full">
                {top3.name}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate w-full">
                {top3.employeeCode} • {top3.department}
              </div>

              <div className="mt-2.5 px-2 py-1 rounded-lg bg-white dark:bg-zinc-800/80 border border-amber-800/20 w-full">
                <div className="text-base font-extrabold font-mono text-amber-700 dark:text-amber-300">
                  {top3.punctualityRate}%
                </div>
                <div className="text-[10px] text-zinc-400">
                  Đúng giờ: {top3.onTimeCount}/{top3.totalCheckins} ngày
                </div>
              </div>

              <span className="text-[10px] mt-2 font-medium text-amber-800 dark:text-amber-400">
                {top3.badge}
              </span>
            </div>
          ) : null}
        </div>

        {/* DANH SÁCH TOP TIẾP THEO (chiếm 4 cột trên Desktop) */}
        <div className="lg:col-span-4 flex flex-col justify-between p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/30 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
          <div>
            <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Top Kế Tiếp</span>
              <span className="text-[10px] font-mono text-zinc-400 font-normal">Hạng 4 &amp; 5</span>
            </div>

            {others.length === 0 ? (
              <div className="text-xs text-zinc-400 italic py-4 text-center">
                Đang cập nhật thêm thành tích...
              </div>
            ) : (
              <div className="space-y-2">
                {others.map((member) => (
                  <div
                    key={member.id}
                    className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between gap-2.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-center font-mono font-bold text-xs text-zinc-400 shrink-0">
                        #{member.rank}
                      </span>
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {member.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                          {member.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate font-mono">
                          {member.department}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {member.punctualityRate}%
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {member.onTimeCount}d đúng
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>🎯</span> Tiêu chí: Tỷ lệ đúng giờ tháng
            </span>
            <span className="font-mono text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
              Mốc: 08:00
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
