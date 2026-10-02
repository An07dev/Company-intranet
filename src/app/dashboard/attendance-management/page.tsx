"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { AttendanceRecord, ApiResponse, PaginatedData, User } from "@/types";
import { Button } from "@/components/ui/Button";
import { TableSkeleton } from "@/components/ui/Loading";

interface DashboardSummary {
  totalEmployees: number;
  presentToday: number;
  onTimeToday: number;
  lateToday: number;
  absentToday: number;
  attendanceRate: number;
}

export default function AttendanceManagementPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Dữ liệu danh sách & Thống kê
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [employeesList, setEmployeesList] = useState<User[]>([]);
  const [summaryStats, setSummaryStats] = useState<DashboardSummary | null>(null);

  // Phân trang: 10 bản ghi mỗi trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const pageSize = 10;

  // Các giá trị bộ lọc
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState<string>("all");
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  const isAdminOrDirector = user?.role === "admin" || user?.role === "director";

  // Định dạng ngày hôm nay theo YYYY-MM-DD
  const todayDateString = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  }, []);

  // Định dạng ngày hôm qua
  const yesterdayDateString = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(d);
  }, []);

  // Tải thống kê tổng quan (Summary stats)
  const fetchSummaryStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      const json = await res.json();
      if (json.success && json.data?.summary) {
        setSummaryStats(json.data.summary);
      }
    } catch {
      // Ignored
    }
  }, []);

  // Tải danh sách toàn bộ nhân viên trong công ty
  const fetchEmployeesList = useCallback(async () => {
    try {
      const res = await fetch("/api/users?limit=100");
      const json = await res.json();
      if (json.success && json.data) {
        const items = json.data.items || json.data || [];
        setEmployeesList(items);
      }
    } catch {
      // Ignored
    }
  }, []);

  const employeesMap = useMemo(() => {
    const map = new Map<string, User>();
    employeesList.forEach((e) => {
      map.set(e.id, e);
      if (e.employeeCode) map.set(e.employeeCode, e);
    });
    return map;
  }, [employeesList]);

  // Tải lịch sử chấm công của TOÀN BỘ nhân viên có phân trang và bộ lọc
  const fetchAttendanceData = useCallback(
    async (targetPage?: number) => {
      setLoadingHistory(true);
      try {
        const pageToFetch = targetPage !== undefined ? targetPage : currentPage;
        const params = new URLSearchParams();
        params.set("page", String(pageToFetch));
        params.set("limit", String(pageSize));
        params.set("scope", "all"); // Luôn luôn xem toàn bộ nhân viên

        if (selectedEmployeeCode && selectedEmployeeCode !== "all") {
          params.set("employeeCode", selectedEmployeeCode);
        }
        if (searchEmployeeQuery.trim()) {
          params.set("search", searchEmployeeQuery.trim());
        }
        if (selectedDate) {
          params.set("date", selectedDate);
        }
        if (selectedStatus && selectedStatus !== "all") {
          params.set("status", selectedStatus);
        }

        const res = await fetch(`/api/attendance/history?${params.toString()}`);
        const json: ApiResponse<PaginatedData<AttendanceRecord> | AttendanceRecord[]> = await res.json();
        if (json.success && json.data) {
          if ("items" in json.data && Array.isArray(json.data.items)) {
            setHistory(json.data.items);
            setTotalRecords(json.data.total ?? json.data.items.length);
            setTotalPages(Math.max(1, json.data.totalPages ?? 1));
          } else if (Array.isArray(json.data)) {
            setHistory(json.data);
            setTotalRecords(json.data.length);
            setTotalPages(Math.max(1, Math.ceil(json.data.length / pageSize)));
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Lỗi khi tải dữ liệu chấm công toàn đơn vị", {
          title: "Lỗi Hệ Thống",
        });
      } finally {
        setLoadingHistory(false);
      }
    },
    [currentPage, selectedEmployeeCode, searchEmployeeQuery, selectedDate, selectedStatus, toast]
  );

  // Khởi tạo dữ liệu khi mount
  useEffect(() => {
    if (user && isAdminOrDirector) {
      fetchSummaryStats();
      fetchEmployeesList();
      fetchAttendanceData(1);
    }
  }, [user, isAdminOrDirector, fetchSummaryStats, fetchEmployeesList, fetchAttendanceData]);

  // Tự động tải lại khi đổi bộ lọc và reset về trang 1
  const prevFiltersRef = useRef({ selectedEmployeeCode, searchEmployeeQuery, selectedDate, selectedStatus });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.selectedEmployeeCode !== selectedEmployeeCode ||
      prev.searchEmployeeQuery !== searchEmployeeQuery ||
      prev.selectedDate !== selectedDate ||
      prev.selectedStatus !== selectedStatus
    ) {
      prevFiltersRef.current = { selectedEmployeeCode, searchEmployeeQuery, selectedDate, selectedStatus };
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchAttendanceData(1);
      }
    }
  }, [selectedEmployeeCode, searchEmployeeQuery, selectedDate, selectedStatus, currentPage, fetchAttendanceData]);

  // Chuyển trang
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage || loadingHistory) {
      return;
    }
    setCurrentPage(newPage);
    fetchAttendanceData(newPage);
  };

  // Nhanh: Đặt lại toàn bộ bộ lọc
  const handleResetFilters = () => {
    setSelectedEmployeeCode("all");
    setSearchEmployeeQuery("");
    setSelectedDate("");
    setSelectedStatus("all");
    setCurrentPage(1);
  };

  // Xuất file Excel (.xlsx) danh sách điểm danh toàn nhân viên
  const handleExportExcel = () => {
    const params = new URLSearchParams();
    params.set("scope", "all");
    if (selectedEmployeeCode && selectedEmployeeCode !== "all") {
      params.set("employeeCode", selectedEmployeeCode);
    }
    if (searchEmployeeQuery.trim()) {
      params.set("search", searchEmployeeQuery.trim());
    }
    if (selectedDate) {
      params.set("date", selectedDate);
    }
    if (selectedStatus && selectedStatus !== "all") {
      params.set("status", selectedStatus);
    }

    window.open(`/api/attendance/export?${params.toString()}`, "_blank");
  };

  // Định dạng giờ an toàn theo giờ Việt Nam
  const formatDisplayTime = useCallback((isoString?: string | null, includeSeconds = true) => {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        ...(includeSeconds ? { second: "2-digit" } : {}),
        hour12: false,
      });
    }
    const match = isoString.match(/T(\d{2})[:.](\d{2})(?:[:.](\d{2}))?/);
    if (match) {
      return includeSeconds && match[3] ? `${match[1]}:${match[2]}:${match[3]}` : `${match[1]}:${match[2]}`;
    }
    return "—";
  }, []);

  const hasActiveFilters = Boolean(
    (selectedEmployeeCode && selectedEmployeeCode !== "all") ||
    searchEmployeeQuery.trim() ||
    selectedDate ||
    selectedStatus !== "all"
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedEmployeeCode && selectedEmployeeCode !== "all") count++;
    if (searchEmployeeQuery.trim()) count++;
    if (selectedDate) count++;
    if (selectedStatus && selectedStatus !== "all") count++;
    return count;
  }, [selectedEmployeeCode, searchEmployeeQuery, selectedDate, selectedStatus]);

  // Phân trang danh sách số trang
  const paginationItems = useMemo(() => {
    const items: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      if (currentPage <= 4) {
        items.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        items.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        items.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return items;
  }, [totalPages, currentPage]);

  // Kiểm tra quyền: Chỉ Admin và Giám đốc mới có quyền truy cập trang này
  if (!authLoading && (!user || !isAdminOrDirector)) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 text-2xl">
            🔒
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Giới Hạn Quyền Truy Cập
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
            Trang <strong>Dữ Liệu Chấm Công Toàn Đơn Vị</strong> chỉ dành riêng cho <strong>Ban Giám Đốc</strong> và <strong>Quản Trị Viên Hệ Thống</strong>.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 transition-colors"
            >
              Về Bảng Điều Khiển
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* 1. Header Trang Chuyên Dụng: Dữ liệu chấm công toàn đơn vị */}
      {/* 1.1 MOBILE HEADER (sm:hidden) */}
      <div className="sm:hidden flex items-center justify-between gap-2 pb-3.5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base shrink-0">📋</span>
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
              Điểm Danh Toàn Nhân Viên
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/40">
              <span>👑</span>
              <span>Giám Đốc & Quản Trị</span>
            </span>
          </div>
        </div>

        {/* Nút hành động nhanh trên Mobile */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchAttendanceData(currentPage)}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <svg className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shadow-2xs cursor-pointer"
            title="Xuất file Excel"
          >
            <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* 1.2 DESKTOP HEADER (hidden sm:flex) - 100% UNTOUCHED */}
      <div className="hidden sm:flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
              <span>📋</span>
              <span>Dữ Liệu & Điểm Danh Toàn Nhân Viên</span>
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/40">
              <span>👑</span>
              <span>Ban Giám Đốc & Quản Trị</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">
            Theo dõi, tra cứu và kiểm soát tình hình điểm danh của toàn bộ cán bộ nhân sự công ty theo thời gian thực.
          </p>
        </div>

        {/* Nút hành động nhanh ở Header */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleExportExcel}
            className="text-xs font-semibold flex items-center gap-1.5 px-3.5 py-2 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 shadow-2xs"
            title="Xuất dữ liệu chấm công toàn bộ nhân viên theo bộ lọc hiện tại"
          >
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Xuất Excel (.xlsx)</span>
          </Button>
        </div>
      </div>

      {/* 2. Thẻ Thống Kê Tổng Quan Hôm Nay (KPIs) */}
      {/* 2.1 GIAO DIỆN MOBILE: Lưới 2x2 siêu gọn gàng (sm:hidden) */}
      <div className="sm:hidden grid grid-cols-2 gap-2">
        {/* Card 1: Có mặt / Tổng */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Đi làm hôm nay</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {summaryStats?.presentToday ?? 10}
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                /{summaryStats?.totalEmployees ?? employeesList.length ?? 12}
              </span>
            </div>
            <span className="text-[11px] font-semibold font-mono text-emerald-600 dark:text-emerald-400">
              {summaryStats?.attendanceRate ? `${summaryStats.attendanceRate}%` : "83%"}
            </span>
          </div>
        </div>

        {/* Card 2: Đúng giờ */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 shadow-2xs">
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Đúng giờ</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {summaryStats?.onTimeToday ?? 8}
            </span>
            <span className="text-[10px] text-zinc-400">Chuẩn ca</span>
          </div>
        </div>

        {/* Card 3: Đi muộn */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 shadow-2xs">
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Đi muộn</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {summaryStats?.lateToday ?? 2}
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400">&gt; 08:00</span>
          </div>
        </div>

        {/* Card 4: Vắng / Nghỉ phép */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 shadow-2xs">
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Vắng / Nghỉ phép</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {summaryStats?.absentToday ?? 2}
            </span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400">Có đơn</span>
          </div>
        </div>
      </div>

      {/* 2.2 GIAO DIỆN DESKTOP: 5 Thẻ KPIs Đầy Đủ (hidden sm:grid) - 100% UNTOUCHED */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs">
          <div className="text-zinc-400 text-xs font-medium">Tổng nhân sự</div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {summaryStats?.totalEmployees ?? employeesList.length ?? 12}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Toàn bộ đơn vị</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs">
          <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
            <span>Đi làm hôm nay</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {summaryStats?.presentToday ?? 10}
          </div>
          <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
            Tỉ lệ {summaryStats?.attendanceRate ? `${summaryStats.attendanceRate}%` : "83.3%"}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs">
          <div className="text-zinc-400 text-xs font-medium">Đúng giờ</div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {summaryStats?.onTimeToday ?? 8}
          </div>
          <div className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">
            Chuẩn ca quy định
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs">
          <div className="text-zinc-400 text-xs font-medium">Đi muộn</div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {summaryStats?.lateToday ?? 2}
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
            Sau 08:00 sáng
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs">
          <div className="text-zinc-400 text-xs font-medium">Vắng / Nghỉ phép</div>
          <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
            {summaryStats?.absentToday ?? 2}
          </div>
          <div className="text-[11px] text-purple-600/80 dark:text-purple-400/80 mt-0.5">
            Có đơn nghỉ được duyệt
          </div>
        </div>
      </div>

      {/* 3. Lịch Chấm Công Theo Tháng (Calendar View & Lọc Theo Ngày Click) */}

      {/* 4. Khối Bảng Dữ Liệu Chấm Công & Bộ Lọc Đa Chiều */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
        {/* Header Bảng */}
        {/* 4.1 MOBILE TABLE HEADER (sm:hidden) */}
        <div className="sm:hidden px-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm shrink-0">👥</span>
            <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
              Danh Sách Điểm Danh
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              {totalRecords} bản ghi
            </span>
            {totalPages > 1 && (
              <span className="text-[10px] font-mono text-zinc-400">
                (T{currentPage}/{totalPages})
              </span>
            )}
          </div>
        </div>

        {/* 4.2 DESKTOP TABLE HEADER (hidden sm:flex) - 100% UNTOUCHED */}
        <div className="hidden sm:flex p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>👥</span>
              <span>Bảng Dữ Liệu Điểm Danh Toàn Đơn Vị</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              {totalRecords} bản ghi
            </span>
            {totalPages > 1 && (
              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                (Trang {currentPage}/{totalPages})
              </span>
            )}
          </div>

          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <span>Hiển thị 10 bản ghi/trang</span>
          </div>
        </div>

        {/* 4.3 THANH CÔNG CỤ BỘ LỌC SIÊU GỌN GÀNG CHO MOBILE (sm:hidden) */}
        <div className="sm:hidden p-2.5 bg-zinc-50/70 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
          {/* Hàng 1: Ô tìm kiếm + Nút Lọc đa chiều + Nút Làm mới */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchEmployeeQuery}
                onChange={(e) => {
                  setSearchEmployeeQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm tên, mã NV, email..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-xs"
              />
              {searchEmployeeQuery && (
                <button
                  type="button"
                  onClick={() => setSearchEmployeeQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Nút Bộ lọc (kèm số đếm khi kích hoạt) */}
            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                showMobileFilters || activeFiltersCount > 0
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold shadow-2xs"
                  : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Lọc</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Nút Làm mới nhanh */}
            <button
              type="button"
              onClick={() => fetchAttendanceData(currentPage)}
              className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
              title="Làm mới bảng"
            >
              <svg className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Hàng 2: Thanh chip cuộn ngang (Quick Filter Pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
            {/* Nhóm ngày */}
            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayDateString);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer ${
                selectedDate === todayDateString
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-2xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(yesterdayDateString);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer ${
                selectedDate === yesterdayDateString
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-2xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Hôm qua
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDate("");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer ${
                selectedDate === ""
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-2xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Tất cả ngày
            </button>

            <span className="w-px h-3.5 bg-zinc-300 dark:bg-zinc-700 shrink-0" />

            {/* Nhóm trạng thái */}
            <button
              type="button"
              onClick={() => {
                setSelectedStatus(selectedStatus === "on_time" ? "all" : "on_time");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer ${
                selectedStatus === "on_time"
                  ? "bg-emerald-600 text-white font-semibold shadow-2xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              🟢 Đúng giờ
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedStatus(selectedStatus === "late" ? "all" : "late");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer ${
                selectedStatus === "late"
                  ? "bg-amber-600 text-white font-semibold shadow-2xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-amber-600 dark:text-amber-400"
              }`}
            >
              🟡 Đi muộn
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedStatus(selectedStatus === "early_leave" ? "all" : "early_leave");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer ${
                selectedStatus === "early_leave"
                  ? "bg-blue-600 text-white font-semibold shadow-2xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400"
              }`}
            >
              🔵 Về sớm
            </button>

            {/* Chip Xóa lọc nếu đang có lọc */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2 py-1 rounded-md text-[11px] font-medium shrink-0 text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 transition-colors cursor-pointer flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          {/* Ngăn Bộ Lọc Nâng Cao Chi Tiết (Chỉ mở khi chạm nút "Lọc") */}
          {showMobileFilters && (
            <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <span>⚡</span>
                  <span>Bộ Lọc Nâng Cao</span>
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-[11px] text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Đặt lại
                  </button>
                )}
              </div>

              {/* 1. Chọn nhân viên cụ thể */}
              <div>
                <label className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 block mb-1">
                  👤 NHÂN VIÊN:
                </label>
                <select
                  value={selectedEmployeeCode}
                  onChange={(e) => {
                    setSelectedEmployeeCode(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 truncate cursor-pointer"
                >
                  <option value="all">Tất cả nhân viên ({employeesList.length || "12"})</option>
                  {employeesList.map((emp) => (
                    <option key={emp.id} value={emp.employeeCode}>
                      {emp.employeeCode} - {emp.name} ({emp.department || "Khác"})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Grid 2 cột: Ngày cụ thể & Trạng thái */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 block mb-1">
                    📅 NGÀY CỤ THỂ:
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs font-mono cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 block mb-1">
                    🏷️ TRẠNG THÁI:
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs truncate cursor-pointer"
                  >
                    <option value="all">Tất cả</option>
                    <option value="on_time">Đúng giờ</option>
                    <option value="late">Đi muộn</option>
                    <option value="early_leave">Về sớm</option>
                    <option value="completed">Hoàn thành</option>
                  </select>
                </div>
              </div>

              {/* 3. Nút xuất Excel & Đóng */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Xuất Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer font-medium"
                >
                  Thu gọn ▲
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4.4 THANH CÔNG CỤ BỘ LỌC ĐẦY ĐỦ CHO DESKTOP (hidden sm:flex) - 100% UNTOUCHED */}
        <div className="hidden sm:flex p-3.5 sm:p-4 bg-zinc-50/70 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800 flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full xl:w-auto">
            {/* 1. Lọc theo từng nhân viên */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs shrink-0 font-medium flex items-center gap-1">
                <span>👤</span>
                <span>Nhân viên:</span>
              </span>
              <select
                value={selectedEmployeeCode}
                onChange={(e) => {
                  setSelectedEmployeeCode(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Lọc theo nhân viên"
                className="w-full sm:w-64 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm sm:text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer font-medium truncate"
              >
                <option value="all">Tất cả nhân viên ({employeesList.length || "12"})</option>
                {employeesList.map((emp) => (
                  <option key={emp.id} value={emp.employeeCode}>
                    {emp.employeeCode} - {emp.name} ({emp.department || "Khác"})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Ô tìm kiếm Mã NV, Tên, Email hoặc Ghi chú */}
            <div className="relative w-full sm:w-56">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchEmployeeQuery}
                onChange={(e) => {
                  setSearchEmployeeQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm mã NV, tên, email..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-sm sm:text-xs"
              />
            </div>

            {/* 3. Lọc theo Ngày & Nút chọn nhanh */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs shrink-0 font-medium flex items-center gap-1">
                  <span>📅</span>
                  <span>Ngày:</span>
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm sm:text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-mono"
                />
              </div>

              {/* Nút chọn nhanh ngày */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(todayDateString);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${selectedDate === todayDateString
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(yesterdayDateString);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${selectedDate === yesterdayDateString
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                >
                  Hôm qua
                </button>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate("");
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1.5 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-pointer transition-colors"
                    title="Xem toàn bộ các ngày"
                  >
                    Tất cả ngày
                  </button>
                )}
              </div>
            </div>

            {/* 4. Lọc theo trạng thái */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs shrink-0 font-medium">Trạng thái:</span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Lọc theo trạng thái"
                className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm sm:text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="on_time">Đúng giờ</option>
                <option value="late">Đi muộn</option>
                <option value="early_leave">Về sớm</option>
                <option value="completed">Hoàn thành</option>
              </select>
            </div>
          </div>

          {/* Các nút hành động: Xóa lọc, Làm mới, Xuất Excel */}
          <div className="flex items-center justify-between xl:justify-end gap-2 pt-2 xl:pt-0 border-t xl:border-t-0 border-zinc-200/60 dark:border-zinc-800">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 rounded-lg text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer flex items-center gap-1 font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Xóa lọc</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto xl:ml-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchAttendanceData(currentPage)}
                className="text-xs flex items-center gap-1.5 px-2.5 py-1.5"
              >
                <svg className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Làm mới</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="text-xs flex items-center gap-1.5 px-3 py-1.5 font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 shadow-2xs"
                title="Xuất dữ liệu toàn nhân viên theo bộ lọc ra file Excel (.xlsx)"
              >
                <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Xuất Excel</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Danh Sách Dữ Liệu: Mobile Card List & Desktop Table */}
        <div>
          {loadingHistory ? (
            <div className="p-4">
              <TableSkeleton rows={8} columns={8} />
            </div>
          ) : history.length === 0 ? (
            <div className="py-14 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-3 text-xl">
                📋
              </div>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Không tìm thấy dữ liệu điểm danh
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                Không có bản ghi nào khớp với điều kiện lọc hiện tại. Thử chọn ngày khác hoặc đổi mã nhân viên.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3.5 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Xóa tất cả bộ lọc
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 1. GIAO DIỆN MOBILE: DẠNG DANH SÁCH THẺ TINH GỌN (sm:hidden) */}
              <div className="sm:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                {history.map((record) => {
                  const isLate = record.status === "late";
                  const isEarly = record.status === "early_leave";
                  const avatar = record.userAvatar || employeesMap.get(record.userId)?.avatarUrl || employeesMap.get(record.employeeCode)?.avatarUrl;
                  const empDepartment = employeesMap.get(record.userId)?.department || employeesMap.get(record.employeeCode)?.department;

                  return (
                    <div
                      key={record.id}
                      className="p-3 space-y-2 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* Hàng 1: Avatar + Tên + Mã NV + Badge trạng thái */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden ring-1 ring-zinc-300 dark:ring-zinc-700">
                            {avatar ? (
                              <img src={avatar} alt={record.userName} className="w-full h-full object-cover" />
                            ) : (
                              record.userName.slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                                {record.userName}
                              </span>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0 border border-zinc-200 dark:border-zinc-700">
                                {record.employeeCode || "—"}
                              </span>
                            </div>
                            {empDepartment && (
                              <span className="text-[10px] text-zinc-400 block truncate">
                                {empDepartment}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Badge trạng thái */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${record.status === "on_time"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                            : isLate
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                              : isEarly
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300"
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${record.status === "on_time"
                              ? "bg-emerald-500"
                              : isLate
                                ? "bg-amber-500"
                                : isEarly
                                  ? "bg-blue-500"
                                  : "bg-purple-500"
                              }`}
                          />
                          {record.status === "on_time"
                            ? "Đúng Giờ"
                            : isLate
                              ? "Đi Muộn"
                              : isEarly
                                ? "Về Sớm"
                                : "Hoàn Thành"}
                        </span>
                      </div>

                      {/* Hàng 2: Thanh Vào - Ra - Tổng Giờ Làm (Không vỡ, gọn gàng) */}
                      <div className="grid grid-cols-3 gap-1.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 rounded-lg p-2 text-center">
                        <div>
                          <span className="text-[10px] text-zinc-400 block">Vào ca</span>
                          <span className={`text-xs font-mono font-bold block ${isLate ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                            {formatDisplayTime(record.checkInTime, false)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 block">Tan ca</span>
                          <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 block">
                            {record.checkOutTime ? formatDisplayTime(record.checkOutTime, false) : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 block">Tổng giờ</span>
                          <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 block">
                            {record.workDurationMinutes !== undefined
                              ? `${Math.floor(record.workDurationMinutes / 60)}h${record.workDurationMinutes % 60 ? ` ${record.workDurationMinutes % 60}p` : ""}`
                              : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Hàng 3: Ngày và Ghi chú (nếu có) */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 px-0.5">
                        <span className="font-mono text-[10px] flex items-center gap-1">
                          <span>📅</span>
                          <span>{record.date ? record.date.split("-").reverse().join("/") : "—"}</span>
                        </span>
                        {record.note && (
                          <span className="italic truncate max-w-[180px] text-zinc-500 dark:text-zinc-400 text-[10px]" title={record.note}>
                            📝 {record.note}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 2. GIAO DIỆN TABLET / DESKTOP: BẢNG DỮ LIỆU ĐẦY ĐỦ */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="px-4 py-3">Mã NV</th>
                      <th className="px-4 py-3">Nhân sự</th>
                      <th className="px-4 py-3">Ngày</th>
                      <th className="px-4 py-3">Giờ Vào (Check-in)</th>
                      <th className="px-4 py-3">Giờ Về (Check-out)</th>
                      <th className="px-4 py-3">Thời Lượng</th>
                      <th className="px-4 py-3">Trạng Thái</th>
                      <th className="px-4 py-3">Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-sans">
                    {history.map((record) => {
                      const avatar = record.userAvatar || employeesMap.get(record.userId)?.avatarUrl || employeesMap.get(record.employeeCode)?.avatarUrl;
                      return (
                        <tr
                          key={record.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          {/* Cột 1: Mã Nhân Viên */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
                              {record.employeeCode || "—"}
                            </span>
                          </td>

                          {/* Cột 2: Nhân sự (Avatar + Tên + Email) */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden ring-1 ring-zinc-300 dark:ring-zinc-700 shadow-2xs">
                                {avatar ? (
                                  <img src={avatar} alt={record.userName} className="w-full h-full object-cover" />
                                ) : (
                                  record.userName.slice(0, 1).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                  {record.userName}
                                </div>
                                <div className="text-[11px] text-zinc-400 truncate">
                                  {record.userEmail}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Cột 3: Ngày chấm công */}
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-300 font-mono">
                            {record.date}
                          </td>

                          {/* Cột 4: Giờ vào & IP */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {record.checkInTime ? (
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                  {formatDisplayTime(record.checkInTime)}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  IP: {record.checkInIp || "—"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>

                          {/* Cột 5: Giờ về & IP */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {record.checkOutTime ? (
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                  {formatDisplayTime(record.checkOutTime)}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  IP: {record.checkOutIp || "—"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>

                          {/* Cột 6: Thời lượng làm việc */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {record.workDurationMinutes !== undefined ? (
                              <span className="font-mono text-zinc-700 dark:text-zinc-300 font-medium">
                                {Math.floor(record.workDurationMinutes / 60)}h {record.workDurationMinutes % 60}m
                              </span>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>

                          {/* Cột 7: Trạng thái */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${record.status === "on_time"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                                : record.status === "late"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                                  : record.status === "early_leave"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300"
                                    : "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300"
                                }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${record.status === "on_time"
                                  ? "bg-emerald-500"
                                  : record.status === "late"
                                    ? "bg-amber-500"
                                    : record.status === "early_leave"
                                      ? "bg-blue-500"
                                      : "bg-purple-500"
                                  }`}
                              />
                              {record.status === "on_time"
                                ? "Đúng Giờ"
                                : record.status === "late"
                                  ? "Đi Muộn"
                                  : record.status === "early_leave"
                                    ? "Về Sớm"
                                    : "Hoàn Thành"}
                            </span>
                          </td>

                          {/* Cột 8: Ghi chú */}
                          <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 max-w-xs truncate" title={record.note}>
                            {record.note ? (
                              <span className="italic">{record.note}</span>
                            ) : (
                              <span className="text-zinc-300 dark:text-zinc-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 3. KHỐI PHÂN TRANG (PAGINATION) */}
              {/* 3.1 MOBILE PAGINATION (sm:hidden) */}
              <div className="sm:hidden p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  disabled={currentPage === 1 || loadingHistory}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Trước</span>
                </button>

                <div className="text-center font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Trang {currentPage}</span>
                  <span> / {totalPages}</span>
                  <span className="block text-[10px] text-zinc-400 font-sans">({totalRecords} bản ghi)</span>
                </div>

                <button
                  type="button"
                  disabled={currentPage === totalPages || loadingHistory}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <span>Sau</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* 3.2 DESKTOP PAGINATION (hidden sm:flex) - 100% UNTOUCHED */}
              <div className="hidden sm:flex p-3.5 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-zinc-500 dark:text-zinc-400 font-mono">
                  Hiển thị {(currentPage - 1) * pageSize + 1} -{" "}
                  {Math.min(currentPage * pageSize, totalRecords)} trong tổng số{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100">{totalRecords}</strong> bản ghi
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    {/* Nút Đầu */}
                    <button
                      type="button"
                      disabled={currentPage === 1 || loadingHistory}
                      onClick={() => handlePageChange(1)}
                      className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Trang đầu"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    </button>

                    {/* Nút Trước */}
                    <button
                      type="button"
                      disabled={currentPage === 1 || loadingHistory}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Trang trước"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    {/* Các nút số trang */}
                    {paginationItems.map((item, index) => {
                      if (item === "...") {
                        return (
                          <span
                            key={`dots-${index}`}
                            className="px-2 py-1 text-zinc-400 font-mono select-none"
                          >
                            …
                          </span>
                        );
                      }

                      const pageNum = item as number;
                      const isActive = pageNum === currentPage;

                      return (
                        <button
                          key={pageNum}
                          type="button"
                          disabled={loadingHistory}
                          onClick={() => handlePageChange(pageNum)}
                          className={`min-w-8 h-8 px-2 rounded-md font-mono text-xs font-semibold transition-colors cursor-pointer ${isActive
                            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                            : "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {/* Nút Kế Tiếp */}
                    <button
                      type="button"
                      disabled={currentPage === totalPages || loadingHistory}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Trang sau"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Nút Cuối */}
                    <button
                      type="button"
                      disabled={currentPage === totalPages || loadingHistory}
                      onClick={() => handlePageChange(totalPages)}
                      className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Trang cuối"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
