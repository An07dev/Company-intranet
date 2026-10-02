"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { UserRole } from "@/types";
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
  const [mobileTab, setMobileTab] = useState<"all" | "attendance" | "tasks" | "leaderboard" | "employees">("all");

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
    <div className="w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* =========================================================================
          1. HEADER TỔNG QUAN DASHBOARD
         ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-4 pb-2.5 sm:pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="space-y-1 sm:space-y-1.5 w-full md:w-auto">
          {/* Hàng 1: Badge Ngày tháng & Nút Làm Mới trên Mobile */}
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Bảng Điều Khiển</span>
              <span className="text-zinc-300 dark:text-zinc-600">•</span>
              <span className="font-mono text-zinc-500 dark:text-zinc-400 capitalize">{todayDisplay}</span>
            </div>

            {/* Nút Làm Mới hiển thị cùng hàng trên Mobile (tiết kiệm không gian) */}
            <div className="md:hidden">
              <button
                type="button"
                onClick={fetchDashboardStats}
                disabled={refreshing}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
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
                <span>{refreshing ? "..." : "Làm mới"}</span>
              </button>
            </div>
          </div>

          {/* Hàng 2: Lời chào buổi sáng */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {greeting}, {user.name}
            </h1>
            {user.role && !user.name.toLowerCase().includes((USER_ROLE_LABELS[user.role as UserRole] || user.role).toLowerCase()) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {USER_ROLE_LABELS[user.role as UserRole] || user.role}
              </span>
            )}
          </div>

          {/* Mô tả phụ: Ẩn trên mobile để giao diện thanh thoát, giữ nguyên trên Desktop */}
          <p className="hidden sm:block text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Báo cáo trực quan dữ liệu chấm công, tỷ lệ đi làm &amp; nghỉ phép của toàn thể nhân sự.
          </p>
        </div>

        {/* Action Controls trên Desktop (giữ nguyên vị trí ban đầu) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchDashboardStats}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
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
      {/* Desktop View: Giữ nguyên vẹn 100% bố cục 5 cột ban đầu (hidden sm:grid) */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
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

      {/* Mobile View: Thiết kế gọn gàng dạng 2x2 + 1 thanh tỷ lệ (sm:hidden) */}
      <div className="sm:hidden space-y-2.5">
        {/* 4 Thẻ chỉ số chính dạng lưới 2x2 */}
        <div className="grid grid-cols-2 gap-2">
          {/* Đi làm */}
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Đi làm
              </span>
              <span className="text-zinc-400 font-mono font-normal">/{summary.totalEmployees}</span>
            </div>
            <div className="text-xl font-black font-mono mt-1 text-emerald-600 dark:text-emerald-400">
              {summary.presentToday}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
              Đúng giờ: <strong className="text-zinc-700 dark:text-zinc-300">{summary.onTimeToday}</strong>
            </div>
          </div>

          {/* Đúng giờ */}
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <span>✓</span>
              <span>Đúng giờ</span>
            </div>
            <div className="text-xl font-black font-mono mt-1 text-blue-600 dark:text-blue-400">
              {summary.onTimeToday}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
              Tỷ lệ: <strong className="text-zinc-700 dark:text-zinc-300">{summary.onTimeRate}%</strong>
            </div>
          </div>

          {/* Đi muộn */}
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span>⚠</span>
              <span>Đi muộn</span>
            </div>
            <div className="text-xl font-black font-mono mt-1 text-amber-600 dark:text-amber-400">
              {summary.lateToday}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
              {summary.lateToday > 0 ? "Sau 08:00" : "Không có"}
            </div>
          </div>

          {/* Nghỉ / Vắng */}
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <span>✗</span>
              <span>Nghỉ / Vắng</span>
            </div>
            <div className="text-xl font-black font-mono mt-1 text-rose-600 dark:text-rose-400">
              {summary.absentToday}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
              {summary.absentToday > 0 ? "Chưa điểm danh" : "Đầy đủ 100%"}
            </div>
          </div>
        </div>

        {/* Thanh tỷ lệ chuyên cần ngang */}
        <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🎯</span>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Tỷ lệ chuyên cần:</span>
            <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              {summary.attendanceRate}%
            </span>
          </div>
          <div className="w-28 bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden shrink-0">
            <div
              style={{ width: `${summary.attendanceRate}%` }}
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. THANH TAB ĐIỀU HƯỚNG NHANH TRÊN MOBILE (lg:hidden)
         ========================================================================= */}
      <div className="lg:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-3.5 px-3.5 text-xs">
          {[
            { id: "all", label: "Tất cả", icon: "🌟" },
            { id: "attendance", label: "Chấm công", icon: "⏱️" },
            { id: "tasks", label: "Công việc", icon: "📋" },
            { id: "leaderboard", label: "Vinh danh", icon: "🏆" },
            { id: "employees", label: "Nhân sự", icon: "👥" },
          ].map((tab) => {
            const isActive = mobileTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMobileTab(tab.id as typeof mobileTab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          4. CÁC BIỂU ĐỒ THỐNG KÊ & DỮ LIỆU
         ========================================================================= */}
      {loadingStats ? (
        <div className="p-12 text-center">
          <LoadingSection text="Đang xử lý dữ liệu và tạo biểu đồ chuyên cần..." size="md" />
        </div>
      ) : statsData ? (
        <div className="space-y-4 sm:space-y-6">
          {/* Hàng biểu đồ 1: Xu hướng 7 ngày (60%) + Donut tỷ lệ hôm nay (40%) */}
          <div
            className={`${
              mobileTab === "all" || mobileTab === "attendance" ? "block" : "hidden"
            } lg:block`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
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
          </div>

          {/* Hàng biểu đồ 2: Tiến độ Công việc & Dự án */}
          <div
            className={`${
              mobileTab === "all" || mobileTab === "tasks" ? "block" : "hidden"
            } lg:block`}
          >
            <TaskProgressChart data={statsData.taskStats} />
          </div>

          {/* Hàng 3: Bảng Vinh Danh Chuyên Cần & Gương Mẫu Tháng */}
          <div
            className={`${
              mobileTab === "all" || mobileTab === "leaderboard" ? "block" : "hidden"
            } lg:block`}
          >
            <PunctualityLeaderboard data={statsData.punctualityLeaderboard} />
          </div>

          {/* =========================================================================
              5. DỮ LIỆU & DANH SÁCH NHÂN VIÊN (EMPLOYEE DIRECTORY & ATTENDANCE)
             ========================================================================= */}
          <div
            className={`${
              mobileTab === "all" || mobileTab === "employees" ? "block" : "hidden"
            } lg:block`}
          >
            <EmployeeAttendanceTable employees={statsData.employeeAttendance} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
