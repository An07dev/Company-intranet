"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
import {
  ShopeeSectionSkeleton,
  InventorySectionSkeleton,
  CrmSectionSkeleton,
  DebtSectionSkeleton,
  AttendanceSectionSkeleton,
} from "@/components/dashboard/DashboardSkeleton";
import { DashboardStatsResponse } from "@/app/api/dashboard/stats/route";
import { ShopeeDashboardStats } from "@/app/api/dashboard/shopee-stats/route";
import { InventoryDashboardStats } from "@/app/api/dashboard/inventory-stats/route";
import { CustomerCRMDashboardStats } from "@/app/api/dashboard/crm-stats/route";
import { DebtDashboardStats } from "@/app/api/dashboard/debt-stats/route";

// =========================================================================
// BỘ NHỚ ĐỆM PHÍA CLIENT (CLIENT-SIDE IN-MEMORY SWR CACHE - 2 PHÚT TTL)
// Giúp chuyển trang và quay lại Dashboard ngay tức thì trong 0ms!
// =========================================================================
interface DashboardClientCache {
  statsData: DashboardStatsResponse | null;
  shopeeStats: ShopeeDashboardStats | null;
  inventoryStats: InventoryDashboardStats | null;
  crmStats: CustomerCRMDashboardStats | null;
  debtStats: DebtDashboardStats | null;
  lastUpdated: number;
}

