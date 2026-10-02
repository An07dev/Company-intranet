"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { LoadingSection } from "@/components/ui/Loading";
import { AttendanceTrendChart } from "@/components/dashboard/AttendanceTrendChart";
import { AttendanceDonutChart } from "@/components/dashboard/AttendanceDonutChart";
import { TaskProgressChart } from "@/components/dashboard/TaskProgressChart";
import { PunctualityLeaderboard } from "@/components/dashboard/PunctualityLeaderboard";
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

          {/* Hàng biểu đồ 2: Tiến độ Công việc & Dự án */}
          <div>
            <TaskProgressChart data={statsData.taskStats} />
          </div>

          {/* Hàng 3: Bảng Vinh Danh Chuyên Cần & Gương Mẫu Tháng */}
          <div>
            <PunctualityLeaderboard data={statsData.punctualityLeaderboard} />
          </div>


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
