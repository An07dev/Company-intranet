"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { LoadingSection } from "@/components/ui/Loading";
import { AttendanceTrendChart } from "@/components/dashboard/AttendanceTrendChart";
import { AttendanceDonutChart } from "@/components/dashboard/AttendanceDonutChart";
import { EmployeeAttendanceTable } from "@/components/dashboard/EmployeeAttendanceTable";
import { DashboardStatsResponse } from "@/app/api/dashboard/stats/route";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [statsData, setStatsData] = useState<DashboardStatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Điều hướng nếu chưa đăng nhập
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  // Tải dữ liệu thống kê Dashboard
  const fetchDashboardStats = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/dashboard/stats");
      const json = await res.json();
      if (json.success && json.data) {
        setStatsData(json.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải thống kê dashboard:", err);
    } finally {
      setLoadingStats(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user, fetchDashboardStats]);

  if (isLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSection text="Đang đồng bộ phiên làm việc của bạn..." size="lg" />
      </div>
    );
  }

  // Lời chào theo giờ trong ngày
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Chào buổi sáng"
      : currentHour < 18
        ? "Chào buổi chiều"
        : "Chào buổi tối";

  const todayDisplay = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());

  const summary = statsData?.summary || {
    totalEmployees: 0,
    presentToday: 0,
    onTimeToday: 0,
    lateToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    onTimeRate: 0,
    avgWorkingHours: 8.0,
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* =========================================================================
          1. HEADER TỔNG QUAN DASHBOARD
         ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Bảng Điều Khiển Tổng Hợp</span>
            <span className="text-zinc-300 dark:text-zinc-600">•</span>
            <span className="font-mono text-zinc-500 dark:text-zinc-400 capitalize">{todayDisplay}</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {greeting}, {user.name}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Báo cáo trực quan dữ liệu chấm công, tỷ lệ đi làm &amp; nghỉ phép của toàn thể nhân sự.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchDashboardStats}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
            title="Làm mới số liệu"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? "Đang tải..." : "Làm mới"}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. HÀNG 5 THẺ CHỈ SỐ KPI CHÍNH
         ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Tổng nhân sự */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Tổng nhân sự
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-zinc-900 dark:text-zinc-100">
            {summary.totalEmployees}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 flex items-center gap-1 truncate">
            <span>Đang hoạt động trong hệ thống</span>
          </div>
        </div>

        {/* Card 2: Đi làm hôm nay */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Đi làm hôm nay
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
            {summary.presentToday}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center justify-between">
            <span>Đúng giờ: <strong>{summary.onTimeToday}</strong></span>
            <span className="text-emerald-600 font-mono font-bold">{summary.attendanceRate}%</span>
          </div>
        </div>

        {/* Card 3: Đi muộn hôm nay */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 font-semibold">
              Đi muộn hôm nay
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-amber-600 dark:text-amber-400">
            {summary.lateToday}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {summary.lateToday > 0 ? "Sau khung giờ 08:00" : "Không có ai đi muộn"}
          </div>
        </div>

        {/* Card 4: Nghỉ / Vắng hôm nay */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 font-semibold">
              Nghỉ / Chưa đến
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-rose-600 dark:text-rose-400">
            {summary.absentToday}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {summary.absentToday > 0 ? "Chưa thực hiện check-in" : "Đầy đủ 100% nhân sự"}
          </div>
        </div>

        {/* Card 5: Tỷ lệ chuyên cần */}
        <div className="col-span-2 lg:col-span-1 p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Tỷ lệ chuyên cần
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1 text-zinc-900 dark:text-zinc-100">
            {summary.attendanceRate}%
          </div>
          {/* Thanh mini progress */}
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              style={{ width: `${summary.attendanceRate}%` }}
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. CÁC BIỂU ĐỒ THỐNG KÊ (CHARTS SECTION)
         ========================================================================= */}
      {loadingStats ? (
        <div className="p-12 text-center">
          <LoadingSection text="Đang xử lý dữ liệu và tạo biểu đồ chuyên cần..." size="md" />
        </div>
      ) : statsData ? (
        <div className="space-y-5 sm:space-y-6">
          {/* Hàng biểu đồ 1: Xu hướng 7 ngày (60%) + Donut tỷ lệ hôm nay (40%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            <div className="lg:col-span-7">
              <AttendanceTrendChart data={statsData.weeklyTrend} />
            </div>
            <div className="lg:col-span-5">
              <AttendanceDonutChart
                data={statsData.statusBreakdown}
                totalEmployees={summary.totalEmployees}
                attendanceRate={summary.attendanceRate}
              />
            </div>
          </div>

          {/* Hàng biểu đồ 2: Tỷ lệ theo phòng ban (50%) + Khung giờ check-in (50%) */}


          {/* =========================================================================
              4. DỮ LIỆU & DANH SÁCH NHÂN VIÊN (EMPLOYEE DIRECTORY & ATTENDANCE)
             ========================================================================= */}
          <div>
            <EmployeeAttendanceTable employees={statsData.employeeAttendance} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