let clientDashboardCache: DashboardClientCache | null = null;
const CLIENT_CACHE_TTL_MS = 2 * 60 * 1000; // 2 phút

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Khởi tạo state tức thì từ Cache nếu có (0ms Initial Render)
  const [statsData, setStatsData] = useState<DashboardStatsResponse | null>(
    () => clientDashboardCache?.statsData || null
  );
  const [shopeeStats, setShopeeStats] = useState<ShopeeDashboardStats | null>(
    () => clientDashboardCache?.shopeeStats || null
  );
  const [inventoryStats, setInventoryStats] = useState<InventoryDashboardStats | null>(
    () => clientDashboardCache?.inventoryStats || null
  );
  const [crmStats, setCrmStats] = useState<CustomerCRMDashboardStats | null>(
    () => clientDashboardCache?.crmStats || null
  );
  const [debtStats, setDebtStats] = useState<DebtDashboardStats | null>(
    () => clientDashboardCache?.debtStats || null
  );

  // Trạng thái tải độc lập cho từng phân khu (Decoupled Progressive Loading)
  const [loadingStats, setLoadingStats] = useState(() => !clientDashboardCache?.statsData);
  const [loadingShopee, setLoadingShopee] = useState(() => !clientDashboardCache?.shopeeStats);
  const [loadingInventory, setLoadingInventory] = useState(() => !clientDashboardCache?.inventoryStats);
  const [loadingCrm, setLoadingCrm] = useState(() => !clientDashboardCache?.crmStats);
  const [loadingDebt, setLoadingDebt] = useState(() => !clientDashboardCache?.debtStats);

  const [refreshing, setRefreshing] = useState(false);
  const [mobileTab, setMobileTab] = useState<
    "all" | "ecommerce" | "inventory" | "crm" | "debts" | "attendance" | "tasks" | "leaderboard" | "employees"
  >("all");

  // Giữ ref cho các giá trị hiện tại & tránh gọi trùng lặp (tránh re-render loop)
  const dataRef = useRef({
    statsData,
    shopeeStats,
    inventoryStats,
    crmStats,
    debtStats,
  });

  useEffect(() => {
    dataRef.current = {
      statsData,
      shopeeStats,
      inventoryStats,
      crmStats,
      debtStats,
    };
  }, [statsData, shopeeStats, inventoryStats, crmStats, debtStats]);

  const isFetchingRef = useRef(false);

  // Điều hướng nếu chưa đăng nhập
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  // Helper cập nhật client cache
  const updateCacheEntry = useCallback(
    (key: keyof Omit<DashboardClientCache, "lastUpdated">, val: any) => {
      if (!clientDashboardCache) {
        clientDashboardCache = {
          statsData: null,
          shopeeStats: null,
          inventoryStats: null,
          crmStats: null,
          debtStats: null,
          lastUpdated: Date.now(),
        };
      }
      (clientDashboardCache as any)[key] = val;
      clientDashboardCache.lastUpdated = Date.now();
    },
    []
  );

  // Tải dữ liệu thống kê Dashboard với cơ chế Progressive Decoupled Streams
  const fetchDashboardStats = useCallback(
    async (isManualRefresh = false) => {
      if (isFetchingRef.current && !isManualRefresh) return;
      isFetchingRef.current = true;

      try {
        if (isManualRefresh) {
          setRefreshing(true);
        }

        // Nếu là lần đầu hoặc không có dữ liệu, hiển thị skeleton cho phân khu tương ứng
        if (!dataRef.current.statsData) setLoadingStats(true);
        if (!dataRef.current.shopeeStats) setLoadingShopee(true);
        if (!dataRef.current.inventoryStats) setLoadingInventory(true);
        if (!dataRef.current.crmStats) setLoadingCrm(true);
        if (!dataRef.current.debtStats) setLoadingDebt(true);

        // 1. Phân khu Nhân sự & Chuyên cần
        const pStats = fetch("/api/dashboard/stats")
          .then((res) => res.json())
          .then((json) => {
            if (json.success && json.data) {
              setStatsData(json.data);
              updateCacheEntry("statsData", json.data);
            }
          })
          .catch((err) => console.error("Lỗi stats:", err))
          .finally(() => setLoadingStats(false));

        // 2. Phân khu Đơn hàng Đa kênh & Shopee
        const pShopee = fetch("/api/dashboard/shopee-stats")
          .then((res) => res.json())
          .then((json) => {
            if (json.success && json.data) {
              setShopeeStats(json.data);
              updateCacheEntry("shopeeStats", json.data);
            }
          })
          .catch((err) => console.error("Lỗi shopee:", err))
          .finally(() => setLoadingShopee(false));

        // 3. Phân khu Kho & Tồn Kho Chi Nhánh
        const pInventory = fetch("/api/dashboard/inventory-stats")
          .then((res) => res.json())
          .then((json) => {
            if (json.success && json.data) {
              setInventoryStats(json.data);
              updateCacheEntry("inventoryStats", json.data);
            }
          })
          .catch((err) => console.error("Lỗi inventory:", err))
          .finally(() => setLoadingInventory(false));

        // 4. Phân khu Khách Hàng CRM
        const pCrm = fetch("/api/dashboard/crm-stats")
          .then((res) => res.json())
          .then((json) => {
            if (json.success && json.data) {
              setCrmStats(json.data);
              updateCacheEntry("crmStats", json.data);
            }
          })
          .catch((err) => console.error("Lỗi crm:", err))
          .finally(() => setLoadingCrm(false));

        // 5. Phân khu Công nợ Sapo
        const pDebt = fetch("/api/dashboard/debt-stats")
          .then((res) => res.json())
          .then((json) => {
            if (json.success && json.data) {
              setDebtStats(json.data);
              updateCacheEntry("debtStats", json.data);
            }
          })
          .catch((err) => console.error("Lỗi debt:", err))
          .finally(() => setLoadingDebt(false));

        // Chạy song song không chặn lẫn nhau
        await Promise.allSettled([pStats, pShopee, pInventory, pCrm, pDebt]);
      } catch (err) {
        console.error("Lỗi khi tải thống kê dashboard:", err);
      } finally {
        isFetchingRef.current = false;
        setRefreshing(false);
      }
    },
    [updateCacheEntry]
  );

  // Kích hoạt fetch khi mount (kiểm tra độ tươi của cache)
  useEffect(() => {
    if (user) {
      const isFresh =
        Boolean(clientDashboardCache) &&
        Date.now() - (clientDashboardCache?.lastUpdated ?? 0) < CLIENT_CACHE_TTL_MS &&
        Boolean(clientDashboardCache?.statsData);

      if (!isFresh) {
        fetchDashboardStats(false);
      }
    }
  }, [user?.id, fetchDashboardStats]);

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

  // Helper kiểm tra hiển thị phân khu (Tối ưu DOM trên mobile)
  const isTabActive = (tab: "ecommerce" | "inventory" | "crm" | "debts" | "attendance" | "tasks" | "leaderboard" | "employees") => {
    return mobileTab === "all" || mobileTab === tab;
  };

  const isAttendanceGroupActive =
    mobileTab === "all" ||
    mobileTab === "attendance" ||
    mobileTab === "tasks" ||
    mobileTab === "leaderboard" ||
    mobileTab === "employees";

  return (
    <div className="w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* =========================================================================
          1. HEADER TỔNG QUAN DASHBOARD
         ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-4 pb-2 sm:pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="space-y-1 sm:space-y-1.5 w-full md:w-auto">
          {/* Hàng 1: Badge Ngày tháng & Nút Làm Mới trên Mobile */}
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="hidden sm:inline font-semibold">Bảng Điều Khiển •</span>
              <span className="font-mono capitalize">{todayDisplay}</span>
            </div>

            {/* Nút Làm Mới hiển thị cùng hàng trên Mobile */}
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => fetchDashboardStats(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
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
                <span className="text-[11px]">{refreshing ? "Đang tải..." : "Làm mới"}</span>
              </button>
            </div>
          </div>

          {/* Hàng 2: Lời chào buổi sáng */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm sm:text-2xl lg:text-3xl font-bold sm:font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {greeting}, {user.name}
            </h1>
            {user.role && !user.name.toLowerCase().includes((USER_ROLE_LABELS[user.role as UserRole] || user.role).toLowerCase()) && (
              <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
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
            onClick={() => fetchDashboardStats(true)}
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
            <span>{refreshing ? "Đang đồng bộ..." : "Làm mới Dashboard"}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. THANH TAB ĐIỀU HƯỚNG NHANH TRÊN MOBILE (lg:hidden)
         ========================================================================= */}
      <div className="lg:hidden">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none -mx-3.5 px-3.5 text-xs">
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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0 ${
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
          3. CÁC PHÂN KHU BIỂU ĐỒ & DỮ LIỆU (PROGRESSIVE DECOUPLED LOADING)
         ========================================================================= */}
      <div className="space-y-5 sm:space-y-9">
        {/* =========================================================================
            PHÂN KHU 1: THƯƠNG MẠI ĐIỆN TỬ & ĐƠN HÀNG ĐA KÊNH (OMNICHANNEL & SHOPEE)
           ========================================================================= */}
        {isTabActive("ecommerce") && (
          <div className="space-y-3 sm:space-y-5">
            {loadingShopee && !shopeeStats ? (
              <ShopeeSectionSkeleton />
            ) : shopeeStats ? (
              <>
                {/* Tiêu đề phân khu & Quick Action Links */}
                <div className="flex items-center justify-between gap-2 pb-2 sm:pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800/60 flex items-center justify-center text-sm sm:text-base shrink-0">
                      🛍️
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xs sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 sm:gap-2 truncate">
                        <span className="sm:hidden truncate">Đơn Hàng Đa Kênh</span>
                        <span className="hidden sm:inline">Thương Mại Điện Tử &amp; Đơn Hàng Đa Kênh</span>
                        <span className="text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shrink-0">
                          {shopeeStats.summary.totalOrders.toLocaleString("vi-VN")} đơn
                        </span>
                      </h2>
                      <p className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Báo cáo trực quan tình hình kinh doanh, phân bổ đơn hàng và doanh số bán hàng đa sàn (Shopee, TikTok, Lazada, POS, Zalo, FB)
                      </p>
                    </div>
                  </div>

                  {/* Quick Action Navigation Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href="/dashboard/orders"
                      className="inline-flex items-center gap-1 px-2.5 py-1 sm:py-1.5 rounded-xl border border-orange-200 dark:border-orange-800/80 bg-orange-50/60 dark:bg-orange-950/40 text-xs font-semibold text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition shadow-2xs cursor-pointer"
                    >
                      <span>📑</span>
                      <span className="sm:hidden">Chi tiết</span>
                      <span className="hidden sm:inline">Đơn Hàng Đa Kênh</span>
                      <span>→</span>
                    </Link>

                    <Link
                      href="/dashboard/inventory"
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-orange-600 hover:border-orange-200 dark:hover:border-orange-800 transition shadow-2xs"
                    >
                      <span>📦</span>
                      <span>Kho Hàng</span>
                    </Link>

                    <Link
                      href="/dashboard/customers"
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-orange-600 hover:border-orange-200 dark:hover:border-orange-800 transition shadow-2xs"
                    >
                      <span>👥</span>
                      <span>Khách Hàng</span>
                    </Link>

                    <Link
                      href="/dashboard/webhooks"
                      className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-orange-600 hover:border-orange-200 dark:hover:border-orange-800 transition shadow-2xs"
                    >
                      <span>⚡</span>
                      <span>Webhook Sapo</span>
                    </Link>

                    {(user?.role === "admin" || user?.role === "director") && (
                      <Link
                        href="/dashboard/shopee-logs"
                        className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-orange-600 hover:border-orange-200 dark:hover:border-orange-800 transition shadow-2xs"
                      >
                        <span>📊</span>
                        <span>Nhật ký</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* 4 Thẻ KPI Đơn Hàng Đa Kênh Nổi Bật */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                  {/* KPI 1: Tổng đơn hàng đa kênh */}
                  <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                        Tổng đơn đa kênh
                      </span>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-300 flex items-center justify-center text-xs shrink-0">
                        📦
                      </div>
                    </div>
                    <div className="text-xs sm:text-base lg:text-xl xl:text-2xl font-bold sm:font-black font-mono mt-0.5 sm:mt-1 text-zinc-900 dark:text-zinc-100 truncate">
                      {shopeeStats.summary.totalOrders.toLocaleString("vi-VN")}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 sm:mt-1 truncate">
                      {shopeeStats.channelBreakdown?.length || 9} kênh sàn &amp; POS
                    </div>
                  </div>

                  {/* KPI 2: Tổng doanh thu bán hàng */}
                  <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                        Tổng doanh thu
                      </span>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs shrink-0">
                        💰
                      </div>
                    </div>
                    <div className="text-xs sm:text-base lg:text-xl xl:text-2xl font-bold sm:font-black font-mono mt-0.5 sm:mt-1 text-emerald-600 dark:text-emerald-400 truncate" title={`₫${shopeeStats.summary.totalRevenue.toLocaleString("vi-VN")}`}>
                      ₫{shopeeStats.summary.totalRevenue.toLocaleString("vi-VN")}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 sm:mt-1 truncate font-medium">
                      Toàn bộ lịch sử đơn
                    </div>
                  </div>

                  {/* KPI 3: Chờ chuẩn bị & đóng gói */}
                  <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                        Chờ đóng gói
                      </span>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs shrink-0">
                        ⏳
                      </div>
                    </div>
                    <div className="text-xs sm:text-base lg:text-xl xl:text-2xl font-bold sm:font-black font-mono mt-0.5 sm:mt-1 text-amber-600 dark:text-amber-400 truncate">
                      {shopeeStats.summary.processingOrders.toLocaleString("vi-VN")}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 sm:mt-1 truncate">
                      Cần chuẩn bị xuất kho
                    </div>
                  </div>

                  {/* KPI 4: Đã giao thành công */}
                  <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs sm:shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                        Đã giao thành công
                      </span>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs shrink-0">
                        🚚
                      </div>
                    </div>
                    <div className="text-xs sm:text-base lg:text-xl xl:text-2xl font-bold sm:font-black font-mono mt-0.5 sm:mt-1 text-indigo-600 dark:text-indigo-400 truncate">
                      {shopeeStats.summary.deliveredOrders.toLocaleString("vi-VN")}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5 sm:mt-1 truncate font-medium">
                      Hoàn tất: {shopeeStats.summary.deliveredRate}%
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
              </>
            ) : null}
          </div>
        )}

        {/* =========================================================================
            PHÂN KHU 2: QUẢN LÝ KHO & TỒN KHO CHI NHÁNH
           ========================================================================= */}
        {isTabActive("inventory") && (
          <div>
            {loadingInventory && !inventoryStats ? (
              <InventorySectionSkeleton />
            ) : inventoryStats ? (
              <InventoryCharts stats={inventoryStats} />
            ) : null}
          </div>
        )}

        {/* =========================================================================
            PHÂN KHU 3: QUẢN LÝ KHÁCH HÀNG & CRM
           ========================================================================= */}
        {isTabActive("crm") && (
          <div>
            {loadingCrm && !crmStats ? (
              <CrmSectionSkeleton />
            ) : crmStats ? (
              <CustomerCRMCharts stats={crmStats} />
            ) : null}
          </div>
        )}

        {/* =========================================================================
            PHÂN KHU 4: QUẢN LÝ CÔNG NỢ SAPO (KHÁCH HÀNG & NHÀ CUNG CẤP)
           ========================================================================= */}
        {isTabActive("debts") && (
          <div>
            {loadingDebt && !debtStats ? (
              <DebtSectionSkeleton />
            ) : debtStats ? (
              <DebtFinanceCharts stats={debtStats} />
            ) : null}
          </div>
        )}

        {/* =========================================================================
            PHÂN KHU 5: CHUYÊN CẦN & CÔNG VIỆC NHÂN SỰ
           ========================================================================= */}
        {isAttendanceGroupActive && (
          <div>
            {loadingStats && !statsData ? (
              <AttendanceSectionSkeleton />
            ) : statsData ? (
              <div className="space-y-4 sm:space-y-6 pt-2">
                <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>⏱️</span>
                    <span>Chuyên Cần &amp; Quản Lý Nhân Sự</span>
                  </h2>
                  <p className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400">
                    Dữ liệu chấm công hàng ngày, tỷ lệ đúng giờ và tiến độ thực thi công việc nội bộ
                  </p>
                </div>

                {/* Hàng biểu đồ 1: Xu hướng 7 ngày (60%) + Donut tỷ lệ hôm nay (40%) */}
                {isTabActive("attendance") && (
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
                )}

                {/* Hàng biểu đồ 2: Tiến độ Công việc & Dự án */}
                {isTabActive("tasks") && (
                  <div>
                    <TaskProgressChart data={statsData.taskStats} />
                  </div>
                )}

                {/* Hàng 3: Bảng Vinh Danh Chuyên Cần & Gương Mẫu Tháng */}
                {isTabActive("leaderboard") && (
                  <div>
                    <PunctualityLeaderboard data={statsData.punctualityLeaderboard} />
                  </div>
                )}

                {/* Dữ liệu danh sách nhân viên */}
                {isTabActive("employees") && (
                  <div>
                    <EmployeeAttendanceTable employees={statsData.employeeAttendance} />
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
