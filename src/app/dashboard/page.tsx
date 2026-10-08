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
import { ShopeeOrderCharts } from "@/components/dashboard/ShopeeOrderCharts";
import { ShopeeProductCharts } from "@/components/dashboard/ShopeeProductCharts";
import { InventoryCharts } from "@/components/dashboard/InventoryCharts";
import { CustomerCRMCharts } from "@/components/dashboard/CustomerCRMCharts";
import { DebtFinanceCharts } from "@/components/dashboard/DebtFinanceCharts";
import { DashboardStatsResponse } from "@/app/api/dashboard/stats/route";
import { ShopeeDashboardStats } from "@/app/api/dashboard/shopee-stats/route";
import { InventoryDashboardStats } from "@/app/api/dashboard/inventory-stats/route";
import { CustomerCRMDashboardStats } from "@/app/api/dashboard/crm-stats/route";
import { DebtDashboardStats } from "@/app/api/dashboard/debt-stats/route";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [statsData, setStatsData] = useState<DashboardStatsResponse | null>(null);
  const [shopeeStats, setShopeeStats] = useState<ShopeeDashboardStats | null>(null);
  const [inventoryStats, setInventoryStats] = useState<InventoryDashboardStats | null>(null);
  const [crmStats, setCrmStats] = useState<CustomerCRMDashboardStats | null>(null);
  const [debtStats, setDebtStats] = useState<DebtDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileTab, setMobileTab] = useState<
    "all" | "ecommerce" | "inventory" | "crm" | "debts" | "attendance" | "tasks" | "leaderboard" | "employees"
  >("all");

  // Điều hướng nếu chưa đăng nhập
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  // Tải dữ liệu thống kê Dashboard, Đa Kênh, Kho & CRM
  const fetchDashboardStats = useCallback(async () => {
    try {
      setRefreshing(true);
      const [resStats, resShopee, resInventory, resCrm, resDebt] = await Promise.allSettled([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/shopee-stats"),
        fetch("/api/dashboard/inventory-stats"),
        fetch("/api/dashboard/crm-stats"),
        fetch("/api/dashboard/debt-stats"),
      ]);

      if (resStats.status === "fulfilled") {
        const json = await resStats.value.json();
        if (json.success && json.data) {
          setStatsData(json.data);
        }
      }

      if (resShopee.status === "fulfilled") {
        const jsonShopee = await resShopee.value.json();
        if (jsonShopee.success && jsonShopee.data) {
          setShopeeStats(jsonShopee.data);
        }
      }

      if (resInventory.status === "fulfilled") {
        const jsonInv = await resInventory.value.json();
        if (jsonInv.success && jsonInv.data) {
          setInventoryStats(jsonInv.data);
        }
      }

      if (resCrm.status === "fulfilled") {
        const jsonCrm = await resCrm.value.json();
        if (jsonCrm.success && jsonCrm.data) {
          setCrmStats(jsonCrm.data);
        }
      }

      if (resDebt.status === "fulfilled") {
        const jsonDebt = await resDebt.value.json();
        if (jsonDebt.success && jsonDebt.data) {
          setDebtStats(jsonDebt.data);
        }
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
              <span>Bảng Điều Khiển Tổng Hợp</span>
              <span className="text-zinc-300 dark:text-zinc-600">•</span>
              <span className="font-mono text-zinc-500 dark:text-zinc-400 capitalize">{todayDisplay}</span>
            </div>

            {/* Nút Làm Mới hiển thị cùng hàng trên Mobile */}
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

          <p className="hidden sm:block text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Báo cáo đồng bộ số liệu Đơn Hàng Đa Kênh, Quản Lý Kho &amp; Tồn Kho, Khách Hàng CRM và Nhân sự.
          </p>
        </div>

        {/* Action Controls trên Desktop */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchDashboardStats}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
            title="Làm mới số liệu toàn bộ dashboard"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? "Đang tải dữ liệu..." : "Làm mới Dashboard"}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. THANH TAB ĐIỀU HƯỚNG NHANH TRÊN MOBILE (lg:hidden)
         ========================================================================= */}
      <div className="lg:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-3.5 px-3.5 text-xs">
          {[
            { id: "all", label: "Tất cả", icon: "🌟" },
            { id: "ecommerce", label: "Đơn Đa Kênh", icon: "🛍️" },
            { id: "inventory", label: "Kho & Tồn Kho", icon: "🏭" },
            { id: "crm", label: "Khách Hàng CRM", icon: "👥" },
            { id: "debts", label: "Công nợ Sapo", icon: "⚖️" },
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
          3. CÁC PHÂN KHU BIỂU ĐỒ & DỮ LIỆU
         ========================================================================= */}
      {loadingStats ? (
        <div className="p-12 text-center">
          <LoadingSection text="Đang đồng bộ số liệu Đa Kênh, Kho Hàng, CRM và Nhân Sự..." size="md" />
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-9">
          {/* =========================================================================
              PHÂN KHU 1: THƯƠNG MẠI ĐIỆN TỬ & ĐƠN HÀNG ĐA KÊNH (OMNICHANNEL & SHOPEE)
             ========================================================================= */}
          {shopeeStats && (
            <div
              className={`${
                mobileTab === "all" || mobileTab === "ecommerce" ? "block" : "hidden"
              } lg:block space-y-4 sm:space-y-5`}
            >
              {/* Tiêu đề phân khu & Quick Action Links */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800/60 flex items-center justify-center text-base">
                    🛍️
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>Thương Mại Điện Tử &amp; Đơn Hàng Đa Kênh</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                        {shopeeStats.summary.totalOrders.toLocaleString("vi-VN")} đơn • {shopeeStats.channelBreakdown?.length || 9} Kênh bán
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Báo cáo trực quan tình hình kinh doanh, phân bổ đơn hàng và doanh số bán hàng đa sàn (Shopee, TikTok, Lazada, POS, Zalo, FB)
                    </p>
                  </div>
                </div>

                {/* Quick Action Navigation Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    href="/dashboard/orders"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-orange-200 dark:border-orange-800/80 bg-orange-50/60 dark:bg-orange-950/40 text-xs font-semibold text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition shadow-2xs cursor-pointer"
                  >
                    <span>📑</span>
                    <span>Đơn Hàng Đa Kênh</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-white dark:bg-zinc-800">
                      {shopeeStats.summary.totalOrders.toLocaleString("vi-VN")}
                    </span>
                  </Link>

                  <Link
                    href="/dashboard/inventory"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-orange-600 hover:border-orange-200 dark:hover:border-orange-800 transition shadow-2xs"
                  >
                    <span>📦</span>
                    <span>Kho Hàng</span>
                  </Link>

                  <Link
                    href="/dashboard/customers"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-orange-600 hover:border-orange-200 dark:hover:border-orange-800 transition shadow-2xs"
                  >
                    <span>👥</span>
                    <span>Khách Hàng CRM</span>
                  </Link>

                  <Link
                    href="/dashboard/webhooks"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-orange-600 hover:border-orange-200 dark:hover:border-orange-800 transition shadow-2xs"
                  >
                    <span>⚡</span>
                    <span>Webhook Sapo</span>
                  </Link>

                  {(user?.role === "admin" || user?.role === "director") && (
                    <Link
                      href="/dashboard/shopee-logs"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-orange-600 hover:border-orange-200 dark:hover:border-orange-800 transition shadow-2xs"
                    >
                      <span>📊</span>
                      <span>Nhật ký</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* 4 Thẻ KPI Đơn Hàng Đa Kênh Nổi Bật (Chuẩn khớp trang /dashboard/orders) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* KPI 1: Tổng đơn hàng đa kênh */}
                <div className="p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Tổng đơn hàng đa kênh
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-300 flex items-center justify-center text-xs">
                      📦
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono mt-1 text-zinc-900 dark:text-zinc-100">
                    {shopeeStats.summary.totalOrders.toLocaleString("vi-VN")}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 truncate">
                    Ghi nhận từ {shopeeStats.channelBreakdown?.length || 9} kênh sàn &amp; POS
                  </div>
                </div>

                {/* KPI 2: Tổng doanh thu bán hàng */}
                <div className="p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Tổng doanh thu bán hàng
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
                      💰
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono mt-1 text-emerald-600 dark:text-emerald-400 truncate" title={`₫${shopeeStats.summary.totalRevenue.toLocaleString("vi-VN")}`}>
                    ₫{shopeeStats.summary.totalRevenue.toLocaleString("vi-VN")}
                  </div>
                  <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 truncate font-medium">
                    Doanh thu toàn bộ lịch sử đơn
                  </div>
                </div>

                {/* KPI 3: Chờ chuẩn bị & đóng gói */}
                <div className="p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Chờ xử lý / Đóng gói
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs">
                      ⏳
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono mt-1 text-amber-600 dark:text-amber-400">
                    {shopeeStats.summary.processingOrders.toLocaleString("vi-VN")}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 truncate">
                    Cần xác nhận &amp; chuẩn bị xuất kho
                  </div>
                </div>

                {/* KPI 4: Đã giao thành công */}
                <div className="p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Đã giao thành công
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">
                      🚚
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono mt-1 text-indigo-600 dark:text-indigo-400">
                    {shopeeStats.summary.deliveredOrders.toLocaleString("vi-VN")}
                  </div>
                  <div className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-1 truncate font-medium">
                    Tỷ lệ hoàn tất: {shopeeStats.summary.deliveredRate}% (₫{Math.round(shopeeStats.summary.deliveredRevenue / 1000000).toLocaleString("vi-VN")}M)
                  </div>
                </div>
              </div>

              {/* Hàng biểu đồ Shopee 1: Trạng Thái Đơn Hàng & Kênh Bán Đa Kênh */}
              <ShopeeOrderCharts
                orderStatusBreakdown={shopeeStats.orderStatusBreakdown}
                channelBreakdown={shopeeStats.channelBreakdown}
                shippingBreakdown={shopeeStats.shippingBreakdown}
                paymentBreakdown={shopeeStats.paymentBreakdown}
                totalOrders={shopeeStats.summary.totalOrders}
                totalRevenue={shopeeStats.summary.totalRevenue}
                averageOrderValue={shopeeStats.summary.averageOrderValue}
                deliveredOrders={shopeeStats.summary.deliveredOrders}
                deliveredRevenue={shopeeStats.summary.deliveredRevenue}
                deliveredRate={shopeeStats.summary.deliveredRate}
              />

              {/* Hàng biểu đồ Shopee 2: Top Bán Chạy & Tồn Kho Phân Khúc */}
              <ShopeeProductCharts
                totalProducts={shopeeStats.summary.totalProducts}
                inStockProducts={shopeeStats.summary.inStockProducts}
                outOfStockProducts={shopeeStats.summary.outOfStockProducts}
                totalStock={shopeeStats.summary.totalStock}
                totalSales30d={shopeeStats.summary.totalSales30d}
                productPriceBreakdown={shopeeStats.productPriceBreakdown}
                topSellingProducts={shopeeStats.topSellingProducts}
              />
            </div>
          )}

          {/* =========================================================================
              PHÂN KHU 2: QUẢN LÝ KHO & TỒN KHO CHI NHÁNH
             ========================================================================= */}
          {inventoryStats && (
            <div
              className={`${
                mobileTab === "all" || mobileTab === "inventory" ? "block" : "hidden"
              } lg:block`}
            >
              <InventoryCharts stats={inventoryStats} />
            </div>
          )}

          {/* =========================================================================
              PHÂN KHU 3: QUẢN LÝ KHÁCH HÀNG & CRM
             ========================================================================= */}
          {crmStats && (
            <div
              className={`${
                mobileTab === "all" || mobileTab === "crm" ? "block" : "hidden"
              } lg:block`}
            >
              <CustomerCRMCharts stats={crmStats} />
            </div>
          )}

          {/* =========================================================================
              PHÂN KHU 4: QUẢN LÝ CÔNG NỢ SAPO (KHÁCH HÀNG & NHÀ CUNG CẤP)
             ========================================================================= */}
          {debtStats && (
            <div
              className={`${
                mobileTab === "all" || mobileTab === "debts" ? "block" : "hidden"
              } lg:block`}
            >
              <DebtFinanceCharts stats={debtStats} />
            </div>
          )}

          {/* =========================================================================
              PHÂN KHU 5: CHUYÊN CẦN & CÔNG VIỆC NHÂN SỰ
             ========================================================================= */}
          {statsData && (
            <div className="space-y-4 sm:space-y-6 pt-2">
              <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>⏱️</span>
                  <span>Chuyên Cần &amp; Quản Lý Nhân Sự</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Dữ liệu chấm công hàng ngày, tỷ lệ đúng giờ và tiến độ thực thi công việc nội bộ
                </p>
              </div>

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

              {/* Dữ liệu danh sách nhân viên */}
              <div
                className={`${
                  mobileTab === "all" || mobileTab === "employees" ? "block" : "hidden"
                } lg:block`}
              >
                <EmployeeAttendanceTable employees={statsData.employeeAttendance} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
