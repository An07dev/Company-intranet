"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";

export interface LeaderboardMember {
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
  initialMonth?: string;
}

export function PunctualityLeaderboard({ data = [], initialMonth }: PunctualityLeaderboardProps) {
  // Xác định tháng hiện tại theo YYYY-MM
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || currentMonthStr);
  const [members, setMembers] = useState<LeaderboardMember[]>(data);
  const [monthLabel, setMonthLabel] = useState<string>(() => {
    const [y, m] = (initialMonth || currentMonthStr).split("-");
    return `Tháng ${m}/${y}`;
  });
  const [totalRanked, setTotalRanked] = useState<number>(data.length);
  const [totalCheckinsInMonth, setTotalCheckinsInMonth] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Danh sách 12 tháng gần nhất cho dropdown bộ lọc
  const monthOptions = useMemo(() => {
    const list: { value: string; label: string; isCurrent: boolean }[] = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mStr = String(d.getMonth() + 1).padStart(2, "0");
      const yStr = d.getFullYear();
      const isCurrent = ym === currentMonthStr;

      list.push({
        value: ym,
        label: isCurrent ? `Tháng ${mStr}/${yStr} (Hiện tại)` : `Tháng ${mStr}/${yStr}`,
        isCurrent,
      });
    }
    return list;
  }, [currentMonthStr]);

  // Cập nhật khi data prop từ dashboard cha thay đổi (nếu đang ở tháng hiện tại)
  useEffect(() => {
    if (data && selectedMonth === currentMonthStr) {
      setMembers(data);
      setTotalRanked(data.length);
    }
  }, [data, selectedMonth, currentMonthStr]);

  // Hàm gọi API lấy dữ liệu tháng đã chọn
  const fetchMonthData = useCallback(async (monthToFetch: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/dashboard/leaderboard?month=${monthToFetch}`);
      const json = await res.json();

      if (json.success && json.data) {
        setMembers(json.data.items || []);
        setMonthLabel(json.data.monthLabel || `Tháng ${monthToFetch.split("-")[1]}/${monthToFetch.split("-")[0]}`);
        setTotalRanked(json.data.totalRanked ?? 0);
        setTotalCheckinsInMonth(json.data.totalCheckinsInMonth ?? 0);
      } else {
        setErrorMessage(json.error || "Không thể tải dữ liệu vinh danh tháng");
      }
    } catch (err) {
      console.error("Lỗi khi tải bảng vinh danh tháng:", err);
      setErrorMessage("Lỗi kết nối khi tải bảng xếp hạng");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectMonth = (monthVal: string) => {
    if (monthVal === selectedMonth) return;
    setSelectedMonth(monthVal);
    fetchMonthData(monthVal);
  };

  const handleShiftMonth = (delta: number) => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const targetDate = new Date(y, m - 1 + delta, 1);
    const targetYm = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;

    // Không chuyển sang các tháng trong tương lai
    if (targetYm > currentMonthStr) return;

    setSelectedMonth(targetYm);
    fetchMonthData(targetYm);
  };

  const isCurrentMonth = selectedMonth === currentMonthStr;
  const isFutureMonth = selectedMonth >= currentMonthStr;

  const top1 = members.find((d) => d.rank === 1);
  const top2 = members.find((d) => d.rank === 2);
  const top3 = members.find((d) => d.rank === 3);
  const others = members.filter((d) => d.rank > 3);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs transition-all">
      {/* Header with Title and Month Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        {/* Left: Title & Subtitle */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 via-amber-500 to-amber-600 text-white flex items-center justify-center text-xl shadow-xs shrink-0 ring-2 ring-amber-400/20">
            🏆
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Bảng Vinh Danh Chuyên Cần Tháng
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-semibold tracking-wide flex items-center gap-1">
                <span>⭐</span> {monthLabel}
              </span>
              {isCurrentMonth && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-medium">
                  Hiện tại
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Tuyên dương các nhân sự có tỷ lệ đi làm đúng giờ và tính kỷ luật cao nhất đơn vị
            </p>
          </div>
        </div>

        {/* Right: Month Selector Dropdown & Quick Navigation */}
        <div className="flex items-center flex-wrap gap-2 self-start md:self-auto">
          {/* Month Stepper & Dropdown */}
          <div className="flex items-center bg-zinc-50 dark:bg-zinc-800/80 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
            {/* Prev month button */}
            <button
              type="button"
              onClick={() => handleShiftMonth(-1)}
              title="Tháng trước"
              className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-700 rounded-md transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Dropdown Select */}
            <div className="relative flex items-center">
              <span className="absolute left-2 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => handleSelectMonth(e.target.value)}
                disabled={isLoading}
                aria-label="Chọn tháng xếp hạng"
                className="appearance-none bg-transparent text-xs font-semibold text-zinc-800 dark:text-zinc-200 pl-7 pr-7 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
              >
                {monthOptions.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 py-1"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="absolute right-1.5 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>

            {/* Next month button */}
            <button
              type="button"
              onClick={() => handleShiftMonth(1)}
              disabled={isFutureMonth || isLoading}
              title={isFutureMonth ? "Không thể xem tháng tương lai" : "Tháng sau"}
              className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-700 rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Quick jump to current month button when viewing history */}
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => handleSelectMonth(currentMonthStr)}
              className="px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              Về tháng này
            </button>
          )}

          {/* Sổ chấm công link */}
          <Link
            href="/dashboard/attendance"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline ml-1"
          >
            Sổ chấm công →
          </Link>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="mt-3 p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => fetchMonthData(selectedMonth)}
            className="underline font-semibold hover:text-rose-700 dark:hover:text-rose-300 ml-2"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading overlay state */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Đang tải dữ liệu xếp hạng {monthLabel}...
          </span>
        </div>
      ) : members.length === 0 ? (
        /* Empty state */
        <div className="py-12 px-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center text-2xl mb-3 border border-amber-200/80 dark:border-amber-800 shadow-2xs">
            📅
          </div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Không có dữ liệu chấm công cho {monthLabel}
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
            Chưa có lượt điểm danh nào được ghi nhận trong tháng này để tính toán xếp hạng chuyên cần. Vui lòng chọn một tháng khác có dữ liệu hoạt động.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={() => handleSelectMonth(currentMonthStr)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition-colors cursor-pointer"
              >
                <span>← Quay về tháng hiện tại</span>
              </button>
            )}
            <Link
              href="/dashboard/attendance"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Xem sổ điểm danh
            </Link>
          </div>
        </div>
      ) : (
        /* Main Content: Podium Top 3 + Danh sách Top 4 & 5 */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
          {/* PODIUM TOP 3 (chiếm 8 cột trên Desktop) */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            {/* TOP 2 (BẠC) */}
            {top2 ? (
              <div className="order-2 sm:order-1 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-linear-to-b from-slate-50 dark:from-slate-900/40 to-white dark:to-zinc-900 flex flex-col items-center text-center relative shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 shadow-xs flex items-center gap-1 font-mono">
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

                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm truncate w-full" title={top2.name}>
                  {top2.name}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate w-full" title={`${top2.employeeCode} • ${top2.department}`}>
                  {top2.employeeCode} • {top2.department}
                </div>

                <div className="mt-2.5 px-2 py-1 rounded-lg bg-white dark:bg-zinc-800/80 border border-slate-200/80 dark:border-slate-700/60 w-full">
                  <div className="text-base font-extrabold font-mono text-slate-700 dark:text-slate-300">
                    {top2.punctualityRate}%
                  </div>
                  <div className="text-[10px] text-zinc-400 font-medium">
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

                <div className="font-extrabold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base truncate w-full" title={top1.name}>
                  {top1.name}
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-300 font-mono mt-0.5 truncate w-full font-semibold" title={`${top1.employeeCode} • ${top1.department}`}>
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
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 shadow-xs flex items-center gap-1 font-mono">
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

                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm truncate w-full" title={top3.name}>
                  {top3.name}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate w-full" title={`${top3.employeeCode} • ${top3.department}`}>
                  {top3.employeeCode} • {top3.department}
                </div>

                <div className="mt-2.5 px-2 py-1 rounded-lg bg-white dark:bg-zinc-800/80 border border-amber-800/20 w-full">
                  <div className="text-base font-extrabold font-mono text-amber-700 dark:text-amber-300">
                    {top3.punctualityRate}%
                  </div>
                  <div className="text-[10px] text-zinc-400 font-medium">
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
                <div className="text-xs text-zinc-400 italic py-6 text-center">
                  Không còn nhân sự khác có điểm danh trong tháng.
                </div>
              ) : (
                <div className="space-y-2">
                  {others.map((member) => (
                    <div
                      key={member.id}
                      className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between gap-2.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-2xs"
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
                          <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate" title={member.name}>
                            {member.name}
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate font-mono" title={member.department}>
                            {member.department}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {member.punctualityRate}%
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {member.onTimeCount}/{member.totalCheckins} ngày
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom summary and criteria note */}
            <div className="pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 font-medium">
                  <span>🎯</span> Tiêu chí: Đúng giờ / Tổng check-in
                </span>
                <span className="font-mono text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Mốc: 08:00
                </span>
              </div>
              {totalRanked > 0 && (
                <div className="text-[10px] text-zinc-400 text-right font-mono">
                  Tổng hợp {totalCheckinsInMonth ? `${totalCheckinsInMonth} lượt chấm công (` : ""}{totalRanked} nhân sự{totalCheckinsInMonth ? ")" : ""}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
